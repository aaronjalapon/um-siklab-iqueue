"""Passenger schemas — request/response models for passenger data."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class PassengerCreate(BaseModel):
    """Request body for creating a new passenger profile."""

    tenant_id: UUID = Field(..., description="Tenant/operator UUID")
    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=5, max_length=20)
    language_pref: str = Field("en", min_length=2, max_length=10)
    travel_habits: str | None = Field(
        None, description="e.g. business, leisure, student, family"
    )
    lifestyle_interests: str | None = Field(
        None, description="Comma-separated interests for affinity matching"
    )
    accessibility_needs: bool = Field(
        False, description="Whether the passenger requires accessible seating"
    )


class PassengerResponse(BaseModel):
    """Response model for passenger data."""

    id: UUID
    tenant_id: UUID
    name: str
    phone: str
    language_pref: str
    travel_habits: str | None = None
    lifestyle_interests: str | None = None
    accessibility_needs: bool = False

    model_config = {"from_attributes": True}
