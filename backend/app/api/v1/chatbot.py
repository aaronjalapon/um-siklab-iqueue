"""Chatbot route handlers — multilingual passenger support."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.schemas.chatbot import ChatbotRequest, ChatbotResponse

router = APIRouter()


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

    The chatbot supports:
    - check_booking: Look up booking status by ID or phone
    - request_requeue: Initiate rebooking for missed buses
    - get_departure_info: Query bus schedule
    - surge_info: Ask about crowd levels
    - fallback: Polite response in the detected language

    Language is auto-detected if not provided (supports fil, id, vi, en).
    """
    # Try to use the chatbot service
    try:
        from app.services.chatbot.bot import ChatbotService
        service = ChatbotService()
        return await service.respond(
            query=payload.query,
            language=payload.language,
            booking_id=payload.booking_id,
            db=db,
        )
    except ImportError:
        # Fallback stub response
        return ChatbotResponse(
            response_text="Chatbot service is being set up. Please try again soon!",
            detected_language=payload.language or "en",
            intent="fallback",
            suggested_actions=["Try searching for a bus route", "Check booking status"],
            confidence=0.5,
        )
