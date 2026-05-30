"""Bus schemas — request/response models for the buses API."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SeatInfo(BaseModel):
    """Information about a single seat on a bus."""

    seat_number: str
    is_available: bool
    passenger_name: str | None = None


class BusResponse(BaseModel):
    """Response model for a bus listing."""

    id: UUID
    tenant_id: UUID
    route_id: UUID
    capacity: int
    plate_number: str
    origin: str = ""
    destination: str = ""
    available_seats: int = 0
    surge_probability: float | None = None

    model_config = {"from_attributes": True}


class BusListResponse(BaseModel):
    """Paginated list of buses for a route search."""

    buses: list[BusResponse]
    total: int
    route_origin: str
    route_destination: str


class SeatMapResponse(BaseModel):
    """Complete seat map for a bus including availability."""

    bus_id: UUID
    capacity: int
    seats: list[SeatInfo]
    booked_count: int
    available_count: int
