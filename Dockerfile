# syntax=docker/dockerfile:1

# Unified Azure runtime: API, CPU-only forecasting, and multilingual chatbot.
FROM python:3.14-slim-bookworm AS builder

ENV VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && python -m venv "$VIRTUAL_ENV"

COPY backend/requirements.base.txt backend/requirements.ml.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.base.txt \
    && pip install --no-cache-dir \
       --index-url https://download.pytorch.org/whl/cpu \
       torch==2.12.0+cpu \
    && pip install --no-cache-dir -r backend/requirements.ml.txt

FROM python:3.14-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    WEBSITES_PORT=8000 \
    PYTHONPATH=/app/backend:/app \
    VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH \
    FORECASTING_ARTIFACTS_DIR=/app/backend/app/services/forecasting/artifacts \
    CHATBOT_MODEL_PATH=/app/backend/app/services/chatbot/artifacts/xlm-roberta-iqueue

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash app

COPY --from=builder /opt/venv /opt/venv
COPY --chown=app:app backend ./backend
COPY --chown=app:app evidence ./evidence
COPY --chown=app:app scripts/validate_forecast_bundle.py ./scripts/validate_forecast_bundle.py
COPY --chown=app:app iqueue_artifacts/artifacts ./backend/app/services/forecasting/artifacts
COPY --chown=app:app deployments/xlm-roberta-iqueue ./backend/app/services/chatbot/artifacts/xlm-roberta-iqueue

RUN python scripts/validate_forecast_bundle.py \
      --artifacts backend/app/services/forecasting/artifacts

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/v1/health/readiness || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
