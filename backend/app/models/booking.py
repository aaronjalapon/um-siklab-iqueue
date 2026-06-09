"""Booking model — a seat reservation on a specific bus."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BookingStatus(str, enum.Enum):
    """Possible states for a booking."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    BOARDED = "boarded"
    MISSED = "missed"
    CANCELLED = "cancelled"


class Booking(Base):
    """A seat booking on a specific bus for a specific departure date.

    Each booking assigns a seat number, boarding window, and generates a
    signed QR token for offline gate scanning.
    """

    __tablename__ = "bookings"

    passenger_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("passengers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("buses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    seat_number: Mapped[str] = mapped_column(
        String(10), nullable=False, comment="e.g. '12A', '3B'"
    )
    boarding_window_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    boarding_window_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status"),
        nullable=False,
        default=BookingStatus.CONFIRMED,
    )
    qr_token: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="HMAC-SHA256 signed boarding pass token"
    )
    departure_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    # Relationships
    passenger: Mapped["Passenger"] = relationship("Passenger", back_populates="bookings")
    bus: Mapped["Bus"] = relationship("Bus", back_populates="bookings")
    seat_reservation: Mapped["SeatReservation | None"] = relationship(
        "SeatReservation", back_populates="booking", uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<Booking(id={self.id!s}, passenger='{self.passenger_id!s}', "
            f"bus='{self.bus_id!s}', seat='{self.seat_number}', "
            f"status='{self.status.value}')>"
        )
