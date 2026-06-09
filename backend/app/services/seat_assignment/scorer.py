"""Scoring matrix for the seat assignment engine.

Computes the Seat Affinity Score for a single candidate seat based on
passenger preferences, group proximity, neighbor affinity, and load balancing.

All weights are constants — the scorer is purely deterministic. Given the same
inputs, it always returns the same score.
"""

from __future__ import annotations

from app.models.seat import Seat, SeatReservation, SeatStatus, SeatType

# ---------------------------------------------------------------------------
# Scoring weights (constants)
# ---------------------------------------------------------------------------
SCORE_WEIGHTS: dict[str, float] = {
    "accessibility_exit": 80,     # passenger needs accessibility + seat near exit
    "accessibility_penalty": -200,  # accessibility passenger assigned non-exit seat (hard block)
    "group_adjacent": 60,         # seat directly adjacent to existing group member seat
    "group_same_row": 30,         # seat in the same row as a group member (not adjacent)
    "preference_seat_type": 20,   # seat type matches passenger preference (window/aisle)
    "preference_side": 15,        # seat side (left/right) matches passenger preference
    "affinity_language": 20,      # nearest neighbor shares language preference
    "affinity_travel_habit": 15,  # nearest neighbor shares travel habit
    "affinity_lifestyle": 10,     # nearest neighbor shares lifestyle interest
    "load_balance": 10,           # seat is in the less-occupied half of the bus
    "occupied_penalty": -999,     # seat is already occupied or reserved (hard block)
    "blocked_penalty": -999,      # seat is operator-blocked (hard block)
}

HARD_BLOCK_THRESHOLD = -100


# ---------------------------------------------------------------------------
# Passenger context dataclass (used before Pydantic schemas are loaded)
# ---------------------------------------------------------------------------

class PassengerContext:
    """Lightweight passenger preferences for scoring.

    Mirrors the Pydantic schema in app.schemas.seat but defined here
    to avoid circular imports with the service layer.
    """

    __slots__ = (
        "booking_id", "passenger_name", "group_id", "language_preference",
        "travel_habit", "lifestyle_interest", "needs_accessibility",
        "preferred_seat_type", "preferred_side",
    )

    def __init__(
        self,
        booking_id: str,
        passenger_name: str,
        group_id: str | None = None,
        language_preference: str | None = None,
        travel_habit: str | None = None,
        lifestyle_interest: str | None = None,
        needs_accessibility: bool = False,
        preferred_seat_type: str | None = None,
        preferred_side: str | None = None,
    ):
        self.booking_id = booking_id
        self.passenger_name = passenger_name
        self.group_id = group_id
        self.language_preference = language_preference
        self.travel_habit = travel_habit
        self.lifestyle_interest = lifestyle_interest
        self.needs_accessibility = needs_accessibility
        self.preferred_seat_type = preferred_seat_type
        self.preferred_side = preferred_side


# ---------------------------------------------------------------------------
# Core scoring function
# ---------------------------------------------------------------------------

def score_seat(
    candidate_seat: Seat,
    passenger: PassengerContext,
    existing_reservations: list[SeatReservation],
    total_rows: int,
    seats_per_row: int,
) -> float:
    """Compute the Seat Affinity Score for one candidate seat.

    Steps (in order):
      1. Hard blocks — occupied / blocked / accessibility penalty.
      2. Group proximity.
      3. Seat preference.
      4. Neighbor affinity.
      5. Load balancing.

    Args:
        candidate_seat: The seat being scored.
        passenger: Passenger preferences and constraints.
        existing_reservations: All current reservations for the bus.
        total_rows: Total rows in the bus layout.
        seats_per_row: Seats per row in the bus layout.

    Returns:
        Float score. Negative below HARD_BLOCK_THRESHOLD means disqualified.
    """
    score = 0.0

    # --- Step 1: Hard blocks ---
    if candidate_seat.status == SeatStatus.OCCUPIED:
        return SCORE_WEIGHTS["occupied_penalty"]
    if candidate_seat.status == SeatStatus.BLOCKED:
        return SCORE_WEIGHTS["blocked_penalty"]
    if candidate_seat.status == SeatStatus.RESERVED:
        return SCORE_WEIGHTS["occupied_penalty"]

    # Accessibility hard block: passenger needs accessibility but seat is not near exit
    if passenger.needs_accessibility:
        if candidate_seat.is_near_exit and candidate_seat.is_accessibility:
            score += SCORE_WEIGHTS["accessibility_exit"]
        else:
            score += SCORE_WEIGHTS["accessibility_penalty"]
            return score  # hard block — don't assign non-exit to accessibility pax

    # --- Step 2: Group proximity ---
    if passenger.group_id:
        score += _group_proximity_score(
            candidate_seat, passenger.group_id, existing_reservations
        )

    # --- Step 3: Seat preference ---
    score += _preference_score(candidate_seat, passenger)

    # --- Step 4: Neighbor affinity ---
    score += _neighbor_affinity_score(
        candidate_seat, passenger, existing_reservations
    )

    # --- Step 5: Load balancing ---
    score += _load_balance_score(
        candidate_seat, existing_reservations, total_rows
    )

    return round(score, 2)


# ---------------------------------------------------------------------------
# Scoring sub-functions (private)
# ---------------------------------------------------------------------------

def _group_proximity_score(
    candidate: Seat,
    group_id: str,
    reservations: list[SeatReservation],
) -> float:
    """Score based on proximity to existing group members."""
    group_seats = [
        r for r in reservations
        if r.group_id is not None and str(r.group_id) == str(group_id)
    ]
    if not group_seats:
        return 0.0

    best = 0.0
    for res in group_seats:
        if res.seat is None:
            continue
        group_seat = res.seat
        # Same row
        if group_seat.row_number == candidate.row_number:
            # Adjacent (same row, columns next to each other)
            if abs(group_seat.col_number - candidate.col_number) == 1:
                best = max(best, SCORE_WEIGHTS["group_adjacent"])
            else:
                best = max(best, SCORE_WEIGHTS["group_same_row"])
        # Adjacent row, same column (front/back)
        elif abs(group_seat.row_number - candidate.row_number) == 1 and group_seat.col_number == candidate.col_number:
            best = max(best, SCORE_WEIGHTS["group_adjacent"])

    return best


def _preference_score(
    candidate: Seat,
    passenger: PassengerContext,
) -> float:
    """Score based on seat type and side preferences."""
    s = 0.0

    if passenger.preferred_seat_type:
        if candidate.seat_type.value == passenger.preferred_seat_type:
            s += SCORE_WEIGHTS["preference_seat_type"]

    if passenger.preferred_side:
        if candidate.side == passenger.preferred_side:
            s += SCORE_WEIGHTS["preference_side"]

    return s


def _neighbor_affinity_score(
    candidate: Seat,
    passenger: PassengerContext,
    reservations: list[SeatReservation],
) -> float:
    """Score based on affinity with nearest seated neighbor.

    Only considers neighbors in the same row, adjacent columns
    (left or right). If both neighbors exist, uses the one with
    higher individual affinity. If no neighbor exists, returns 0.
    """
    # Find neighbors in the same row at adjacent columns
    neighbors = []
    for res in reservations:
        if res.seat is None:
            continue
        ns = res.seat
        if ns.row_number == candidate.row_number:
            if abs(ns.col_number - candidate.col_number) == 1:
                neighbors.append(res)

    if not neighbors:
        return 0.0

    # Score each neighbor and take the best
    best = 0.0
    for n in neighbors:
        affinity = _individual_affinity(passenger, n)
        best = max(best, affinity)

    return best


def _individual_affinity(
    passenger: PassengerContext,
    neighbor_res: SeatReservation,
) -> float:
    """Compute affinity between passenger and one neighbor."""
    score = 0.0

    # Language match
    if (
        passenger.language_preference
        and neighbor_res.language_preference
        and passenger.language_preference == neighbor_res.language_preference
    ):
        score += SCORE_WEIGHTS["affinity_language"]

    # Travel habit match
    if (
        passenger.travel_habit
        and neighbor_res.travel_habit
        and passenger.travel_habit == neighbor_res.travel_habit
    ):
        score += SCORE_WEIGHTS["affinity_travel_habit"]

    # Lifestyle interest overlap
    if passenger.lifestyle_interest and neighbor_res.lifestyle_interest:
        p_interests = set(
            i.strip().lower() for i in passenger.lifestyle_interest.split(",")
        )
        n_interests = set(
            i.strip().lower() for i in neighbor_res.lifestyle_interest.split(",")
        )
        overlap = len(p_interests & n_interests)
        score += min(overlap, 3) * SCORE_WEIGHTS["affinity_lifestyle"]

    return score


def _load_balance_score(
    candidate: Seat,
    reservations: list[SeatReservation],
    total_rows: int,
) -> float:
    """Bonus for seats in the less-occupied half of the bus."""
    if total_rows <= 1:
        return 0.0

    mid = total_rows // 2

    front_count = sum(
        1 for r in reservations
        if r.seat is not None and r.seat.row_number <= mid
    )
    back_count = sum(
        1 for r in reservations
        if r.seat is not None and r.seat.row_number > mid
    )

    if front_count > back_count and candidate.row_number > mid:
        return SCORE_WEIGHTS["load_balance"]
    elif back_count > front_count and candidate.row_number <= mid:
        return SCORE_WEIGHTS["load_balance"]

    return 0.0
