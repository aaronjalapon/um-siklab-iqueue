"""Unit tests for the seat scoring matrix — pure function, no DB required."""

from __future__ import annotations

import uuid

import pytest

from app.models.seat import Seat, SeatStatus, SeatType
from app.services.seat_assignment.scorer import (
    SCORE_WEIGHTS,
    PassengerContext,
    score_seat,
)
from app.models.seat import SeatReservation


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_seat(
    label: str = "3B",
    row: int = 3,
    col: int = 2,
    seat_type: SeatType = SeatType.AISLE,
    side: str = "left",
    is_near_exit: bool = False,
    is_accessibility: bool = False,
    status: SeatStatus = SeatStatus.AVAILABLE,
) -> Seat:
    """Create a minimal Seat for testing."""
    return Seat(
        id=uuid.uuid4(),
        bus_id=uuid.uuid4(),
        seat_label=label,
        row_number=row,
        col_number=col,
        seat_type=seat_type,
        is_near_exit=is_near_exit,
        is_accessibility=is_accessibility,
        side=side,
        status=status,
    )


def make_passenger(
    booking_id: str | None = None,
    name: str = "Test Passenger",
    needs_accessibility: bool = False,
    preferred_seat_type: str | None = None,
    preferred_side: str | None = None,
    language: str | None = None,
    travel_habit: str | None = None,
    lifestyle_interest: str | None = None,
    group_id: str | None = None,
) -> PassengerContext:
    """Create a PassengerContext for testing."""
    return PassengerContext(
        booking_id=booking_id or str(uuid.uuid4()),
        passenger_name=name,
        group_id=group_id,
        language_preference=language,
        travel_habit=travel_habit,
        lifestyle_interest=lifestyle_interest,
        needs_accessibility=needs_accessibility,
        preferred_seat_type=preferred_seat_type,
        preferred_side=preferred_side,
    )


# ---------------------------------------------------------------------------
# Hard block tests
# ---------------------------------------------------------------------------

class TestHardBlocks:
    """Test that occupied, blocked, and reserved seats are rejected."""

    def test_occupied_seat_returns_penalty(self):
        seat = make_seat(status=SeatStatus.OCCUPIED)
        pax = make_passenger()
        score = score_seat(seat, pax, [], 14, 4)
        assert score == SCORE_WEIGHTS["occupied_penalty"]

    def test_blocked_seat_returns_penalty(self):
        seat = make_seat(status=SeatStatus.BLOCKED)
        pax = make_passenger()
        score = score_seat(seat, pax, [], 14, 4)
        assert score == SCORE_WEIGHTS["blocked_penalty"]

    def test_reserved_seat_returns_penalty(self):
        seat = make_seat(status=SeatStatus.RESERVED)
        pax = make_passenger()
        score = score_seat(seat, pax, [], 14, 4)
        assert score == SCORE_WEIGHTS["occupied_penalty"]


# ---------------------------------------------------------------------------
# Accessibility tests
# ---------------------------------------------------------------------------

class TestAccessibility:
    """Accessibility rules must always take precedence."""

    def test_accessibility_pax_gets_bonus_on_exit_seat(self):
        seat = make_seat(label="1A", row=1, col=1, is_near_exit=True, is_accessibility=True)
        pax = make_passenger(needs_accessibility=True)
        score = score_seat(seat, pax, [], 14, 4)
        assert score == SCORE_WEIGHTS["accessibility_exit"]

    def test_accessibility_pax_hard_blocked_on_non_exit_seat(self):
        seat = make_seat(label="7B", row=7, col=2, is_near_exit=False, is_accessibility=False)
        pax = make_passenger(needs_accessibility=True)
        score = score_seat(seat, pax, [], 14, 4)
        assert score == SCORE_WEIGHTS["accessibility_penalty"]

    def test_non_accessibility_pax_on_exit_seat_no_penalty(self):
        seat = make_seat(label="1A", row=1, col=1, is_near_exit=True, is_accessibility=True)
        pax = make_passenger(needs_accessibility=False)
        score = score_seat(seat, pax, [], 14, 4)
        # Should be 0 (no bonus, no penalty, empty bus)
        assert score >= 0


# ---------------------------------------------------------------------------
# Seat preference tests
# ---------------------------------------------------------------------------

class TestSeatPreferences:
    """Seat type and side preference scoring."""

    def test_window_preference_match(self):
        seat = make_seat(label="1A", row=1, col=1, seat_type=SeatType.WINDOW)
        pax = make_passenger(preferred_seat_type="window")
        score = score_seat(seat, pax, [], 14, 4)
        assert score == SCORE_WEIGHTS["preference_seat_type"]

    def test_aisle_preference_match(self):
        seat = make_seat(label="1B", row=1, col=2, seat_type=SeatType.AISLE)
        pax = make_passenger(preferred_seat_type="aisle")
        score = score_seat(seat, pax, [], 14, 4)
        assert score == SCORE_WEIGHTS["preference_seat_type"]

    def test_preference_mismatch_no_bonus(self):
        seat = make_seat(label="1A", row=1, col=1, seat_type=SeatType.WINDOW)
        pax = make_passenger(preferred_seat_type="aisle")
        score = score_seat(seat, pax, [], 14, 4)
        assert score == 0.0

    def test_side_preference_match(self):
        seat = make_seat(label="3A", row=3, col=1, side="left")
        pax = make_passenger(preferred_side="left")
        score = score_seat(seat, pax, [], 14, 4)
        assert score == SCORE_WEIGHTS["preference_side"]


# ---------------------------------------------------------------------------
# Affinity tests
# ---------------------------------------------------------------------------

class TestAffinity:
    """Neighbor affinity scoring."""

    def test_language_match_with_neighbor(self):
        seat = make_seat(label="2B", row=2, col=2)
        pax = make_passenger(language="fil")
        # Create a neighbor in 2A who speaks Filipino
        neighbor_seat = make_seat(label="2A", row=2, col=1, status=SeatStatus.OCCUPIED)
        neighbor_res = SeatReservation(
            id=uuid.uuid4(),
            seat_id=neighbor_seat.id,
            booking_id=uuid.uuid4(),
            passenger_name="Neighbor",
            language_preference="fil",
        )
        neighbor_res.seat = neighbor_seat

        score = score_seat(seat, pax, [neighbor_res], 14, 4)
        assert score == SCORE_WEIGHTS["affinity_language"]

    def test_travel_habit_match_with_neighbor(self):
        seat = make_seat(label="2B", row=2, col=2)
        pax = make_passenger(travel_habit="business")
        neighbor_seat = make_seat(label="2A", row=2, col=1, status=SeatStatus.OCCUPIED)
        neighbor_res = SeatReservation(
            id=uuid.uuid4(),
            seat_id=neighbor_seat.id,
            booking_id=uuid.uuid4(),
            passenger_name="Neighbor",
            travel_habit="business",
        )
        neighbor_res.seat = neighbor_seat

        score = score_seat(seat, pax, [neighbor_res], 14, 4)
        assert score == SCORE_WEIGHTS["affinity_travel_habit"]

    def test_lifestyle_overlap_with_neighbor(self):
        seat = make_seat(label="2B", row=2, col=2)
        pax = make_passenger(lifestyle_interest="music,travel,tech")
        neighbor_seat = make_seat(label="2A", row=2, col=1, status=SeatStatus.OCCUPIED)
        neighbor_res = SeatReservation(
            id=uuid.uuid4(),
            seat_id=neighbor_seat.id,
            booking_id=uuid.uuid4(),
            passenger_name="Neighbor",
            lifestyle_interest="music,reading,tech",
        )
        neighbor_res.seat = neighbor_seat

        score = score_seat(seat, pax, [neighbor_res], 14, 4)
        # 2 overlaps (music, tech) * 10 = 20
        assert score == 2 * SCORE_WEIGHTS["affinity_lifestyle"]

    def test_no_neighbor_returns_zero_affinity(self):
        seat = make_seat(label="7B", row=7, col=2)
        pax = make_passenger(language="fil", travel_habit="business")
        score = score_seat(seat, pax, [], 14, 4)
        assert score == 0.0


# ---------------------------------------------------------------------------
# Load balancing tests
# ---------------------------------------------------------------------------

class TestLoadBalancing:
    """Load distribution across the bus."""

    def test_prefers_back_when_front_busy(self):
        seat_back = make_seat(label="12B", row=12, col=2)
        seat_front = make_seat(label="2B", row=2, col=2)
        pax = make_passenger()

        # Create many front-row reservations
        front_reservations = []
        for row in range(1, 6):
            for col in range(1, 5):
                s = make_seat(
                    label=f"{row}{chr(64+col)}", row=row, col=col,
                    status=SeatStatus.OCCUPIED,
                )
                r = SeatReservation(
                    id=uuid.uuid4(), seat_id=s.id, booking_id=uuid.uuid4(),
                    passenger_name="Pax",
                )
                r.seat = s
                front_reservations.append(r)

        score_back = score_seat(seat_back, pax, front_reservations, 14, 4)
        score_front = score_seat(seat_front, pax, front_reservations, 14, 4)

        assert score_back == SCORE_WEIGHTS["load_balance"]  # back gets bonus
        assert score_front == 0.0  # front is busy, no bonus

    def test_no_bonus_when_balanced(self):
        seat = make_seat(label="7B", row=7, col=2)
        pax = make_passenger()

        # Equal distribution: 1 front, 1 back
        front_s = make_seat(label="1A", row=1, col=1, status=SeatStatus.OCCUPIED)
        back_s = make_seat(label="14A", row=14, col=1, status=SeatStatus.OCCUPIED)
        fr = SeatReservation(
            id=uuid.uuid4(), seat_id=front_s.id, booking_id=uuid.uuid4(),
            passenger_name="Front",
        )
        br = SeatReservation(
            id=uuid.uuid4(), seat_id=back_s.id, booking_id=uuid.uuid4(),
            passenger_name="Back",
        )
        fr.seat = front_s
        br.seat = back_s

        score = score_seat(seat, pax, [fr, br], 14, 4)
        assert score == 0.0


# ---------------------------------------------------------------------------
# Group proximity tests
# ---------------------------------------------------------------------------

class TestGroupProximity:
    """Group seating proximity scoring."""

    def test_adjacent_to_group_member_gets_bonus(self):
        seat = make_seat(label="5C", row=5, col=3)
        pax = make_passenger(group_id="group-abc")

        group_seat = make_seat(label="5B", row=5, col=2, status=SeatStatus.OCCUPIED)
        group_res = SeatReservation(
            id=uuid.uuid4(), seat_id=group_seat.id, booking_id=uuid.uuid4(),
            passenger_name="Group Member", group_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        )
        # Set group_id on the reservation
        group_res.group_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        group_res.seat = group_seat
        pax.group_id = "00000000-0000-0000-0000-000000000001"

        score = score_seat(seat, pax, [group_res], 14, 4)
        assert score == SCORE_WEIGHTS["group_adjacent"]

    def test_same_row_non_adjacent_group_gets_same_row_bonus(self):
        seat = make_seat(label="5D", row=5, col=4)
        pax = make_passenger(group_id="00000000-0000-0000-0000-000000000001")

        group_seat = make_seat(label="5A", row=5, col=1, status=SeatStatus.OCCUPIED)
        group_res = SeatReservation(
            id=uuid.uuid4(), seat_id=group_seat.id, booking_id=uuid.uuid4(),
            passenger_name="Group Member",
        )
        group_res.group_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        group_res.seat = group_seat

        score = score_seat(seat, pax, [group_res], 14, 4)
        assert score == SCORE_WEIGHTS["group_same_row"]


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------

class TestDeterminism:
    """The scorer must always return the same result for the same inputs."""

    def test_same_inputs_same_output(self):
        seat = make_seat(label="4C", row=4, col=3, seat_type=SeatType.AISLE, side="right")
        pax = make_passenger(
            language="en", travel_habit="leisure",
            lifestyle_interest="sports,music", preferred_seat_type="aisle",
        )
        neighbor_seat = make_seat(label="4B", row=4, col=2, status=SeatStatus.OCCUPIED)
        neighbor_res = SeatReservation(
            id=uuid.uuid4(), seat_id=neighbor_seat.id, booking_id=uuid.uuid4(),
            passenger_name="Neighbor", language_preference="en", travel_habit="leisure",
        )
        neighbor_res.seat = neighbor_seat

        scores = [
            score_seat(seat, pax, [neighbor_res], 14, 4)
            for _ in range(20)
        ]
        assert len(set(scores)) == 1, f"Expected all scores equal, got {scores}"
