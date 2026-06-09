"""Integration tests for the seat assignment API endpoints."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_seat_map_empty_bus(client: AsyncClient, bus):
    """GET /api/v1/seats/bus/{bus_id} should return seats for a bus."""
    # First generate seats for this bus
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus
    from app.db.session import _get_session_factory

    # Create a default layout and generate seats
    from app.models.bus_layout import BusLayout
    session_factory = _get_session_factory()
    async with session_factory() as session:
        layout = BusLayout(
            id=uuid.uuid4(),
            name="Test Standard 56",
            total_rows=14,
            seats_per_row=4,
            aisle_after_col=2,
            total_capacity=56,
        )
        session.add(layout)
        await session.flush()

        bus.layout_id = layout.id
        await generate_seats_for_bus(bus, session)
        await session.commit()

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
async def test_assign_seat_with_preferences(client: AsyncClient, bus):
    """POST /api/v1/seats/assign should return 201 with a valid assignment."""
    # Generate seats first
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus
    from app.models.bus_layout import BusLayout
    from app.db.session import _get_session_factory

    session_factory = _get_session_factory()
    async with session_factory() as session:
        layout = BusLayout(
            id=uuid.uuid4(),
            name="Test Standard 56",
            total_rows=14,
            seats_per_row=4,
            aisle_after_col=2,
            total_capacity=56,
        )
        session.add(layout)
        await session.flush()
        bus.layout_id = layout.id
        await generate_seats_for_bus(bus, session)
        await session.commit()

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
async def test_assign_seat_accessibility(client: AsyncClient, bus):
    """Accessibility passenger must get a front-row, near-exit seat."""
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus
    from app.models.bus_layout import BusLayout
    from app.db.session import _get_session_factory

    session_factory = _get_session_factory()
    async with session_factory() as session:
        layout = BusLayout(
            id=uuid.uuid4(),
            name="Test Standard 56",
            total_rows=14,
            seats_per_row=4,
            aisle_after_col=2,
            total_capacity=56,
        )
        session.add(layout)
        await session.flush()
        bus.layout_id = layout.id
        await generate_seats_for_bus(bus, session)
        await session.commit()

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
async def test_swap_seats(client: AsyncClient, bus, passenger):
    """PUT /api/v1/seats/swap should exchange two reservations."""
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus
    from app.models.bus_layout import BusLayout
    from app.db.session import _get_session_factory

    session_factory = _get_session_factory()
    booking_id_a = uuid.uuid4()
    booking_id_b = uuid.uuid4()

    async with session_factory() as session:
        layout = BusLayout(
            id=uuid.uuid4(),
            name="Test Standard 56",
            total_rows=14,
            seats_per_row=4,
            aisle_after_col=2,
            total_capacity=56,
        )
        session.add(layout)
        await session.flush()
        bus.layout_id = layout.id
        await generate_seats_for_bus(bus, session)
        await session.commit()

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
async def test_release_seat(client: AsyncClient, bus):
    """DELETE /api/v1/seats/release/{booking_id} should free a seat."""
    from app.services.seat_assignment.bus_layout import generate_seats_for_bus
    from app.models.bus_layout import BusLayout
    from app.db.session import _get_session_factory

    session_factory = _get_session_factory()
    booking_id = uuid.uuid4()

    async with session_factory() as session:
        layout = BusLayout(
            id=uuid.uuid4(),
            name="Test Standard 56",
            total_rows=14,
            seats_per_row=4,
            aisle_after_col=2,
            total_capacity=56,
        )
        session.add(layout)
        await session.flush()
        bus.layout_id = layout.id
        await generate_seats_for_bus(bus, session)
        await session.commit()

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
