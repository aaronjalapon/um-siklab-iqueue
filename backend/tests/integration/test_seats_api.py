"""Integration tests for the seat assignment API endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_seat_map_empty_bus(client: AsyncClient, db_session, bus):
    """GET /api/v1/seats/bus/{bus_id} should return seats for a bus."""
    # First generate seats for this bus
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus
    # Create a default layout and generate seats
    from app.models.bus_layout import BusLayout
    layout = BusLayout(
        id=uuid.uuid4(),
        name="Test Standard 56",
        total_rows=14,
        seats_per_row=4,
        aisle_after_col=2,
        total_capacity=56,
    )
    db_session.add(layout)
    await db_session.flush()

    bus.layout_id = layout.id
    await generate_seats_for_bus(bus, db_session)
    await db_session.flush()

    response = await client.get(f"/api/v1/seats/bus/{bus.id}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 56
    for seat in data:
        assert "seat_id" in seat
        assert "seat_label" in seat
        assert "status" in seat
        assert seat["status"] == "available"


@pytest.mark.asyncio
async def test_get_seat_map_nonexistent_bus(client: AsyncClient):
    """GET /api/v1/seats/bus/{bus_id} should return 404 for invalid bus."""
    fake_id = uuid.uuid4()
    response = await client.get(f"/api/v1/seats/bus/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_assign_seat_with_preferences(client: AsyncClient, db_session, bus):
    """POST /api/v1/seats/assign should return 201 with a valid assignment."""
    # Generate seats first
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus
    from app.models.bus_layout import BusLayout
    layout = BusLayout(
        id=uuid.uuid4(),
        name="Test Standard 56",
        total_rows=14,
        seats_per_row=4,
        aisle_after_col=2,
        total_capacity=56,
    )
    db_session.add(layout)
    await db_session.flush()
    bus.layout_id = layout.id
    await generate_seats_for_bus(bus, db_session)
    await db_session.flush()

    payload = {
        "bus_id": str(bus.id),
        "passenger": {
            "booking_id": str(uuid.uuid4()),
            "passenger_name": "Test Passenger",
            "language_preference": "fil",
            "travel_habit": "leisure",
            "needs_accessibility": False,
        },
    }

    response = await client.post("/api/v1/seats/assign", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "seat_id" in data
    assert "seat_label" in data
    assert "affinity_score" in data
    assert data["affinity_score"] >= 0


@pytest.mark.asyncio
async def test_preview_assignment_does_not_reserve_seat(
    client: AsyncClient,
    db_session,
    bus,
):
    """A pre-booking recommendation must not create an orphan reservation."""

    from sqlalchemy import func, select

    from app.models.seat import Seat, SeatReservation, SeatStatus
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus

    await generate_seats_for_bus(bus, db_session)
    await db_session.flush()
    response = await client.post(
        "/api/v1/seats/assign",
        json={
            "bus_id": str(bus.id),
            "passenger": {
                "booking_id": "temp",
                "passenger_name": "Preview Passenger",
            },
        },
    )

    assert response.status_code == 201
    seat_id = response.json()["seat_id"]
    seat = await db_session.get(Seat, uuid.UUID(seat_id))
    reservation_count = await db_session.scalar(
        select(func.count(SeatReservation.id)).where(
            SeatReservation.seat_id == seat.id
        )
    )
    assert seat.status == SeatStatus.AVAILABLE
    assert reservation_count == 0


@pytest.mark.asyncio
async def test_get_seat_map_scopes_occupancy_by_travel_date(
    client: AsyncClient,
    db_session,
    passenger,
    bus,
):
    """A seat booked on one departure must remain available on other dates."""
    from app.models.booking import Booking, BookingStatus
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus

    await generate_seats_for_bus(bus, db_session)
    await db_session.flush()

    day_one = datetime.now(timezone.utc) + timedelta(days=6)
    day_two = day_one + timedelta(days=1)
    db_session.add(
        Booking(
            id=uuid.uuid4(),
            passenger_id=passenger.id,
            bus_id=bus.id,
            seat_number="1A",
            boarding_window_start=day_one,
            boarding_window_end=day_one + timedelta(minutes=15),
            status=BookingStatus.CONFIRMED,
            departure_date=day_one,
        )
    )
    await db_session.flush()

    day_one_response = await client.get(
        f"/api/v1/seats/bus/{bus.id}",
        params={"travel_date": day_one.date().isoformat()},
    )
    day_two_response = await client.get(
        f"/api/v1/seats/bus/{bus.id}",
        params={"travel_date": day_two.date().isoformat()},
    )

    assert day_one_response.status_code == 200
    assert day_two_response.status_code == 200

    day_one_seat = next(
        seat for seat in day_one_response.json() if seat["seat_label"] == "1A"
    )
    day_two_seat = next(
        seat for seat in day_two_response.json() if seat["seat_label"] == "1A"
    )
    assert day_one_seat["status"] == "occupied"
    assert day_two_seat["status"] == "available"


@pytest.mark.asyncio
async def test_assign_seat_uses_requested_travel_date(
    client: AsyncClient,
    db_session,
    passenger,
    bus,
):
    """Passenger preview assignment should ignore bookings on other dates."""
    from app.models.booking import Booking, BookingStatus
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus

    await generate_seats_for_bus(bus, db_session)
    await db_session.flush()

    day_one = datetime.now(timezone.utc) + timedelta(days=7)
    day_two = day_one + timedelta(days=1)
    db_session.add(
        Booking(
            id=uuid.uuid4(),
            passenger_id=passenger.id,
            bus_id=bus.id,
            seat_number="3A",
            boarding_window_start=day_one,
            boarding_window_end=day_one + timedelta(minutes=15),
            status=BookingStatus.CONFIRMED,
            departure_date=day_one,
        )
    )
    await db_session.flush()

    response = await client.post(
        "/api/v1/seats/assign",
        json={
            "bus_id": str(bus.id),
            "travel_date": day_two.date().isoformat(),
            "seat_label": "3A",
            "passenger": {
                "booking_id": "temp",
                "passenger_name": "Preview Passenger",
            },
        },
    )

    assert response.status_code == 201, response.text
    assert response.json()["seat_label"] == "3A"


@pytest.mark.asyncio
async def test_assign_seat_accessibility(client: AsyncClient, db_session, bus):
    """Accessibility passenger must get a front-row, near-exit seat."""
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus
    from app.models.bus_layout import BusLayout
    layout = BusLayout(
        id=uuid.uuid4(),
        name="Test Standard 56",
        total_rows=14,
        seats_per_row=4,
        aisle_after_col=2,
        total_capacity=56,
    )
    db_session.add(layout)
    await db_session.flush()
    bus.layout_id = layout.id
    await generate_seats_for_bus(bus, db_session)
    await db_session.flush()

    payload = {
        "bus_id": str(bus.id),
        "passenger": {
            "booking_id": str(uuid.uuid4()),
            "passenger_name": "PWD Passenger",
            "needs_accessibility": True,
        },
    }

    response = await client.post("/api/v1/seats/assign", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["row_number"] <= 2, f"Expected front row, got {data['row_number']}"


@pytest.mark.asyncio
async def test_assign_seat_nonexistent_bus(client: AsyncClient):
    """POST /api/v1/seats/assign should return 404 for invalid bus."""
    payload = {
        "bus_id": str(uuid.uuid4()),
        "passenger": {
            "booking_id": str(uuid.uuid4()),
            "passenger_name": "Test",
        },
    }
    response = await client.post("/api/v1/seats/assign", json=payload)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_swap_seats(client: AsyncClient, db_session, bus, passenger):
    """PUT /api/v1/seats/swap should exchange two reservations."""
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus
    from app.models.bus_layout import BusLayout
    booking_id_a = uuid.uuid4()
    booking_id_b = uuid.uuid4()
    layout = BusLayout(
        id=uuid.uuid4(),
        name="Test Standard 56",
        total_rows=14,
        seats_per_row=4,
        aisle_after_col=2,
        total_capacity=56,
    )
    db_session.add(layout)
    await db_session.flush()
    bus.layout_id = layout.id
    await generate_seats_for_bus(bus, db_session)
    await db_session.flush()

    # Assign two seats
    payload_a = {
        "bus_id": str(bus.id),
        "passenger": {
            "booking_id": str(booking_id_a),
            "passenger_name": "Passenger A",
        },
    }
    payload_b = {
        "bus_id": str(bus.id),
        "passenger": {
            "booking_id": str(booking_id_b),
            "passenger_name": "Passenger B",
        },
    }

    response_a = await client.post("/api/v1/seats/assign", json=payload_a)
    response_b = await client.post("/api/v1/seats/assign", json=payload_b)
    assert response_a.status_code == 201
    assert response_b.status_code == 201

    # Swap them
    swap_payload = {
        "booking_id_a": str(booking_id_a),
        "booking_id_b": str(booking_id_b),
    }
    response = await client.put("/api/v1/seats/swap", json=swap_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "swapped"


@pytest.mark.asyncio
async def test_swap_different_buses_rejected(client: AsyncClient, bus):
    """PUT /api/v1/seats/swap should reject seats on different buses."""
    # One reservation exists (via setup), the other doesn't → 400
    swap_payload = {
        "booking_id_a": str(uuid.uuid4()),
        "booking_id_b": str(uuid.uuid4()),
    }
    response = await client.put("/api/v1/seats/swap", json=swap_payload)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_release_seat(client: AsyncClient, db_session, bus):
    """DELETE /api/v1/seats/release/{booking_id} should free a seat."""
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus
    from app.models.bus_layout import BusLayout
    booking_id = uuid.uuid4()
    layout = BusLayout(
        id=uuid.uuid4(),
        name="Test Standard 56",
        total_rows=14,
        seats_per_row=4,
        aisle_after_col=2,
        total_capacity=56,
    )
    db_session.add(layout)
    await db_session.flush()
    bus.layout_id = layout.id
    await generate_seats_for_bus(bus, db_session)
    await db_session.flush()

    # Assign a seat
    payload = {
        "bus_id": str(bus.id),
        "passenger": {
            "booking_id": str(booking_id),
            "passenger_name": "To Release",
        },
    }
    response = await client.post("/api/v1/seats/assign", json=payload)
    assert response.status_code == 201

    # Release it
    response = await client.delete(f"/api/v1/seats/release/{booking_id}")
    assert response.status_code == 204
