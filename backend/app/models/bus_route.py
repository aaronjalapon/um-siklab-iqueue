"""BusRoute model — an inter-provincial bus route operated by a tenant."""

import uuid

from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BusRoute(Base):
    """A scheduled bus route between two cities operated by a tenant.

    Routes are tenant-scoped. Each route can have multiple buses assigned,
    multiple bookings, and surge forecasts.
    """

    __tablename__ = "bus_routes"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    origin: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    destination: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="bus_routes")
    buses: Mapped[list["Bus"]] = relationship(
        "Bus", back_populates="route", cascade="all, delete-orphan"
    )
    forecasts: Mapped[list["SurgeForecast"]] = relationship(
        "SurgeForecast", back_populates="route", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<BusRoute(id={self.id!s}, "
            f"'{self.origin}' → '{self.destination}', "
            f"{self.distance_km:.0f}km)>"
        )
