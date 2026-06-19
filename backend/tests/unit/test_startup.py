"""Unit tests for startup readiness with optional ML dependencies."""

from __future__ import annotations

import pytest


class DummyChatbotService:
    """Minimal chatbot stand-in for readiness checks."""

    _model_available = False


class DummyForecastingService:
    """Minimal forecasting stand-in for readiness checks."""

    def __init__(self) -> None:
        self.warmed = False
        self.is_ready = True

    def warmup(self) -> None:
        self.warmed = True


@pytest.mark.asyncio
async def test_warm_application_handles_missing_forecasting_deps(monkeypatch):
    """Startup should degrade gracefully when optional ML deps are absent."""
    from app.core import startup

    startup._forecasting_service = None

    def fake_import(name: str):
        if name == "app.services.chatbot.bot":
            return type(
                "ChatbotModule",
                (),
                {"get_chatbot_service": staticmethod(lambda: DummyChatbotService())},
            )
        if name == "app.services.forecasting.predictor":
            raise ImportError("torch is not installed")
        raise AssertionError(f"Unexpected import: {name}")

    monkeypatch.setattr(startup.importlib, "import_module", fake_import)

    async def fake_probe_database() -> bool:
        return True

    monkeypatch.setattr(startup, "probe_database", fake_probe_database)

    state = await startup.warm_application()

    assert state.database_ready is True
    assert state.chatbot_ready is False
    assert state.forecasting_ready is False
    assert state.ready is False
    assert state.last_error == "forecasting: optional dependencies unavailable"


@pytest.mark.asyncio
async def test_warm_application_marks_forecasting_ready_when_available(monkeypatch):
    """Startup should warm forecasting when the optional module is available."""
    from app.core import startup

    startup._forecasting_service = None
    dummy_service = DummyForecastingService()

    def fake_import(name: str):
        if name == "app.services.chatbot.bot":
            return type(
                "ChatbotModule",
                (),
                {"get_chatbot_service": staticmethod(lambda: DummyChatbotService())},
            )
        if name == "app.services.forecasting.predictor":
            return type(
                "ForecastingModule",
                (),
                {"ForecastingService": lambda: dummy_service},
            )
        raise AssertionError(f"Unexpected import: {name}")

    monkeypatch.setattr(startup.importlib, "import_module", fake_import)

    async def fake_probe_database() -> bool:
        return True

    monkeypatch.setattr(startup, "probe_database", fake_probe_database)

    state = await startup.warm_application()

    assert dummy_service.warmed is True
    assert state.database_ready is True
    assert state.forecasting_ready is True
