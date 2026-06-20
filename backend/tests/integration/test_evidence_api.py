"""Integration tests for evidence and scoped demo replay endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.config import get_settings


@pytest.mark.asyncio
async def test_evidence_summary_discloses_synthetic_data(
    client: AsyncClient,
) -> None:
    response = await client.get("/api/v1/evidence/summary")
    assert response.status_code == 200
    body = response.json()
    assert body["data_disclosure"]["data_type"] == "synthetic"
    assert body["data_disclosure"]["field_pilot_completed"] is False
    assert "active_bundle" in body
    assert "subsystems" in body


@pytest.mark.asyncio
async def test_retraining_replay_is_disabled_outside_demo_mode(
    client: AsyncClient,
) -> None:
    response = await client.post("/api/v1/demo/retraining-replay")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_retraining_replay_never_mutates_champion(
    client: AsyncClient,
    monkeypatch,
) -> None:
    monkeypatch.setenv("DEMO_MODE", "true")
    get_settings.cache_clear()
    try:
        response = await client.post("/api/v1/demo/retraining-replay")
    finally:
        get_settings.cache_clear()
    assert response.status_code == 200
    body = response.json()
    assert body["simulated"] is True
    assert body["mutated_champion"] is False
    assert body["decision"] in {"promote", "retain_champion"}
