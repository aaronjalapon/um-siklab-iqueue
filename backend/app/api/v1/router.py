"""Aggregate all v1 API routers for inclusion in the FastAPI app."""

from fastapi import APIRouter

from app.api.v1 import (
    bookings,
    boarding,
    buses,
    chatbot,
    demo,
    evidence,
    forecast_actions,
    forecasts,
    health,
    model_admin,
    operations,
    passengers,
    seats,
)

api_router = APIRouter()

api_router.include_router(
    bookings.router,
    prefix="/bookings",
    tags=["bookings"],
)
api_router.include_router(
    boarding.router,
    prefix="/boarding",
    tags=["boarding"],
)
api_router.include_router(
    buses.router,
    prefix="/buses",
    tags=["buses"],
)
api_router.include_router(
    forecasts.router,
    prefix="/forecasts",
    tags=["forecasts"],
)
api_router.include_router(
    model_admin.router,
    prefix="/forecasts/model",
    tags=["model-admin"],
)
api_router.include_router(
    forecast_actions.router,
    prefix="/forecast-actions",
    tags=["forecast-actions"],
)
api_router.include_router(
    operations.router,
    prefix="/operations",
    tags=["operations"],
)
api_router.include_router(
    chatbot.router,
    prefix="/chatbot",
    tags=["chatbot"],
)
api_router.include_router(
    evidence.router,
    prefix="/evidence",
    tags=["evidence"],
)
api_router.include_router(
    demo.router,
    prefix="/demo",
    tags=["demo"],
)
api_router.include_router(
    seats.router,
    tags=["seats"],
)
api_router.include_router(
    passengers.router,
    prefix="/passengers",
    tags=["passengers"],
)
api_router.include_router(
    health.router,
    prefix="/health",
    tags=["health"],
)

# Health check endpoint at the v1 level
@api_router.get("/health")
async def health_check():
    """Health check endpoint — returns API status."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "service": "iqueue-api",
    }
