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
        pattern="^(window|aisle)$",
        description="Preferred seat type: 'window', 'aisle', or None for any",
    )
    selected_seat: str | None = Field(
        None,
        max_length=10,
        description="Exact seat label confirmed during seat selection",
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
    affinity_opt_in: bool = Field(
        False,
        description="Explicit consent to seatmate affinity matching",
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
    group_id: UUID | None = None
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


class GroupMemberRequest(BaseModel):
    """A passenger included in an atomic family booking."""

    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=5, max_length=20)
    accessibility_needs: bool = False


class GroupSharedPreferences(BaseModel):
    """Trip preferences inherited by every member of the family."""

    language_preference: str = Field("en", min_length=2, max_length=10)
    travel_habit: str = Field("family", max_length=50)
    lifestyle_interest: str | None = Field(None, max_length=255)
    seat_preference: str | None = Field(None, pattern="^(window|aisle)$")
    preferred_side: str | None = Field(None, pattern="^(left|right)$")
    affinity_opt_in: bool = False


class GroupSeatSelection(BaseModel):
    """A previewed seat submitted for atomic confirmation."""

    member_index: int = Field(..., ge=0, le=5)
    seat_label: str = Field(..., min_length=1, max_length=10)


class GroupBookingRequest(BaseModel):
    """Shared request fields for family previews and confirmations."""

    tenant_id: UUID
    bus_id: UUID
    departure_date: datetime
    members: list[GroupMemberRequest] = Field(..., min_length=2, max_length=6)
    preferences: GroupSharedPreferences = Field(default_factory=GroupSharedPreferences)


class GroupBookingCreate(GroupBookingRequest):
    """Atomic confirmation of the exact server-generated recommendation."""

    seat_assignments: list[GroupSeatSelection] = Field(
        ..., min_length=2, max_length=6
    )


class GroupSeatAssignment(BaseModel):
    """One member's deterministic seat recommendation."""

    member_index: int
    member_name: str
    seat_id: UUID
    seat_label: str
    row_number: int
    col_number: int
    is_accessibility: bool
    reasons: list[str]


class GroupBookingPreviewResponse(BaseModel):
    """Non-persistent family cluster recommendation."""

    assignments: list[GroupSeatAssignment]
    accessibility_passenger_count: int
    boarding_window_start: datetime
    boarding_window_end: datetime
    affinity_opt_in: bool


class GroupBookingMemberResponse(BaseModel):
    """One individual record represented by a combined group pass."""

    booking_id: UUID
    passenger_id: UUID
    name: str
    seat_label: str
    accessibility_needs: bool
    status: str
    reasons: list[str] = Field(default_factory=list)


class GroupBookingResponse(BaseModel):
    """Confirmation and recovery payload for a combined family pass."""

    group_id: UUID
    bus_id: UUID
    route_id: UUID
    route_origin: str
    route_destination: str
    departure_date: datetime
    boarding_window_start: datetime
    boarding_window_end: datetime
    qr_token: str
    members: list[GroupBookingMemberResponse]
