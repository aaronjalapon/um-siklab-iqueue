"""FastAPI application factory for IQueue.

Creates and configures the FastAPI app with CORS, lifespan handlers,
and all v1 API routers.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.startup import warm_application
from app.db.session import dispose_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler.

    Startup: preload model services and cache readiness state
    Shutdown: dispose the async SQLAlchemy engine
    """
    app.state.runtime_status = await warm_application()
    yield
    await dispose_engine()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns:
        Configured FastAPI app instance ready to serve requests.
    """
    settings = get_settings()

    app = FastAPI(
        title="IQueue API",
        description="AI-powered smart boarding platform for ASEAN bus terminals",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins if not settings.DEBUG else ["*"],
        allow_origin_regex=(
            r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$"
            if settings.DEBUG
            else None
        ),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount v1 routers under /api/v1
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return app


# Singleton app instance for uvicorn
app = create_app()
