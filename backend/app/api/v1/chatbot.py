"""Chatbot route handlers — multilingual passenger support.

Exposes POST /api/v1/chatbot/message for the XLM-RoBERTa powered
multilingual intent classifier.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.schemas.chatbot import ChatbotRequest, ChatbotResponse

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Response templates per intent (used when the service is unavailable)
# ---------------------------------------------------------------------------

RESPONSE_TEMPLATES: dict[str, str] = {
    "check_booking": (
        "Let me look up your booking. Please provide your booking ID or phone number."
    ),
    "request_requeue": (
        "I can help you rebook. Please share your original booking reference."
    ),
    "get_departure_info": (
        "Which route and date are you checking? I'll pull the schedule."
    ),
    "surge_info": (
        "Passenger volumes are forecast to be high during that period. "
        "Would you like to see the 7-day forecast?"
    ),
    "fallback": (
        "I didn't quite catch that. You can ask about your booking, "
        "departure times, or rebooking."
    ),
}

ACTIONS: dict[str, list[str]] = {
    "check_booking": ["Provide Booking ID", "Search by Phone"],
    "request_requeue": ["Start Rebooking", "View Available Buses"],
    "get_departure_info": ["Show Schedule", "Book Now"],
    "surge_info": ["View Forecast", "Book Early"],
    "fallback": ["Check Booking", "View Schedule", "Contact Support"],
}


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------


@router.post(
    "/message",
    response_model=ChatbotResponse,
    summary="Send a message to the multilingual chatbot",
)
async def chatbot_message(
    payload: ChatbotRequest,
    db: AsyncSession = Depends(get_db),
) -> ChatbotResponse:
    """Process a user query and return a chatbot response.

    The chatbot supports 5 intents across 4 ASEAN languages:
    - **check_booking** — Look up booking status by ID or phone
    - **request_requeue** — Initiate rebooking for missed buses
    - **get_departure_info** — Query bus schedule and departure times
    - **surge_info** — Ask about crowd levels and surge forecasts
    - **fallback** — Polite response in the detected language

    Language is auto-detected via `langdetect` if not provided
    (supports fil, id, vi, en).
    """
    try:
        from app.services.chatbot.bot import get_chatbot_service

        service = get_chatbot_service()

        if service is not None:
            return await service.respond(
                query=payload.query,
                language=payload.language,
                booking_id=payload.booking_id,
                db=db,
            )
        else:
            raise RuntimeError("ChatbotService failed to initialise")

    except Exception:
        logger.exception("Chatbot service unavailable")

        # Graceful degradation — return a stub response
        fallback_intent = "fallback"
        return ChatbotResponse(
            response_text=RESPONSE_TEMPLATES.get(
                fallback_intent, RESPONSE_TEMPLATES["fallback"]
            ),
            detected_language=payload.language or "en",
            intent=fallback_intent,
            suggested_actions=ACTIONS.get(fallback_intent, []),
            confidence=0.0,
        )
