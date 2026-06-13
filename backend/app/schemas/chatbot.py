"""Chatbot schemas — request/response models for the multilingual chatbot API."""

from __future__ import annotations

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


class ChatbotResponse(BaseModel):
    """Response body from the chatbot."""

    response_text: str = Field(..., description="Chatbot's reply in the user's language")
    detected_language: str = Field(..., description="Detected ISO 639-1 language code")
    language_confidence: float | None = Field(
        None, ge=0.0, le=1.0,
        description="Confidence score for the detected language (0-1)",
    )
    intent: str = Field(
        ...,
        description="Classified intent (check_booking, request_requeue, get_departure_info, surge_info, fallback)",
    )
    suggested_actions: list[str] = Field(
        default_factory=list,
        description="Suggested follow-up actions the user can take",
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
