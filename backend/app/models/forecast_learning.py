"""Forecast learning models for human-in-the-loop improvement."""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ForecastAction(str, enum.Enum):
    """Operator decision for an AI forecast recommendation."""

    ACCEPTED = "accepted"
    MODIFIED = "modified"
    REJECTED = "rejected"


class ForecastSnapshot(Base):
    """A forecast shown to an operator for one route-day.

    Snapshots freeze the model output at decision time so later outcomes can
    be joined into ground-truth training rows without guessing what the AI
    recommended historically.
    """

    __tablename__ = "forecast_snapshots"

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
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    predicted_volume: Mapped[int] = mapped_column(Integer, nullable=False)
    surge_probability: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)
    recommended_action: Mapped[str] = mapped_column(String(255), nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model_source: Mapped[str] = mapped_column(String(40), nullable=False, default="heuristic")
    model_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_lower: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence_upper: Mapped[int | None] = mapped_column(Integer, nullable=True)
    input_features: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    route: Mapped["BusRoute"] = relationship("BusRoute")
    overrides: Mapped[list["OperatorOverride"]] = relationship(
        "OperatorOverride", back_populates="snapshot", cascade="all, delete-orphan"
    )


class OperatorOverride(Base):
    """Operator action taken in response to a forecast recommendation."""

    __tablename__ = "operator_overrides"

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
    forecast_snapshot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("forecast_snapshots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action_taken: Mapped[ForecastAction] = mapped_column(
        Enum(ForecastAction, name="forecast_action"),
        nullable=False,
    )
    override_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    override_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    operator_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    final_action: Mapped[str | None] = mapped_column(String(255), nullable=True)

    snapshot: Mapped[ForecastSnapshot] = relationship(
        "ForecastSnapshot", back_populates="overrides"
    )


class OperationalOutcome(Base):
    """Actual route-day operations used as model ground truth."""

    __tablename__ = "operational_outcomes"

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
    service_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    actual_passenger_count: Mapped[int] = mapped_column(Integer, nullable=False)
    peak_queue_length: Mapped[int | None] = mapped_column(Integer, nullable=True)
    average_wait_time_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)
    wait_time_p95_minutes: Mapped[float | None] = mapped_column(Float, nullable=True)
    extra_buses_dispatched: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lanes_opened: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    missed_boardings: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    overcrowding_incident: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    recorded_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    route: Mapped["BusRoute"] = relationship("BusRoute")
