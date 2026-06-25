"""Chatbot schemas — request/response models for the multilingual chatbot API."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ChatbotRequest(BaseModel):
    """Request body for a chatbot query."""

    query: str = Field(..., min_length=1, max_length=500, description="User's question")
    language: str | None = Field(
        None,
        description="ISO 639-1 language code (auto-detected if omitted)",
    )
    booking_id: UUID | None = Field(
        None, description="Optional booking context for personalized responses"
    )
    session_id: UUID | None = Field(
        None, description="Chat session ID for multi-turn conversations"
    )
    phone: str | None = Field(
        None, description="Phone number for booking lookup via passenger record"
    )


class ChatbotAction(BaseModel):
    """Structured action a frontend can execute without guessing intent."""

    id: str = Field(..., description="Stable action identifier")
    label: str = Field(..., description="Passenger-facing button label")
    kind: Literal[
        "send_message",
        "prefill_route_search",
        "open_booking",
        "open_qr",
        "handoff",
    ] = Field(..., description="Action execution type")
    payload: dict[str, Any] = Field(
        default_factory=dict,
        description="Action-specific data such as route, date, or booking_id",
    )


class ChatbotResponse(BaseModel):
    """Response body from the chatbot."""

    response_text: str = Field(..., description="Chatbot's reply in the user's language")
    detected_language: str = Field(..., description="Detected ISO 639-1 language code")
    language_confidence: float | None = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Confidence score for the detected language (0-1)",
    )
    intent: str = Field(
        ...,
        description="Classified intent (greeting, check_booking, request_requeue, get_departure_info, surge_info, fallback)",
    )
    suggested_actions: list[str] = Field(
        default_factory=list,
        description="Suggested follow-up actions the user can take",
    )
    actions: list[ChatbotAction] = Field(
        default_factory=list,
        description="Structured actions the UI can execute directly",
    )
    confidence: float = Field(
        0.0, ge=0.0, le=1.0, description="Confidence score for the detected intent"
    )
    session_id: UUID | None = Field(
        None, description="Chat session ID for continuing multi-turn conversations"
    )
    degradation_level: int = Field(
        0, ge=0, le=4,
        description="Degradation level: 0=full service, 4=total fallback",
    )


class SessionCreateResponse(BaseModel):
    """Response for creating a new chat session."""

    session_id: UUID = Field(..., description="The newly created session ID")
    greeting: str = Field(..., description="Initial greeting in the session's language")
    language: str = Field(..., description="ISO 639-1 language code for the session")
