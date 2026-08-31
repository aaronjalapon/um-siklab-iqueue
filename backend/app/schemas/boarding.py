"""Boarding-pass verification schemas."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class BoardingVerifyRequest(BaseModel):
    """Signed QR token presented at a terminal gate."""

    token: str = Field(..., min_length=16, max_length=4096)


class BoardingMemberStatus(BaseModel):
    """Operational state for one person represented by a group pass."""

    booking_id: UUID
    passenger_id: UUID
    seat: str
    status: str
    requires_review: bool = False


class BoardingVerifyResponse(BaseModel):
    """Gate decision with cryptographic and operational context."""

    valid: bool
    reason: str
    signature_valid: bool
    boarding_status: str
    pass_type: str = "individual"
    group_id: UUID | None = None
    members: list[BoardingMemberStatus] = Field(default_factory=list)
    booking_id: UUID | None = None
    passenger_id: UUID | None = None
    route_id: UUID | None = None
    bus_id: UUID | None = None
    seat: str | None = None
    boarding_window: str | None = None
