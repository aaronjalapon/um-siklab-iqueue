"""Application startup and readiness helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import logging

from app.db.session import probe_database as probe_database_session
from app.services.chatbot.bot import get_chatbot_service
from app.services.forecasting.predictor import ForecastingService

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class RuntimeReadiness:
    """Aggregated runtime readiness state for the backend."""

    chatbot_ready: bool = False
    forecasting_ready: bool = False
    database_ready: bool = False
    initialized_at: datetime | None = None
    last_error: str | None = None

    @property
    def ready(self) -> bool:
        """Return True when the core runtime dependencies are available."""

        return self.chatbot_ready and self.forecasting_ready and self.database_ready


_forecasting_service: ForecastingService | None = None
_runtime_state = RuntimeReadiness()


def get_forecasting_service() -> ForecastingService:
    """Return the singleton forecasting service instance."""

    global _forecasting_service
    if _forecasting_service is None:
        _forecasting_service = ForecastingService()
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
        chatbot_service = get_chatbot_service()
        state.chatbot_ready = bool(chatbot_service and chatbot_service._model_available)
    except Exception as exc:
        state.last_error = f"chatbot: {exc}"
        logger.exception("Failed to warm chatbot service")

    try:
        forecasting_service = get_forecasting_service()
        forecasting_service.warmup()
        state.forecasting_ready = forecasting_service.is_ready
    except Exception as exc:
        state.last_error = f"forecasting: {exc}"
        logger.exception("Failed to warm forecasting service")

    state.database_ready = await probe_database()
    _runtime_state = state
    return state


def get_runtime_state() -> RuntimeReadiness:
    """Return the latest cached runtime readiness snapshot."""

    return _runtime_state


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