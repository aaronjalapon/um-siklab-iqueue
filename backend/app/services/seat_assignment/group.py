"""Deterministic, accessibility-first family seat allocation."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable, Sequence

from app.models.seat import Seat
from app.schemas.booking import GroupMemberRequest
from app.services.seat_assignment.engine import SeatUnavailableError


@dataclass(frozen=True)
class GroupAllocation:
    member_index: int
    seat: Seat
    reasons: tuple[str, ...]


def _seat_key(seat: Seat) -> tuple[int, int, str]:
    return seat.row_number, seat.col_number, seat.seat_label


def _beside(first: Seat, second: Seat) -> bool:
    """True for seats beside one another without crossing the aisle."""
    return (
        first.row_number == second.row_number
        and abs(first.col_number - second.col_number) == 1
        and {first.col_number, second.col_number} in ({1, 2}, {3, 4})
    )


def allocate_group_seats(
    members: Sequence[GroupMemberRequest],
    available_seats: Iterable[Seat],
) -> list[GroupAllocation]:
    """Allocate every family member with accessibility as a hard constraint.

    Priority seats are reserved for accessibility passengers, plus exactly one
    ordinary companion seated beside the primary accessibility passenger.
    Remaining family members use the closest standard seats.
    """
    seats = sorted(available_seats, key=_seat_key)
    if len(seats) < len(members):
        raise SeatUnavailableError("Not enough available seats for the whole family")

    accessible_indexes = [
        index for index, member in enumerate(members) if member.accessibility_needs
    ]
    ordinary_indexes = [
        index for index, member in enumerate(members) if not member.accessibility_needs
    ]
    priority = [seat for seat in seats if seat.is_accessibility]
    standard = [seat for seat in seats if not seat.is_accessibility]

    if len(priority) < len(accessible_indexes):
        raise SeatUnavailableError(
            "Not enough eligible priority seats for accessibility requirements"
        )

    allocations: dict[int, GroupAllocation] = {}
    used: set[str] = set()

    if accessible_indexes:
        primary_index = accessible_indexes[0]
        primary: Seat | None = None
        companion: Seat | None = None
        companion_index = ordinary_indexes[0] if ordinary_indexes else None

        for candidate in priority:
            possible_companions = [
                seat
                for seat in priority
                if seat.seat_label != candidate.seat_label and _beside(candidate, seat)
            ]
            if companion_index is None or possible_companions:
                primary = candidate
                companion = possible_companions[0] if possible_companions else None
                break

        if primary is None:
            raise SeatUnavailableError(
                "No priority seat has room for the required adjacent companion"
            )

        allocations[primary_index] = GroupAllocation(
            primary_index,
            primary,
            ("Accessible seat near the exit", "Accessibility requirement met"),
        )
        used.add(primary.seat_label)

        if companion_index is not None:
            if companion is None:
                raise SeatUnavailableError(
                    "No priority seat has room for the required adjacent companion"
                )
            allocations[companion_index] = GroupAllocation(
                companion_index,
                companion,
                ("Companion seated beside accessibility passenger", "Kept near family"),
            )
            used.add(companion.seat_label)

        for member_index in accessible_indexes[1:]:
            candidates = [seat for seat in priority if seat.seat_label not in used]
            if not candidates:
                raise SeatUnavailableError(
                    "Not enough eligible priority seats for accessibility requirements"
                )
            chosen = candidates[0]
            allocations[member_index] = GroupAllocation(
                member_index,
                chosen,
                ("Accessible seat near the exit", "Accessibility requirement met"),
            )
            used.add(chosen.seat_label)

    remaining_indexes = [index for index in range(len(members)) if index not in allocations]
    for member_index in remaining_indexes:
        candidates = [seat for seat in standard if seat.seat_label not in used]
        if not candidates:
            raise SeatUnavailableError(
                "Not enough standard seats to keep priority seats protected"
            )
        assigned_seats = [allocation.seat for allocation in allocations.values()]

        def proximity_key(seat: Seat) -> tuple[int, int, int, int, str]:
            if not assigned_seats:
                return (*_seat_key(seat), 0, "")
            same_row = 0 if any(other.row_number == seat.row_number for other in assigned_seats) else 1
            row_distance = min(
                abs(other.row_number - seat.row_number) for other in assigned_seats
            )
            seat_distance = min(
                abs(other.row_number - seat.row_number) * 10
                + abs(other.col_number - seat.col_number)
                for other in assigned_seats
            )
            return same_row, row_distance, seat_distance, seat.col_number, seat.seat_label

        chosen = min(candidates, key=proximity_key)
        allocations[member_index] = GroupAllocation(
            member_index,
            chosen,
            ("Kept near family", "Nearest available standard seat"),
        )
        used.add(chosen.seat_label)

    return [allocations[index] for index in range(len(members))]


def synchronized_boarding_window(
    departure: datetime, allocations: Sequence[GroupAllocation]
) -> tuple[datetime, datetime]:
    """Use one front-most boarding window for the complete family."""
    front_row = min(allocation.seat.row_number for allocation in allocations)
    start = departure + timedelta(minutes=front_row * 3)
    return start, start + timedelta(minutes=15)
