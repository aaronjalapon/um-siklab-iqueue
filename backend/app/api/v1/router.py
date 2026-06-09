"""Aggregate all v1 API routers for inclusion in the FastAPI app."""

from fastapi import APIRouter

from app.api.v1 import bookings, buses, chatbot, forecasts, health

api_router = APIRouter()

api_router.include_router(
    bookings.router,
    prefix="/bookings",
    tags=["bookings"],
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
    chatbot.router,
    prefix="/chatbot",
    tags=["chatbot"],
)
api_router.include_router(
    health.router,
    prefix="/health",
    tags=["health"],
)
