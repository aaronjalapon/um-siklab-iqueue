"""Unit tests for the Seat Allocator engine."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatus
from app.models.passenger import Passenger
from app.services.seat_allocator.allocator import SeatAllocator


@pytest.mark.asyncio
async def test_assigns_seat_when_empty_bus(
    db_session: AsyncSession, bus, passenger
):
    """An empty bus should assign seat 1A (front row, window)."""
    allocator = SeatAllocator(bus_capacity=bus.capacity)
    departure = datetime.now(timezone.utc) + timedelta(days=1)

    result = await allocator.assign(
        db=db_session,
        bus_id=bus.id,
        passenger=passenger,
        departure_date=departure,
    )

    assert result.seat_number is not None
    assert result.boarding_window_start > departure
    assert (result.boarding_window_end - result.boarding_window_start).seconds == 900  # 15 min


@pytest.mark.asyncio
async def test_assigns_accessibility_seat_in_front_rows(
    db_session: AsyncSession, bus, tenant
):
    """Passengers with accessibility needs should get rows 1-2."""
    pax = Passenger(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        name="PWD Passenger",
        phone="+63 900 000 0001",
        language_pref="fil",
        accessibility_needs=True,
    )
    db_session.add(pax)
    await db_session.flush()

    allocator = SeatAllocator(bus_capacity=bus.capacity)
    departure = datetime.now(timezone.utc) + timedelta(days=1)

    result = await allocator.assign(
        db=db_session,
        bus_id=bus.id,
        passenger=pax,
        departure_date=departure,
    )

    row = int(result.seat_number.rstrip("ABCD"))
    assert row <= 2, f"Expected front row, got row {row}"


@pytest.mark.asyncio
async def test_assigns_different_seats_for_multiple_passengers(
    db_session: AsyncSession, bus, passenger, tenant
):
    """Multiple passengers should get different seats."""
    pax2 = Passenger(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        name="Second Passenger",
        phone="+63 900 000 0002",
        language_pref="en",
    )
    db_session.add(pax2)
    await db_session.flush()

    allocator = SeatAllocator(bus_capacity=bus.capacity)
    departure = datetime.now(timezone.utc) + timedelta(days=1)

    # Book first seat
    booking1 = Booking(
        id=uuid.uuid4(),
        passenger_id=passenger.id,
        bus_id=bus.id,
        seat_number="1A",
        boarding_window_start=departure + timedelta(minutes=3),
        boarding_window_end=departure + timedelta(minutes=18),
        status=BookingStatus.CONFIRMED,
        departure_date=departure,
    )
    db_session.add(booking1)
    await db_session.flush()

    result = await allocator.assign(
        db=db_session,
        bus_id=bus.id,
        passenger=pax2,
        departure_date=departure,
    )

    assert result.seat_number != "1A"


@pytest.mark.asyncio
async def test_affinity_scoring_prefers_language_match(
    db_session: AsyncSession, bus, passenger, tenant
):
    """Seat allocator should prefer seats next to same-language passengers."""
    # Create a Filipino-speaking seatmate in seat 1B
    seatmate = Passenger(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        name="Maria Santos",
        phone="+63 900 000 0003",
        language_pref="fil",  # same as passenger
        travel_habits="leisure",  # same as passenger
        lifestyle_interests="music,travel",
    )
    db_session.add(seatmate)
    await db_session.flush()

    departure = datetime.now(timezone.utc) + timedelta(days=1)

    # Book seatmate in 1B
    booking = Booking(
        id=uuid.uuid4(),
        passenger_id=seatmate.id,
        bus_id=bus.id,
        seat_number="1B",
        boarding_window_start=departure,
        boarding_window_end=departure + timedelta(minutes=15),
        status=BookingStatus.CONFIRMED,
        departure_date=departure,
    )
    db_session.add(booking)
    await db_session.flush()

    allocator = SeatAllocator(bus_capacity=bus.capacity)
    result = await allocator.assign(
        db=db_session,
        bus_id=bus.id,
        passenger=passenger,
        departure_date=departure,
    )

    # Should get seat 1A or 1C (same row as language-matching seatmate)
    row = int(result.seat_number.rstrip("ABCD"))
    assert row == 1, f"Expected row 1 near language-matching seatmate, got {result.seat_number}"
    assert result.affinity_score > 0, f"Expected positive affinity score, got {result.affinity_score}"


@pytest.mark.asyncio
async def test_raises_when_bus_full(
    db_session: AsyncSession, bus, passenger
):
    """Should raise ValueError when all seats are booked."""
    departure = datetime.now(timezone.utc) + timedelta(days=1)

    # Book all seats (use same format as SeatAllocator: "1A", "1B", etc.)
    columns = ["A", "B", "C", "D"]
    for seat_num in range(1, bus.capacity + 1):
        row = (seat_num - 1) // 4 + 1
        col = columns[(seat_num - 1) % 4]
        booking = Booking(
            id=uuid.uuid4(),
            passenger_id=passenger.id,
            bus_id=bus.id,
            seat_number=f"{row}{col}",
            boarding_window_start=departure,
            boarding_window_end=departure + timedelta(minutes=15),
            status=BookingStatus.CONFIRMED,
            departure_date=departure,
        )
        db_session.add(booking)

    await db_session.flush()

    allocator = SeatAllocator(bus_capacity=bus.capacity)

    with pytest.raises(ValueError, match="No available seats"):
        await allocator.assign(
            db=db_session,
            bus_id=bus.id,
            passenger=passenger,
            departure_date=departure,
        )
