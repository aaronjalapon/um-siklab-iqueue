"""Seat and SeatReservation models for the seat assignment engine."""

import enum

from sqlalchemy import Boolean, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SeatType(str, enum.Enum):
    """The type of a seat based on its position in the row."""
    WINDOW = "window"
    AISLE = "aisle"
    MIDDLE = "middle"


class SeatStatus(str, enum.Enum):
    """Possible states for a seat."""
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    BLOCKED = "blocked"


class Seat(Base):
    """One physical seat on a specific bus.

    Seats are generated from BusLayout when a bus is registered.
    Each seat has a label like '3B', a row/col position, and type info.
    """

    __tablename__ = "seats"

    bus_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("buses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seat_label: Mapped[str] = mapped_column(
        String(10), nullable=False, comment="e.g. '3B'"
    )
    row_number: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="1-indexed row number"
    )
    col_number: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="1-indexed column number"
    )
    seat_type: Mapped[SeatType] = mapped_column(
        Enum(SeatType, name="seat_type"),
        nullable=False,
    )
    is_near_exit: Mapped[bool] = mapped_column(Boolean, default=False)
    is_accessibility: Mapped[bool] = mapped_column(Boolean, default=False)
    side: Mapped[str] = mapped_column(
        String(10), nullable=False, comment="'left' or 'right'"
    )
    status: Mapped[SeatStatus] = mapped_column(
        Enum(SeatStatus, name="seat_status"),
        nullable=False,
        default=SeatStatus.AVAILABLE,
    )
    affinity_score: Mapped[float | None] = mapped_column(
        Float, nullable=True,
        comment="Computed at assignment time for dashboard display"
    )

    # Relationships
    bus: Mapped["Bus"] = relationship("Bus", back_populates="seats")
    reservation: Mapped["SeatReservation | None"] = relationship(
        "SeatReservation", back_populates="seat", uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<Seat(id={self.id!s}, label='{self.seat_label}', "
            f"type='{self.seat_type.value}', status='{self.status.value}')>"
        )


class SeatReservation(Base):
    """Links a Seat to a Booking. One-to-one per trip.

    Stores the passenger's preferences and computed affinity score
    so operators can view them in the dashboard.
    """

    __tablename__ = "seat_reservations"

    seat_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("seats.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    booking_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    passenger_name: Mapped[str] = mapped_column(String(255), nullable=False)
    group_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    language_preference: Mapped[str | None] = mapped_column(
        String(10), nullable=True
    )
    travel_habit: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="business, leisure, student, family"
    )
    lifestyle_interest: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="Comma-separated interests"
    )
    needs_accessibility: Mapped[bool] = mapped_column(Boolean, default=False)
    preferred_seat_type: Mapped[str | None] = mapped_column(
        String(10), nullable=True, comment="window, aisle, or None"
    )
    preferred_side: Mapped[str | None] = mapped_column(
        String(10), nullable=True, comment="left, right, or None"
    )
    computed_affinity_score: Mapped[float] = mapped_column(Float, default=0.0)
    boarding_window: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="HH:MM–HH:MM format"
    )

    # Relationships
    seat: Mapped["Seat"] = relationship("Seat", back_populates="reservation")
    booking: Mapped["Booking"] = relationship(
        "Booking", back_populates="seat_reservation", uselist=False
    )

    def __repr__(self) -> str:
        return (
            f"<SeatReservation(id={self.id!s}, seat='{self.seat_id!s}', "
            f"passenger='{self.passenger_name}')>"
        )
