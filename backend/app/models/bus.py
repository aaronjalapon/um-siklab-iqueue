"""Bus model — a specific vehicle operating on a route."""

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Bus(Base):
    """A bus vehicle assigned to a route and tenant.

    Each bus has a fixed capacity (seats) and is identified by its plate number.
    Bookings are made against specific buses for specific departure dates.
    """

    __tablename__ = "buses"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    route_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("bus_routes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    plate_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="buses")
    route: Mapped["BusRoute"] = relationship("BusRoute", back_populates="buses")
    bookings: Mapped[list["Booking"]] = relationship(
        "Booking", back_populates="bus", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<Bus(id={self.id!s}, plate='{self.plate_number}', "
            f"capacity={self.capacity})>"
        )
