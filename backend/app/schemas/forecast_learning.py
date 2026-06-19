"""Schemas for forecast feedback and operational outcomes."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class ForecastActionCreate(BaseModel):
    """Operator decision for one forecast snapshot."""

    tenant_id: UUID
    forecast_snapshot_id: UUID
    action_taken: str = Field(..., pattern="^(accepted|modified|rejected)$")
    override_type: str | None = Field(
        None, max_length=50, description="Reason category for modified/rejected actions"
    )
    override_reason: str | None = Field(None, max_length=255)
    notes: str | None = None
    operator_id: str | None = Field(default="demo-admin", max_length=100)
    final_action: str | None = Field(
        None, max_length=255, description="Action actually taken by the operator"
    )

    @model_validator(mode="after")
    def require_reason_for_override(self) -> "ForecastActionCreate":
        """Require an explanation when operators override the AI."""

        if self.action_taken in {"modified", "rejected"} and not self.override_reason:
            raise ValueError("override_reason is required when modifying or rejecting")
        return self


class ForecastActionResponse(BaseModel):
    """Stored operator decision."""

    id: UUID
    tenant_id: UUID
    route_id: UUID
    forecast_snapshot_id: UUID
    action_taken: str
    override_type: str | None
    override_reason: str | None
    notes: str | None
    operator_id: str | None
    final_action: str | None
    decided_at: datetime

    model_config = {"from_attributes": True}


class OperationalOutcomeCreate(BaseModel):
    """End-of-day actual route operations."""

    tenant_id: UUID
    route_id: UUID
    service_date: date
    actual_passenger_count: int = Field(..., ge=0)
    peak_queue_length: int | None = Field(None, ge=0)
    average_wait_time_minutes: float | None = Field(None, ge=0)
    wait_time_p95_minutes: float | None = Field(None, ge=0)
    extra_buses_dispatched: int = Field(0, ge=0)
    lanes_opened: int = Field(1, ge=0)
    missed_boardings: int = Field(0, ge=0)
    overcrowding_incident: bool = False
    recorded_by: str | None = Field(default="demo-admin", max_length=100)
    notes: str | None = None


class OperationalOutcomeResponse(BaseModel):
    """Stored route-day outcome."""

    id: UUID
    tenant_id: UUID
    route_id: UUID
    service_date: date
    actual_passenger_count: int
    peak_queue_length: int | None
    average_wait_time_minutes: float | None
    wait_time_p95_minutes: float | None
    extra_buses_dispatched: int
    lanes_opened: int
    missed_boardings: int
    overcrowding_incident: bool
    recorded_by: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class LearningLogSummary(BaseModel):
    """Counts shown on the operator dashboard for continuous learning."""

    tenant_id: UUID
    route_id: UUID | None = None
    forecast_snapshots: int
    operator_actions: int
    operational_outcomes: int
    ground_truth_ready_rows: int
    latest_outcome_date: date | None = None
