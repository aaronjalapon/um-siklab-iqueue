# =============================================================================
# IQueue — Unified Azure App Service Dockerfile
# Runs the backend API plus both ML models in one container.
# =============================================================================

FROM python:3.14-slim-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --prefix=/install -r backend/requirements.txt

FROM python:3.14-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    WEBSITES_PORT=8000 \
    PYTHONPATH=/app/backend:/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local

COPY backend ./backend
COPY data ./data
COPY deployments/xlm-roberta-iqueue ./backend/app/services/chatbot/artifacts/xlm-roberta-iqueue

RUN useradd --create-home --shell /bin/bash app && chown -R app:app /app
USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/v1/health/readiness || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]