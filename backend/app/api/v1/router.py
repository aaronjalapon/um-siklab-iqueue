"""Aggregate all v1 API routers for inclusion in the FastAPI app."""

from fastapi import APIRouter

from app.api.v1 import bookings, buses, chatbot, forecasts, seats

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
    seats.router,
    tags=["seats"],
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
