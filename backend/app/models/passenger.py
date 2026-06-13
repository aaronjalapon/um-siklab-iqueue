"""Passenger model — a person who books bus trips."""

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Passenger(Base):
    """A passenger who books trips through the platform.

    Passengers are tenant-scoped. Their profile includes language preference,
    travel habits, and optional lifestyle interests used for seat affinity scoring.
    """

    __tablename__ = "passengers"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    language_pref: Mapped[str] = mapped_column(
        String(10), nullable=False, default="en", comment="ISO 639-1 language code"
    )
    travel_habits: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="e.g. business, leisure, student, family"
    )
    lifestyle_interests: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Comma-separated interests for affinity matching"
    )
    accessibility_needs: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="passengers")
    bookings: Mapped[list["Booking"]] = relationship(
        "Booking", back_populates="passenger", cascade="all, delete-orphan"
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        "ChatSession", back_populates="passenger", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<Passenger(id={self.id!s}, name='{self.name}', "
            f"lang='{self.language_pref}')>"
        )
