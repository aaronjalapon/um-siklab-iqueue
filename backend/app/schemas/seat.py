"""Seat assignment schemas — Pydantic v2 request/response models."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PassengerContext(BaseModel):
    """Input to the assignment engine — passenger preferences and constraints."""

    model_config = ConfigDict(from_attributes=True)

    booking_id: str = Field(..., description="UUID of the booking")
    passenger_name: str = Field(..., min_length=1, max_length=255)
    group_id: Optional[str] = Field(
        None, description="UUID of the travel group (if any)"
    )
    language_preference: Optional[str] = Field(
        None, description="ISO 639-1 code: 'fil', 'en', 'id', 'vi'"
    )
    travel_habit: Optional[str] = Field(
        None, description="business | leisure | student | family"
    )
    lifestyle_interest: Optional[str] = Field(
        None, description="Comma-separated interests for affinity matching"
    )
    needs_accessibility: bool = Field(
        False, description="Whether passenger requires accessible seating"
    )
    preferred_seat_type: Optional[str] = Field(
        None, description="'window' | 'aisle' | None"
    )
    preferred_side: Optional[str] = Field(
        None, description="'left' | 'right' | None"
    )


class SeatAssignmentResult(BaseModel):
    """Returned by SeatAllocator.assign()."""

    seat_id: str
    seat_label: str = Field(..., description="e.g. '3B'")
    seat_type: str = Field(..., description="window | aisle | middle")
    side: str = Field(..., description="left | right")
    row_number: int
    affinity_score: float
    boarding_window: Optional[str] = Field(
        None, description="HH:MM–HH:MM format"
    )


class SeatMapEntry(BaseModel):
    """One seat in the full bus seat map (used by grid + list views)."""

    seat_id: str
    seat_label: str
    row_number: int
    col_number: int
    seat_type: str
    side: str
    is_near_exit: bool
    is_accessibility: bool
    status: str  # available | occupied | reserved | blocked
    passenger_name: Optional[str] = None
    group_id: Optional[str] = None
    language_preference: Optional[str] = None
    travel_habit: Optional[str] = None
    lifestyle_interest: Optional[str] = None
    needs_accessibility: Optional[bool] = None
    preferred_seat_type: Optional[str] = None
    affinity_score: Optional[float] = None
    boarding_window: Optional[str] = None


class SeatAssignRequest(BaseModel):
    """POST /api/v1/seats/assign request body."""

    bus_id: str = Field(..., description="UUID of the bus")
    passenger: PassengerContext


class SeatSwapRequest(BaseModel):
    """PUT /api/v1/seats/swap — operator use only."""

    booking_id_a: str = Field(..., description="UUID of first booking")
    booking_id_b: str = Field(..., description="UUID of second booking")


class SeatMapResponse(BaseModel):
    """Wrapper for the seat map list response."""

    bus_id: str
    seats: list[SeatMapEntry]
    total_seats: int
    occupied_count: int
    available_count: int
