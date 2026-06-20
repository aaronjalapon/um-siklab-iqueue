"""Integration tests for model-admin degraded behavior."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.api.v1 import model_admin


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("post", "/api/v1/forecasts/model/retrain"),
        ("get", "/api/v1/forecasts/model/retrain/status"),
        ("get", "/api/v1/forecasts/model/retrain/jobs"),
    ],
)
async def test_model_admin_endpoints_return_503_without_ml_runtime(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    method: str,
    path: str,
) -> None:
    """Retraining endpoints should fail gracefully in the lightweight runtime."""

    def _missing_runtime():
        raise model_admin.HTTPException(
            status_code=503,
            detail=model_admin.ML_ADMIN_UNAVAILABLE_DETAIL,
        )

    monkeypatch.setattr(model_admin, "_get_retraining_service", _missing_runtime)

    if method == "post":
        response = await client.post(path, json={"epochs": 1, "min_new_rows": 1})
    else:
        response = await client.get(path)

    assert response.status_code == 503
    assert response.json()["detail"] == model_admin.ML_ADMIN_UNAVAILABLE_DETAIL


@pytest.mark.asyncio
async def test_model_reload_returns_503_when_forecasting_runtime_unavailable(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Hot-reload should return 503 when optional forecasting deps are absent."""

    monkeypatch.setattr(
        "app.core.startup.reload_forecasting_service",
        lambda: None,
    )

    response = await client.post("/api/v1/forecasts/model/reload")

    assert response.status_code == 503
    assert response.json()["detail"] == model_admin.ML_ADMIN_UNAVAILABLE_DETAIL
