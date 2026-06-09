"""Booking schemas — request/response models for the bookings API."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class TravelGroupMember(BaseModel):
    """A member of a travel group for group seating."""

    passenger_id: UUID
    name: str


class BookingCreate(BaseModel):
    """Request body for creating a new booking."""

    passenger_id: UUID = Field(..., description="UUID of the passenger")
    bus_id: UUID = Field(..., description="UUID of the bus to book")
    departure_date: datetime = Field(..., description="Desired departure date/time")
    seat_preference: str | None = Field(
        None,
        description="Preferred seat type: 'window', 'aisle', or None for any",
    )
    travel_group: list[UUID] = Field(
        default_factory=list,
        description="List of passenger IDs traveling together for group seating",
    )
    # Passenger preferences for seat affinity scoring
    passenger_name: str | None = Field(
        None, description="Passenger name override (uses profile name if not set)"
    )
    group_id: str | None = Field(
        None, description="UUID of the travel group for affinity grouping"
    )
    language_preference: str | None = Field(
        None, description="ISO 639-1: 'fil', 'en', 'id', 'vi'"
    )
    travel_habit: str | None = Field(
        None, description="business | leisure | student | family"
    )
    lifestyle_interest: str | None = Field(
        None, description="Comma-separated interests for affinity matching"
    )
    needs_accessibility: bool = Field(
        False, description="Whether passenger requires accessible seating"
    )
    preferred_side: str | None = Field(
        None, description="'left' | 'right' | None"
    )


class SeatAssignment(BaseModel):
    """Result of the seat allocator — the assigned seat and boarding info."""

    seat_number: str = Field(..., description="Assigned seat (e.g. '12A')")
    boarding_window_start: datetime = Field(
        ..., description="Start of the 15-minute boarding window"
    )
    boarding_window_end: datetime = Field(
        ..., description="End of the 15-minute boarding window"
    )
    affinity_score: float = Field(
        0.0, description="Computed seatmate affinity score (0-5)"
    )


class BookingResponse(BaseModel):
    """Response model for a booking (includes QR token)."""

    id: UUID
    passenger_id: UUID
    bus_id: UUID
    seat_number: str
    boarding_window_start: datetime
    boarding_window_end: datetime
    status: str
    qr_token: str | None = None
    departure_date: datetime
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class BookingDetailResponse(BookingResponse):
    """Extended booking response with nested passenger and bus info."""

    passenger_name: str | None = None
    route_origin: str | None = None
    route_destination: str | None = None
