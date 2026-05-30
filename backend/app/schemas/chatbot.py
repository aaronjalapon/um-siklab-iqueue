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


class ChatbotResponse(BaseModel):
    """Response body from the chatbot."""

    response_text: str = Field(..., description="Chatbot's reply in the user's language")
    detected_language: str = Field(..., description="Detected ISO 639-1 language code")
    intent: str = Field(..., description="Classified intent (check_booking, request_requeue, get_departure_info, surge_info, fallback)")
    suggested_actions: list[str] = Field(
        default_factory=list,
        description="Suggested follow-up actions the user can take",
    )
    confidence: float = Field(
        0.0, ge=0.0, le=1.0, description="Confidence score for the detected intent"
    )
