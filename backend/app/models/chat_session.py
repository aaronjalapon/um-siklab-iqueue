"""Chat session and message models for multi-turn chatbot conversations.

A ChatSession tracks a single conversation from first message to expiry.
ChatMessages store each exchange with extracted entities for context-aware
follow-up responses.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ChatSession(Base):
    """A single chatbot conversation session.

    Optionally linked to a passenger for personalised booking lookups.
    Sessions auto-expire 24 hours after creation.
    """

    __tablename__ = "chat_sessions"

    passenger_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("passengers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    language: Mapped[str] = mapped_column(
        String(10), nullable=False, default="en",
        comment="ISO 639-1 language code detected at session start",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(hour=23, minute=59, second=59)
        + __import__("datetime").timedelta(days=1),
        comment="Session expiry — default 24h from creation",
    )

    # Relationships
    passenger: Mapped["Passenger | None"] = relationship(
        "Passenger", back_populates="chat_sessions"
    )
    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )

    def __repr__(self) -> str:
        return (
            f"<ChatSession(id={self.id!s}, lang='{self.language}', "
            f"msgs={len(self.messages) if self.messages else 0})>"
        )


class ChatMessage(Base):
    """A single message within a chat session.

    Stores the raw text, classified intent, and structured metadata
    (extracted entities, flow state) used for multi-turn context.
    """

    __tablename__ = "chat_messages"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        String(10), nullable=False,
        comment="user | bot | system",
    )
    content: Mapped[str] = mapped_column(
        Text, nullable=False,
    )
    intent: Mapped[str | None] = mapped_column(
        String(50), nullable=True,
        comment="Classified intent for user messages",
    )
    metadata_: Mapped[dict | None] = mapped_column(
        "metadata", JSON, nullable=True,
        comment="Extracted entities, flow state, degradation flags",
    )

    # Relationships
    session: Mapped["ChatSession"] = relationship(
        "ChatSession", back_populates="messages"
    )

    def __repr__(self) -> str:
        preview = self.content[:50] + "…" if len(self.content) > 50 else self.content
        return (
            f"<ChatMessage(role='{self.role}', intent='{self.intent}', "
            f"content='{preview}')>"
        )
