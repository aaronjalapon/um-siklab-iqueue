"""Integration tests for the forecasts API."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forecast_learning import ForecastSnapshot, OperationalOutcome
from app.models.tenant import Tenant


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
    assert "forecast_snapshot_id" in first
    assert "surge_probability" in first
    assert "predicted_volume" in first
    assert "risk_level" in first
    assert "recommended_action" in first
    assert data["model_source"] in {"ml_bundle", "heuristic"}


@pytest.mark.asyncio
async def test_get_forecast_creates_snapshots(
    client: AsyncClient,
    db_session: AsyncSession,
    route,
):
    """Forecast responses should create ground-truth snapshot records."""
    response = await client.get(f"/api/v1/forecasts/{route.id}")
    assert response.status_code == 200

    snapshot_ids = [
        item["forecast_snapshot_id"]
        for item in response.json()["predictions"]
    ]
    result = await db_session.execute(
        select(ForecastSnapshot).where(ForecastSnapshot.route_id == route.id)
    )
    snapshots = result.scalars().all()

    assert len(snapshots) == len(snapshot_ids)
    assert {str(snapshot.id) for snapshot in snapshots} == set(snapshot_ids)


@pytest.mark.asyncio
async def test_forecast_action_accept_and_override_validation(
    client: AsyncClient,
    route,
):
    """Operators can accept forecasts; overrides require a reason."""
    forecast = await client.get(f"/api/v1/forecasts/{route.id}")
    snapshot_id = forecast.json()["predictions"][0]["forecast_snapshot_id"]

    accepted = await client.post(
        "/api/v1/forecast-actions",
        json={
            "tenant_id": str(route.tenant_id),
            "forecast_snapshot_id": snapshot_id,
            "action_taken": "accepted",
            "operator_id": "test-admin",
        },
    )
    assert accepted.status_code == 201
    assert accepted.json()["action_taken"] == "accepted"

    rejected_without_reason = await client.post(
        "/api/v1/forecast-actions",
        json={
            "tenant_id": str(route.tenant_id),
            "forecast_snapshot_id": snapshot_id,
            "action_taken": "rejected",
        },
    )
    assert rejected_without_reason.status_code == 422


@pytest.mark.asyncio
async def test_forecast_action_tenant_scope(
    client: AsyncClient,
    db_session: AsyncSession,
    route,
):
    """A tenant cannot write feedback for another tenant's snapshot."""
    other_tenant = Tenant(name="Other Operator", country="PH")
    db_session.add(other_tenant)
    await db_session.flush()

    forecast = await client.get(f"/api/v1/forecasts/{route.id}")
    snapshot_id = forecast.json()["predictions"][0]["forecast_snapshot_id"]

    response = await client.post(
        "/api/v1/forecast-actions",
        json={
            "tenant_id": str(other_tenant.id),
            "forecast_snapshot_id": snapshot_id,
            "action_taken": "accepted",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_record_operational_outcome(
    client: AsyncClient,
    db_session: AsyncSession,
    route,
):
    """End-of-day outcome logging should persist route-day ground truth."""
    response = await client.post(
        "/api/v1/operations/outcomes",
        json={
            "tenant_id": str(route.tenant_id),
            "route_id": str(route.id),
            "service_date": "2026-06-20",
            "actual_passenger_count": 420,
            "peak_queue_length": 70,
            "average_wait_time_minutes": 8.5,
            "wait_time_p95_minutes": 16.0,
            "extra_buses_dispatched": 1,
            "lanes_opened": 2,
            "missed_boardings": 0,
            "overcrowding_incident": False,
            "recorded_by": "test-admin",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["actual_passenger_count"] == 420

    outcome = await db_session.get(OperationalOutcome, uuid.UUID(data["id"]))
    assert outcome is not None
    assert outcome.route_id == route.id


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
