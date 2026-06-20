"""Health endpoints for live and readiness checks."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings
from app.core.startup import probe_database, runtime_snapshot

router = APIRouter()


@router.get("/live")
async def live_check() -> dict[str, str]:
    """Return a simple liveness signal for Azure App Service."""

    return {"status": "ok", "service": "iqueue-api"}


@router.get("/readiness")
async def readiness_check() -> dict[str, object]:
    """Return model and database readiness for App Service health checks."""

    snapshot = runtime_snapshot()
    snapshot["database_ready"] = await probe_database()
    require_models = get_settings().REQUIRE_FORECAST_MODELS
    snapshot["forecast_models_required"] = require_models
    snapshot["ready"] = bool(
        snapshot["chatbot_ready"]
        and snapshot["forecasting_ready"]
        and snapshot["database_ready"]
        and (snapshot["forecast_bundle_ready"] or not require_models)
    )
    snapshot["status"] = "ok" if snapshot["ready"] else "degraded"
    return snapshot
