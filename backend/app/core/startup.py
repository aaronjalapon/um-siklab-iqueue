"""Application startup and readiness helpers."""

from __future__ import annotations

import importlib
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import logging
from typing import TYPE_CHECKING

from app.db.session import probe_database as probe_database_session

if TYPE_CHECKING:
    from app.services.forecasting.predictor import ForecastingService

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class RuntimeReadiness:
    """Aggregated runtime readiness state for the backend."""

    chatbot_ready: bool = False
    forecasting_ready: bool = False
    forecast_bundle_ready: bool = False
    forecast_bundle_status: str = "unavailable"
    loaded_routes: list[str] = field(default_factory=list)
    model_version: str | None = None
    classifier_ready: bool = False
    database_ready: bool = False
    initialized_at: datetime | None = None
    last_error: str | None = None

    @property
    def ready(self) -> bool:
        """Return True when the core runtime dependencies are available."""

        return self.chatbot_ready and self.forecasting_ready and self.database_ready


_forecasting_service: ForecastingService | None = None
_runtime_state = RuntimeReadiness()


def _load_chatbot_service():
    """Load the chatbot singleton lazily to keep the base image lightweight."""

    module = importlib.import_module("app.services.chatbot.bot")
    return module.get_chatbot_service()


def get_forecasting_service() -> ForecastingService | None:
    """Return the singleton forecasting service instance when available."""

    global _forecasting_service
    if _forecasting_service is None:
        try:
            module = importlib.import_module("app.services.forecasting.predictor")
        except ImportError as exc:
            logger.warning(
                "Forecasting dependencies unavailable during startup: %s",
                exc,
            )
            return None
        _forecasting_service = module.ForecastingService()
    return _forecasting_service


async def probe_database() -> bool:
    """Return True when the configured database accepts a simple query."""

    ready = await probe_database_session()
    if not ready:
        logger.warning("Database readiness probe failed")
    return ready


async def warm_application() -> RuntimeReadiness:
    """Preload core services and capture their readiness state."""

    global _runtime_state

    state = RuntimeReadiness(initialized_at=datetime.now(timezone.utc))

    try:
        chatbot_service = _load_chatbot_service()
        state.chatbot_ready = bool(chatbot_service and chatbot_service._model_available)
    except Exception as exc:
        state.last_error = f"chatbot: {exc}"
        logger.exception("Failed to warm chatbot service")

    try:
        forecasting_service = get_forecasting_service()
        if forecasting_service is None:
            state.last_error = state.last_error or "forecasting: optional dependencies unavailable"
        else:
            forecasting_service.warmup()
            state.forecasting_ready = forecasting_service.is_ready
            state.forecast_bundle_ready = (
                forecasting_service.bundle_status == "complete"
            )
            state.forecast_bundle_status = forecasting_service.bundle_status
            state.loaded_routes = forecasting_service.loaded_routes
            state.model_version = forecasting_service.artifact_version
            state.classifier_ready = forecasting_service.classifier_loaded
    except Exception as exc:
        state.last_error = f"forecasting: {exc}"
        logger.exception("Failed to warm forecasting service")

    state.database_ready = await probe_database()
    _runtime_state = state
    return state


def get_runtime_state() -> RuntimeReadiness:
    """Return the latest cached runtime readiness snapshot."""

    return _runtime_state


def reload_forecasting_service() -> ForecastingService | None:
    """Reset the forecasting singleton and re-initialize from disk.

    Called after a successful model promotion so the live service picks up
    the new champion artifacts without requiring a server restart.
    """

    global _forecasting_service, _runtime_state

    logger.info("Hot-reloading ForecastingService from disk...")
    _forecasting_service = None  # clear singleton

    service = get_forecasting_service()  # re-initialize
    if service is not None:
        service.warmup()
        _runtime_state.forecasting_ready = service.is_ready
        _runtime_state.forecast_bundle_ready = service.bundle_status == "complete"
        _runtime_state.forecast_bundle_status = service.bundle_status
        _runtime_state.loaded_routes = service.loaded_routes
        _runtime_state.model_version = service.artifact_version
        _runtime_state.classifier_ready = service.classifier_loaded
        logger.info(
            "ForecastingService reloaded — version=%s routes=%s",
            service.artifact_version,
            service.loaded_routes,
        )
    return service


def runtime_snapshot() -> dict[str, object]:
    """Return the readiness state as a JSON-serializable dictionary."""

    snapshot = asdict(get_runtime_state())
    snapshot["ready"] = get_runtime_state().ready
    snapshot["initialized_at"] = (
        get_runtime_state().initialized_at.isoformat()
        if get_runtime_state().initialized_at
        else None
    )
    return snapshot
