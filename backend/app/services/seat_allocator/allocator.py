"""Smart seat allocator engine for bus boarding.

Assigns seats based on a 5-level priority system:
  1. Accessibility — rows 1-2 for passengers with mobility needs
  2. Group seating — same/adjacent rows for travel groups
  3. Affinity scoring — seatmate compatibility by language/habits/interests
  4. Load balancing — distribute passengers across bus sections
  5. Boarding window — 15-min slot based on seat row (front→back)

Usage:
    allocator = SeatAllocator(bus_capacity=50)
    assignment = await allocator.assign(
        db=db,
        bus_id=bus_id,
        passenger=passenger,
        travel_group=group_members,
        departure_date=departure_date,
    )
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.passenger import Passenger


@dataclass
class SeatAssignment:
    """Result of the seat allocation algorithm."""

    seat_number: str
    boarding_window_start: datetime
    boarding_window_end: datetime
    affinity_score: float = 0.0


@dataclass
class _SeatCandidate:
    """Internal candidate seat during allocation scoring."""

    seat_number: str
    score: float = 0.0
    row: int = 0
    column: str = ""


class SeatAllocator:
    """Rule-based seat assignment engine with affinity scoring.

    Assigns the best available seat for a passenger given constraints:
    accessibility needs, travel group, and seatmate compatibility preferences.
    """

    # Columns layout: 2 seats left (A,B), aisle, 2 seats right (C,D)
    COLUMNS = ["A", "B", "C", "D"]
    SEATS_PER_ROW = 4

    # Priority weights for scoring
    WEIGHT_LANGUAGE_MATCH = 2.0
    WEIGHT_HABIT_MATCH = 1.0
    WEIGHT_INTEREST_MATCH = 1.0
    WEIGHT_LOAD_BALANCE = 0.5

    def __init__(self, bus_capacity: int = 50):
        self.capacity = bus_capacity
        self._total_rows = (bus_capacity + self.SEATS_PER_ROW - 1) // self.SEATS_PER_ROW

    async def assign(
        self,
        db: AsyncSession,
        bus_id: UUID,
        passenger: Passenger,
        travel_group: list[UUID] | None = None,
        departure_date: datetime | None = None,
    ) -> SeatAssignment:
        """Assign the best available seat for a passenger.

        Args:
            db: Async database session
            bus_id: UUID of the bus
            passenger: The passenger to assign a seat to
            travel_group: List of passenger UUIDs traveling together
            departure_date: Departure datetime for boarding window calculation

        Returns:
            SeatAssignment with seat number, boarding window, and affinity score
        """
        # Get already-booked seats
        booked_seats = await self._get_booked_seats(db, bus_id)

        # Get all possible seats for this bus
        all_seats = self._all_seats()

        # Filter: exclude booked seats
        available = [s for s in all_seats if s not in booked_seats]

        if not available:
            raise ValueError(f"No available seats on bus {bus_id}")

        # --- Priority 1: Accessibility ---
        if getattr(passenger, "accessibility_needs", False):
            # Restrict to rows 1-2 (front rows for easy access)
            accessible = [s for s in available if self._row_number(s) <= 2]
            if accessible:
                available = accessible

        # --- Priority 2: Group seating ---
        if travel_group and len(travel_group) > 1:
            available = self._prioritize_group_seating(
                available, booked_seats, len(travel_group)
            )

        # --- Priority 3 & 4: Affinity scoring + Load balancing ---
        scored_seats = await self._score_seats(
            db=db,
            bus_id=bus_id,
            available=available,
            passenger=passenger,
            booked_seats=booked_seats,
        )

        # Select best seat
        best = max(scored_seats, key=lambda s: s.score)

        # --- Priority 5: Boarding window ---
        row = best.row
        # Front rows board first: departure + (row * 3) minutes
        dep = departure_date or datetime.now(timezone.utc)
        window_start = dep + timedelta(minutes=row * 3)
        window_end = window_start + timedelta(minutes=15)

        return SeatAssignment(
            seat_number=best.seat_number,
            boarding_window_start=window_start,
            boarding_window_end=window_end,
            affinity_score=round(best.score, 2),
        )

    # ------------------------------------------------------------------
    # Internal methods
    # ------------------------------------------------------------------

    async def _get_booked_seats(
        self, db: AsyncSession, bus_id: UUID
    ) -> set[str]:
        """Fetch the set of already-booked seat numbers for a bus."""
        result = await db.execute(
            select(Booking.seat_number).where(
                Booking.bus_id == bus_id,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
            )
        )
        return {row[0] for row in result.fetchall() if row[0]}

    def _all_seats(self) -> list[str]:
        """Generate all seat labels: '1A', '1B', '1C', '1D', '2A', ..."""
        seats = []
        for row in range(1, self._total_rows + 1):
            for col in self.COLUMNS:
                seat = f"{row}{col}"
                seat_num = (row - 1) * self.SEATS_PER_ROW + self.COLUMNS.index(col) + 1
                if seat_num <= self.capacity:
                    seats.append(seat)
        return seats

    @staticmethod
    def _row_number(seat: str) -> int:
        """Extract the row number from a seat label like '12A'."""
        return int(seat.rstrip("ABCDEFGH"))

    @staticmethod
    def _col_letter(seat: str) -> str:
        """Extract the column letter from a seat label like '12A'."""
        return seat[-1]

    def _prioritize_group_seating(
        self,
        available: list[str],
        booked_seats: set[str],
        group_size: int,
    ) -> list[str]:
        """Reorder available seats to prioritize rows that can fit the group.

        Groups should sit in the same row or adjacent rows.
        """
        # Score each available seat by how many adjacent seats are free in its row
        row_availability: dict[int, int] = {}
        for seat in available:
            row = self._row_number(seat)
            row_availability[row] = row_availability.get(row, 0) + 1

        # Score seats: higher if row has enough space for full group
        def group_score(seat: str) -> int:
            row = self._row_number(seat)
            free_in_row = row_availability.get(row, 0)
            return min(free_in_row, group_size) * 100 + free_in_row

        return sorted(available, key=group_score, reverse=True)

    async def _score_seats(
        self,
        db: AsyncSession,
        bus_id: UUID,
        available: list[str],
        passenger: Passenger,
        booked_seats: set[str],
    ) -> list[_SeatCandidate]:
        """Score all available seats by affinity and load distribution."""
        # Get passenger info for already-booked seats (seatmates)
        seatmate_map = await self._get_seatmates(db, bus_id, booked_seats)

        candidates = []
        for seat in available:
            row = self._row_number(seat)
            col = self._col_letter(seat)

            score = 0.0

            # --- Affinity scoring with adjacent seatmates ---
            # Find neighbors in the same row
            same_row_seats = [
                s for s in booked_seats
                if self._row_number(s) == row and s in seatmate_map
            ]
            for neighbor_seat in same_row_seats:
                neighbor = seatmate_map[neighbor_seat]
                score += self._affinity_score(passenger, neighbor)

            # --- Load balancing ---
            # Prefer seats in less-occupied sections
            # Section: front (1-33%), middle (34-66%), back (67-100%)
            section_size = max(1, self._total_rows // 3)
            section_start = ((row - 1) // section_size) * section_size + 1
            section_end = min(section_start + section_size - 1, self._total_rows)

            section_booked = sum(
                1 for s in booked_seats
                if section_start <= self._row_number(s) <= section_end
            )
            section_capacity = section_size * self.SEATS_PER_ROW
            section_load = section_booked / max(1, section_capacity)
            score += (1.0 - section_load) * self.WEIGHT_LOAD_BALANCE

            # --- Seat preference ---
            # Window seats (A, D) get a small bonus
            if col in ("A", "D"):
                score += 0.3
            # Aisle seats (B, C) — easier access, small bonus
            elif col in ("B", "C"):
                score += 0.1

            candidates.append(_SeatCandidate(
                seat_number=seat,
                score=score,
                row=row,
                column=col,
            ))

        return candidates

    def _affinity_score(self, p1: Passenger, p2: Passenger) -> float:
        """Compute seatmate compatibility score between two passengers.

        Returns a score from 0 to ~5 based on matching attributes.
        """
        score = 0.0

        # Language match
        if p1.language_pref and p2.language_pref and p1.language_pref == p2.language_pref:
            score += self.WEIGHT_LANGUAGE_MATCH

        # Travel habits match
        if (
            p1.travel_habits
            and p2.travel_habits
            and p1.travel_habits == p2.travel_habits
        ):
            score += self.WEIGHT_HABIT_MATCH

        # Lifestyle interests overlap
        if p1.lifestyle_interests and p2.lifestyle_interests:
            interests1 = set(i.strip() for i in p1.lifestyle_interests.split(","))
            interests2 = set(i.strip() for i in p2.lifestyle_interests.split(","))
            overlap = len(interests1 & interests2)
            score += min(overlap, 3) * self.WEIGHT_INTEREST_MATCH

        return score

    async def _get_seatmates(
        self,
        db: AsyncSession,
        bus_id: UUID,
        booked_seats: set[str],
    ) -> dict[str, Passenger]:
        """Map booked seat numbers to their Passenger objects for affinity scoring."""
        if not booked_seats:
            return {}

        result = await db.execute(
            select(Booking.seat_number, Passenger)
            .join(Passenger, Booking.passenger_id == Passenger.id)
            .where(
                Booking.bus_id == bus_id,
                Booking.seat_number.in_(booked_seats),
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
            )
        )

        return {
            row[0]: row[1] for row in result.fetchall()
        }
