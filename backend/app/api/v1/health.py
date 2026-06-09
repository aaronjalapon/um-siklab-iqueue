"""Health endpoints for live and readiness checks."""

from __future__ import annotations

from fastapi import APIRouter

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
    snapshot["ready"] = bool(
        snapshot["chatbot_ready"]
        and snapshot["forecasting_ready"]
        and snapshot["database_ready"]
    )
    snapshot["status"] = "ok" if snapshot["ready"] else "degraded"
    return snapshot