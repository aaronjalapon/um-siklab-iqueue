"""Application configuration loaded from environment variables.

Uses pydantic-settings for typed, validated settings from `.env` and environment.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings loaded from .env file and environment variables.

    All values have sensible defaults for local development. Production
    deployments should override via environment variables.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/iqueue"

    # --- QR Signing ---
    QR_HMAC_SECRET: str = "dev-secret-change-in-production"

    # --- ML Model Paths ---
    PROPHET_MODEL_PATH: str = str(
        Path(__file__).resolve().parents[2]
        / "app/services/forecasting/artifacts/prophet_model.pkl"
    )
    LSTM_MODEL_PATH: str = str(
        Path(__file__).resolve().parents[2]
        / "app/services/forecasting/artifacts/lstm_model.pt"
    )

    # --- Chatbot ---
    HUGGINGFACE_API_TOKEN: str | None = None

    # --- Application ---
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # --- API ---
    API_V1_PREFIX: str = "/api/v1"

    # --- Server ---
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def cors_origins(self) -> list[str]:
        """Parse ALLOWED_ORIGINS into a list for CORS middleware."""
        return self.ALLOWED_ORIGINS


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings singleton.

    Uses lru_cache to avoid re-reading .env on every call — the first
    invocation parses the file and all subsequent calls return the cached object.
    """
    return Settings()
