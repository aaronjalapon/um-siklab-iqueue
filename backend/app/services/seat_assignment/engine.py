"""Core seat assignment engine — deterministic, rule-based allocator.

Given a bus, passenger context, and the current reservation state, the
SeatAllocator scores every available seat and assigns the highest-scoring one.

IMPORTANT — Group booking ordering:
  If a group of N passengers books together, the engine MUST be called
  N times **in sequence** (not concurrently) so each call sees the previous
  group member's seat before scoring. Concurrent calls for the same group
  will not see each other's assignments and group proximity scoring breaks.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.seat import Seat, SeatReservation, SeatStatus
from app.services.seat_assignment.bus_layout import get_seat_row
from app.services.seat_assignment.scorer import (
    PassengerContext,
    score_seat,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------

class SeatUnavailableError(Exception):
    """Raised when no available seat matches the constraints."""


class BusNotFoundError(Exception):
    """Raised when bus_id does not exist."""


# ---------------------------------------------------------------------------
# Internal result type
# ---------------------------------------------------------------------------

class _ScoredCandidate:
    """Internal container for a scored seat during allocation."""
    __slots__ = ("seat", "score")

    def __init__(self, seat: Seat, score: float):
        self.seat = seat
        self.score = score


# ---------------------------------------------------------------------------
# SeatAllocator
# ---------------------------------------------------------------------------

class SeatAllocator:
    """Rule-based seat assignment engine with affinity scoring.

    Assigns the best available seat for a passenger given constraints:
    accessibility needs, travel group, seatmate compatibility preferences,
    and load distribution across the bus.

    Usage::

        allocator = SeatAllocator(session)
        result = await allocator.assign(bus_id, passenger)
        seat_map = await allocator.get_seat_map(bus_id)
        await allocator.release(booking_id)
    """

    # Default layout dimensions (used when bus has no layout configured)
    DEFAULT_ROWS = 14
    DEFAULT_COLS = 4

    def __init__(self, session: AsyncSession):
        """Initialize with an async database session.

        Args:
            session: An active AsyncSession (typically from a FastAPI dependency).
        """
        self.session = session

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def assign(
        self,
        bus_id: str | UUID,
        passenger: PassengerContext,
    ) -> dict:
        """Assign the best available seat to a passenger.

        Algorithm:
          1. Fetch all Seat rows for the bus where status = AVAILABLE.
          2. Fetch all existing SeatReservation rows for the bus (scoring context).
          3. For each available seat, call scorer.score_seat().
          4. Select the seat with the highest score.
             Tiebreak: lower row_number, then lower col_number.
          5. Within a DB transaction:
             a. Set seat.status = OCCUPIED
             b. Set seat.affinity_score = winning score
             c. Create SeatReservation row
          6. Return assignment result dict.

        Args:
            bus_id: UUID of the target bus.
            passenger: Passenger context with preferences and constraints.

        Returns:
            Dict with seat_id, seat_label, seat_type, side, row_number,
            affinity_score, and boarding_window.

        Raises:
            BusNotFoundError: If bus_id does not exist.
            SeatUnavailableError: If no available seats remain.
        """
        bus_id = UUID(str(bus_id))

        # Validate bus exists
        bus = await self.session.get(Bus, bus_id)
        if bus is None:
            raise BusNotFoundError(f"Bus {bus_id} not found")

        # Determine layout dimensions
        total_rows = self.DEFAULT_ROWS
        seats_per_row = self.DEFAULT_COLS
        if bus.layout:
            total_rows = bus.layout.total_rows
            seats_per_row = bus.layout.seats_per_row

        # Fetch all seats for this bus with their reservations
        result = await self.session.execute(
            select(Seat)
            .where(Seat.bus_id == bus_id)
            .options(selectinload(Seat.reservation))
        )
        all_seats = result.scalars().all()

        # Fetch all existing reservations for scoring context
        reservations_result = await self.session.execute(
            select(SeatReservation)
            .join(Seat, SeatReservation.seat_id == Seat.id)
            .where(Seat.bus_id == bus_id)
            .options(selectinload(SeatReservation.seat))
        )
        existing_reservations = list(reservations_result.scalars().all())

        # Score each available seat
        candidates: list[_ScoredCandidate] = []
        for seat in all_seats:
            if seat.status != SeatStatus.AVAILABLE:
                continue
            s = score_seat(
                candidate_seat=seat,
                passenger=passenger,
                existing_reservations=existing_reservations,
                total_rows=total_rows,
                seats_per_row=seats_per_row,
            )
            if s > -100:  # Skip hard-blocked seats
                candidates.append(_ScoredCandidate(seat, s))

        if not candidates:
            raise SeatUnavailableError(
                f"No available seats on bus {bus_id}"
            )

        # Select winner: highest score, tiebreak by row then col
        candidates.sort(
            key=lambda c: (-c.score, c.seat.row_number, c.seat.col_number)
        )
        winner = candidates[0]

        # Calculate boarding window (15-min slot, front rows first)
        row = winner.seat.row_number
        now = datetime.now(timezone.utc)
        window_start = now + timedelta(minutes=row * 3)
        window_end = window_start + timedelta(minutes=15)

        # Create reservation within a nested transaction
        async with self.session.begin_nested():
            # Update seat
            winner.seat.status = SeatStatus.OCCUPIED
            winner.seat.affinity_score = winner.score

            # Build boarding window string
            bw_str = (
                f"{window_start.strftime('%H:%M')}–"
                f"{window_end.strftime('%H:%M')}"
            )

            # Create reservation
            reservation = SeatReservation(
                seat_id=winner.seat.id,
                booking_id=UUID(passenger.booking_id),
                passenger_name=passenger.passenger_name,
                group_id=(
                    UUID(passenger.group_id) if passenger.group_id else None
                ),
                language_preference=passenger.language_preference,
                travel_habit=passenger.travel_habit,
                lifestyle_interest=passenger.lifestyle_interest,
                needs_accessibility=passenger.needs_accessibility,
                preferred_seat_type=passenger.preferred_seat_type,
                preferred_side=passenger.preferred_side,
                computed_affinity_score=winner.score,
                boarding_window=bw_str,
            )
            self.session.add(reservation)

        return {
            "seat_id": str(winner.seat.id),
            "seat_label": winner.seat.seat_label,
            "seat_type": winner.seat.seat_type.value,
            "side": winner.seat.side,
            "row_number": winner.seat.row_number,
            "affinity_score": winner.score,
            "boarding_window": bw_str,
        }

    async def release(self, booking_id: str | UUID) -> None:
        """Release a seat when a booking is cancelled.

        Sets the seat status back to AVAILABLE and deletes the
        SeatReservation row. Runs within a nested transaction.

        Args:
            booking_id: UUID of the booking to release.

        Raises:
            ValueError: If no reservation exists for the given booking_id.
        """
        booking_id = UUID(str(booking_id))

        result = await self.session.execute(
            select(SeatReservation)
            .where(SeatReservation.booking_id == booking_id)
            .options(selectinload(SeatReservation.seat))
        )
        reservation = result.scalars().first()

        if reservation is None:
            raise ValueError(
                f"No seat reservation found for booking {booking_id}"
            )

        async with self.session.begin_nested():
            if reservation.seat:
                reservation.seat.status = SeatStatus.AVAILABLE
                reservation.seat.affinity_score = None
            await self.session.delete(reservation)

    async def get_seat_map(self, bus_id: str | UUID) -> list[dict]:
        """Return all seats for a bus with current status and reservation info.

        Used by both the passenger grid and the operator list view.

        Args:
            bus_id: UUID of the bus.

        Returns:
            List of seat map entry dicts sorted by row_number, col_number.
        """
        bus_id = UUID(str(bus_id))

        result = await self.session.execute(
            select(Seat)
            .where(Seat.bus_id == bus_id)
            .options(selectinload(Seat.reservation))
            .order_by(Seat.row_number, Seat.col_number)
        )
        seats = result.scalars().all()

        entries: list[dict] = []
        for seat in seats:
            entry: dict = {
                "seat_id": str(seat.id),
                "seat_label": seat.seat_label,
                "row_number": seat.row_number,
                "col_number": seat.col_number,
                "seat_type": seat.seat_type.value,
                "side": seat.side,
                "is_near_exit": seat.is_near_exit,
                "is_accessibility": seat.is_accessibility,
                "status": seat.status.value,
                "passenger_name": None,
                "group_id": None,
                "affinity_score": seat.affinity_score,
                "boarding_window": None,
            }
            if seat.reservation:
                entry["passenger_name"] = seat.reservation.passenger_name
                entry["group_id"] = (
                    str(seat.reservation.group_id)
                    if seat.reservation.group_id
                    else None
                )
                entry["language_preference"] = (
                    seat.reservation.language_preference
                )
                entry["travel_habit"] = seat.reservation.travel_habit
                entry["lifestyle_interest"] = seat.reservation.lifestyle_interest
                entry["needs_accessibility"] = (
                    seat.reservation.needs_accessibility
                )
                entry["preferred_seat_type"] = (
                    seat.reservation.preferred_seat_type
                )
                entry["boarding_window"] = seat.reservation.boarding_window or None
            entries.append(entry)

        return entries

    async def swap_seats(
        self,
        booking_id_a: str | UUID,
        booking_id_b: str | UUID,
    ) -> dict:
        """Swap seats between two bookings.

        Both bookings must exist and be on the same bus.

        Args:
            booking_id_a: First booking UUID.
            booking_id_b: Second booking UUID.

        Returns:
            Dict with status and the swapped seat labels.

        Raises:
            ValueError: If bookings are on different buses or not found.
        """
        booking_id_a = UUID(str(booking_id_a))
        booking_id_b = UUID(str(booking_id_b))

        # Fetch both reservations
        res_a_result = await self.session.execute(
            select(SeatReservation)
            .where(SeatReservation.booking_id == booking_id_a)
            .options(selectinload(SeatReservation.seat))
        )
        res_a = res_a_result.scalars().first()

        res_b_result = await self.session.execute(
            select(SeatReservation)
            .where(SeatReservation.booking_id == booking_id_b)
            .options(selectinload(SeatReservation.seat))
        )
        res_b = res_b_result.scalars().first()

        if not res_a:
            raise ValueError(f"No reservation for booking {booking_id_a}")
        if not res_b:
            raise ValueError(f"No reservation for booking {booking_id_b}")

        seat_a = res_a.seat
        seat_b = res_b.seat
        if not seat_a or not seat_b:
            raise ValueError("Both reservations must have assigned seats")

        if seat_a.bus_id != seat_b.bus_id:
            raise ValueError("Cannot swap seats on different buses")

        async with self.session.begin_nested():
            # Swap the seat IDs on the reservations
            res_a.seat_id, res_b.seat_id = seat_b.id, seat_a.id

            # Swap the affinity scores on the seats
            (
                seat_a.affinity_score,
                seat_b.affinity_score,
            ) = (
                seat_b.affinity_score,
                seat_a.affinity_score,
            )

            # Swap boarding windows
            (
                res_a.boarding_window,
                res_b.boarding_window,
            ) = (
                res_b.boarding_window,
                res_a.boarding_window,
            )

        return {
            "status": "swapped",
            "seat_a": seat_b.seat_label,  # res_a now has seat_b
            "seat_b": seat_a.seat_label,  # res_b now has seat_a
        }
