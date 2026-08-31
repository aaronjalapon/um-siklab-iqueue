"""Accessibility-first family allocation policy tests."""

from __future__ import annotations

import uuid

import pytest

from app.models.seat import Seat, SeatStatus, SeatType
from app.schemas.booking import GroupMemberRequest
from app.services.seat_assignment.engine import SeatUnavailableError
from app.services.seat_assignment.group import allocate_group_seats


def _seat(row: int, col: int, *, priority: bool) -> Seat:
    letter = "ABCD"[col - 1]
    return Seat(
        id=uuid.uuid4(),
        bus_id=uuid.uuid4(),
        seat_label=f"{row}{letter}",
        row_number=row,
        col_number=col,
        seat_type=SeatType.WINDOW if col in {1, 4} else SeatType.AISLE,
        is_near_exit=row == 1,
        is_accessibility=priority,
        side="left" if col <= 2 else "right",
        status=SeatStatus.AVAILABLE,
    )


def _layout() -> list[Seat]:
    return [
        _seat(row, col, priority=row <= 2)
        for row in range(1, 6)
        for col in range(1, 5)
    ]


def _member(name: str, accessible: bool = False) -> GroupMemberRequest:
    return GroupMemberRequest(
        name=name,
        phone=f"+63917{len(name):07d}",
        accessibility_needs=accessible,
    )


def test_demo_family_places_accessibility_companion_and_nearest_standard() -> None:
    allocations = allocate_group_seats(
        [_member("Maria", True), _member("Ana"), _member("Luis")],
        _layout(),
    )

    assert [item.seat.seat_label for item in allocations] == ["1A", "1B", "3A"]
    assert "Accessible seat near the exit" in allocations[0].reasons
    assert "Companion seated beside accessibility passenger" in allocations[1].reasons
    assert "Nearest available standard seat" in allocations[2].reasons


def test_multiple_accessibility_members_all_receive_priority_seats() -> None:
    members = [
        _member("Maria", True),
        _member("Ana"),
        _member("Luis", True),
        _member("Rosa", True),
    ]
    allocations = allocate_group_seats(members, _layout())
    assert all(allocations[index].seat.is_accessibility for index in (0, 2, 3))
    ordinary_priority = [
        item for item in allocations
        if not members[item.member_index].accessibility_needs
        and item.seat.is_accessibility
    ]
    assert len(ordinary_priority) == 1


def test_ordinary_family_never_consumes_priority_seats() -> None:
    allocations = allocate_group_seats(
        [_member("A"), _member("B"), _member("C"), _member("D")],
        _layout(),
    )
    assert all(not item.seat.is_accessibility for item in allocations)


def test_allocation_is_deterministic() -> None:
    members = [_member("Maria", True), _member("Ana"), _member("Luis")]
    first = allocate_group_seats(members, reversed(_layout()))
    second = allocate_group_seats(members, _layout())
    assert [item.seat.seat_label for item in first] == [
        item.seat.seat_label for item in second
    ]


def test_insufficient_priority_seats_rejects_entire_group() -> None:
    seats = [_seat(1, 1, priority=True)] + [
        _seat(3, col, priority=False) for col in range(1, 5)
    ]
    with pytest.raises(SeatUnavailableError, match="priority seats"):
        allocate_group_seats(
            [_member("Maria", True), _member("Luis", True), _member("Ana")],
            seats,
        )
