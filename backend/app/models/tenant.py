"""Tenant model — represents a bus operator or terminal authority."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Tenant(Base):
    """A bus operator or terminal authority with isolated data schema.

    Each tenant represents a separate bus company or terminal operator.
    All other models are scoped to a tenant_id for multi-tenant isolation.
    """

    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    country: Mapped[str] = mapped_column(
        String(2), nullable=False, comment="ISO 3166-1 alpha-2 country code"
    )

    # Relationships
    bus_routes: Mapped[list["BusRoute"]] = relationship(
        "BusRoute", back_populates="tenant", cascade="all, delete-orphan"
    )
    buses: Mapped[list["Bus"]] = relationship(
        "Bus", back_populates="tenant", cascade="all, delete-orphan"
    )
    passengers: Mapped[list["Passenger"]] = relationship(
        "Passenger", back_populates="tenant", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Tenant(id={self.id!s}, name='{self.name}', country='{self.country}')>"
