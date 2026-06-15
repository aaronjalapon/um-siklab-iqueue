"""Accessibility-priority behavior for the DB-backed seat assignment engine."""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.seat_assignment.engine import SeatAllocator
from app.services.seat_assignment.scorer import PassengerContext


@pytest.mark.asyncio
async def test_standard_passenger_skips_accessibility_seats_when_possible(
    db_session: AsyncSession,
    bus,
):
    """Standard passengers should leave front priority seats open."""
    allocator = SeatAllocator(db_session)

    result = await allocator.assign(
        bus.id,
        PassengerContext(
            booking_id="temp",
            passenger_name="Standard Passenger",
            needs_accessibility=False,
        ),
    )

    assert result["row_number"] > 2
    assert result["is_accessibility"] is False

    seats = await allocator.get_seat_map(bus.id)
    priority_seats = [seat for seat in seats if seat["is_accessibility"]]
    assert priority_seats
    assert all(seat["status"] == "available" for seat in priority_seats)


@pytest.mark.asyncio
async def test_accessibility_passenger_gets_priority_seat(
    db_session: AsyncSession,
    bus,
):
    """Passengers with accessibility needs should get a front priority seat."""
    allocator = SeatAllocator(db_session)

    result = await allocator.assign(
        bus.id,
        PassengerContext(
            booking_id="temp",
            passenger_name="Accessibility Passenger",
            needs_accessibility=True,
        ),
    )

    assert result["row_number"] <= 2
    assert result["is_accessibility"] is True
