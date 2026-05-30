"""Integration tests for the buses API."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_buses_returns_results(
    client: AsyncClient, route, bus
):
    """GET /api/v1/buses?origin=X&dest=Y&date=Z should return buses."""
    response = await client.get(
        "/api/v1/buses",
        params={
            "origin": "Manila",
            "destination": "Davao",
            "travel_date": "2026-06-15",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert len(data["buses"]) >= 1
    assert data["route_origin"] == route.origin
    assert data["route_destination"] == route.destination


@pytest.mark.asyncio
async def test_list_buses_no_results_for_unknown_route(
    client: AsyncClient
):
    """GET /api/v1/buses for unknown route should return empty results."""
    response = await client.get(
        "/api/v1/buses",
        params={
            "origin": "Atlantis",
            "destination": "ElDorado",
            "travel_date": "2026-06-15",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["buses"] == []


@pytest.mark.asyncio
async def test_get_seat_map_returns_correct_structure(
    client: AsyncClient, bus
):
    """GET /api/v1/buses/{id}/seats should return a complete seat map."""
    response = await client.get(
        f"/api/v1/buses/{bus.id}/seats",
        params={"travel_date": "2026-06-15"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["bus_id"] == str(bus.id)
    assert data["capacity"] == bus.capacity
    assert len(data["seats"]) == bus.capacity
    assert data["available_count"] == bus.capacity  # No bookings yet
    assert data["booked_count"] == 0

    # Check seat structure
    first_seat = data["seats"][0]
    assert "seat_number" in first_seat
    assert "is_available" in first_seat
    assert first_seat["is_available"] is True


@pytest.mark.asyncio
async def test_get_seat_map_404_for_nonexistent_bus(
    client: AsyncClient
):
    """GET /api/v1/buses/{id}/seats should return 404 for unknown bus."""
    import uuid
    response = await client.get(
        f"/api/v1/buses/{uuid.uuid4()}/seats",
        params={"travel_date": "2026-06-15"},
    )
    assert response.status_code == 404
