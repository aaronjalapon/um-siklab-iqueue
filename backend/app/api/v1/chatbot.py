"""Chatbot route handlers — multilingual passenger support.

Exposes:
  POST /api/v1/chatbot/session  — create a new chat session
  POST /api/v1/chatbot/message  — send a message with optional session context
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.schemas.chatbot import (
    ChatbotRequest,
    ChatbotResponse,
    SessionCreateResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Greeting templates per language (used for new sessions)
# ---------------------------------------------------------------------------

GREETINGS: dict[str, str] = {
    "en": "Hi! I'm the IQueue assistant. I can help you check your booking, find departure info, see surge crowd levels, or rebook a missed bus. How can I help?",
    "fil": "Kumusta! Ako ang IQueue assistant. Matutulungan kitang tingnan ang iyong booking, alamin ang oras ng alis, makita ang surge crowd levels, o mag-rebook ng na-miss na bus. Paano ako makakatulong?",
    "id": "Halo! Saya asisten IQueue. Saya bisa membantu Anda memeriksa pemesanan, mencari info keberangkatan, melihat tingkat keramaian, atau memesan ulang bus yang terlewat. Ada yang bisa saya bantu?",
    "vi": "Xin chào! Tôi là trợ lý IQueue. Tôi có thể giúp bạn kiểm tra đặt vé, tìm thông tin khởi hành, xem mức độ đông đúc, hoặc đặt lại vé đã lỡ. Tôi có thể giúp gì?",
}

# ---------------------------------------------------------------------------
# Route: Create session
# ---------------------------------------------------------------------------


@router.post(
    "/session",
    response_model=SessionCreateResponse,
    summary="Create a new chat session",
)
async def create_chat_session(
    language: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> SessionCreateResponse:
    """Create a new chat session and return the session ID with a greeting.

    The greeting language can be specified or auto-detected from the
    Accept-Language header (handled client-side by passing the language param).
    """
    from app.services.chatbot.session import SessionManager

    lang = language or "en"
    if lang not in ("en", "fil", "id", "vi"):
        lang = "en"

    session = await SessionManager.create_session(db, language=lang)
    greeting = GREETINGS.get(lang, GREETINGS["en"])

    # Record the greeting as a bot message
    await SessionManager.add_message(
        db,
        session_id=session.id,
        role="bot",
        content=greeting,
        intent="greeting",
        metadata={"language": lang},
    )

    return SessionCreateResponse(
        session_id=session.id,
        greeting=greeting,
        language=lang,
    )


# ---------------------------------------------------------------------------
# Route: Send message
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

    Pass a session_id to enable multi-turn conversation with memory.
    Language is auto-detected via heuristics + langdetect if not provided
    (supports fil, id, vi, en).
    """
    from app.services.chatbot.bot import get_chatbot_service
    from app.services.chatbot.session import SessionManager

    service = get_chatbot_service()

    # --- Session handling ---
    session_id = payload.session_id
    session = None

    if session_id and service is not None:
        try:
            session = await SessionManager.get_session(db, session_id)
        except Exception:
            logger.warning("Failed to load session %s", session_id)

    # If session not found, create a new one
    if service is not None and session is None:
        try:
            detected_lang = payload.language or "en"
            session = await SessionManager.create_session(
                db, language=detected_lang,
            )
            session_id = session.id
        except Exception:
            logger.exception("Failed to create session")

    # --- Check for active rebooking flow ---
    if session and service is not None:
        try:
            session_ctx = await SessionManager.get_context(db, session.id)
            if session_ctx.get("flow") == "rebooking" and session_ctx.get("step") not in (None, "cancelled", "complete"):
                # Continue the rebooking flow
                from app.services.chatbot.actions import RebookingFlow

                result = await RebookingFlow.process_turn(
                    db=db,
                    session_id=session.id,
                    query=payload.query,
                    language=session_ctx.get("language", "en"),
                    flow_state=session_ctx,
                )

                # Record user message
                await SessionManager.add_message(
                    db, session_id=session.id,
                    role="user", content=payload.query,
                    intent="request_requeue",
                    metadata=result.get("flow_metadata"),
                )
                # Record bot response
                await SessionManager.add_message(
                    db, session_id=session.id,
                    role="bot", content=result["response_text"],
                    intent="request_requeue",
                    metadata=result.get("flow_metadata"),
                )

                return ChatbotResponse(
                    response_text=result["response_text"],
                    detected_language=session_ctx.get("language", "en"),
                    language_confidence=0.9,
                    intent="request_requeue",
                    suggested_actions=["Continue rebooking"] if not result.get("is_complete") else ["View QR code", "Check boarding time"],
                    confidence=0.85,
                    session_id=session.id,
                    degradation_level=0,
                )
        except Exception:
            logger.exception("Rebooking flow failed — falling back to normal chatbot")

    # --- Normal chatbot path ---
    if service is not None:
        try:
            response, session_metadata, degradation = await service.respond(
                query=payload.query,
                language=payload.language,
                booking_id=payload.booking_id,
                db=db,
                session_id=session_id,
                phone=payload.phone,
            )

            # Record messages to session
            if session:
                try:
                    # Record user message
                    await SessionManager.add_message(
                        db, session_id=session.id,
                        role="user", content=payload.query,
                        intent=response.intent,
                        metadata=session_metadata.get("entities", {}),
                    )
                    # Record bot response
                    await SessionManager.add_message(
                        db, session_id=session.id,
                        role="bot", content=response.response_text,
                        intent=response.intent,
                        metadata=session_metadata,
                    )
                except Exception:
                    logger.exception("Failed to record messages to session")

            # Set session_id on response
            response.session_id = session.id if session else None
            return response

        except Exception:
            logger.exception("Chatbot service error — using hardcoded fallback")

    # --- Total degradation (level 4) ---
    # Even the singleton failed — return a minimal fallback
    return ChatbotResponse(
        response_text=(
            "I'm sorry, I'm having trouble right now. Please try again later "
            "or contact the terminal staff for assistance."
        ),
        detected_language=payload.language or "en",
        language_confidence=0.40,
        intent="fallback",
        suggested_actions=["Contact Support", "Try Again"],
        confidence=0.0,
        session_id=session_id,
        degradation_level=4,
    )
