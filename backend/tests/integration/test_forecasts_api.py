"""Integration tests for the forecasts API."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_forecast_returns_200(
    client: AsyncClient, route
):
    """GET /api/v1/forecasts/{route_id} should return 200 with predictions."""
    response = await client.get(f"/api/v1/forecasts/{route.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["route_id"] == str(route.id)
    assert len(data["predictions"]) > 0
    assert "predictions" in data

    # Check prediction structure
    first = data["predictions"][0]
    assert "forecast_date" in first
    assert "surge_probability" in first
    assert "predicted_volume" in first


@pytest.mark.asyncio
async def test_get_forecast_404_for_nonexistent_route(
    client: AsyncClient
):
    """GET /api/v1/forecasts/{route_id} should return 404 for unknown route."""
    import uuid
    response = await client.get(f"/api/v1/forecasts/{uuid.uuid4()}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_health_endpoint_returns_ok(client: AsyncClient):
    """GET /api/v1/health should return status ok."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "iqueue-api"
