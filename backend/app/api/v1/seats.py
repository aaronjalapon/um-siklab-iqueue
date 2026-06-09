"""Seat assignment route handlers — assign, release, swap, and view seats."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.schemas.seat import (
    SeatAssignRequest,
    SeatAssignmentResult,
    SeatMapEntry,
    SeatMapResponse,
    SeatSwapRequest,
)
from app.services.seat_assignment.engine import (
    BusNotFoundError,
    SeatAllocator,
    SeatUnavailableError,
)
from app.services.seat_assignment.scorer import PassengerContext

router = APIRouter(prefix="/seats", tags=["Seat Assignment"])


@router.post(
    "/assign",
    response_model=SeatAssignmentResult,
    status_code=status.HTTP_201_CREATED,
    summary="Assign a seat to a passenger",
)
async def assign_seat(
    body: SeatAssignRequest,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Assign the best available seat based on passenger preferences.

    Called during the booking transaction. Uses the rule-based
    SeatAllocator to score every available seat and return the winner.

    Returns 201 with seat assignment details.
    Raises 409 if no seats available.
    Raises 404 if bus not found.
    """
    allocator = SeatAllocator(session)

    passenger = PassengerContext(
        booking_id=body.passenger.booking_id,
        passenger_name=body.passenger.passenger_name,
        group_id=body.passenger.group_id,
        language_preference=body.passenger.language_preference,
        travel_habit=body.passenger.travel_habit,
        lifestyle_interest=body.passenger.lifestyle_interest,
        needs_accessibility=body.passenger.needs_accessibility,
        preferred_seat_type=body.passenger.preferred_seat_type,
        preferred_side=body.passenger.preferred_side,
    )

    try:
        result = await allocator.assign(body.bus_id, passenger)
    except BusNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bus {body.bus_id} not found",
        )
    except SeatUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No available seats on this bus",
        )

    return result


@router.get(
    "/bus/{bus_id}",
    response_model=list[SeatMapEntry],
    summary="Get full seat map for a bus",
)
async def get_seat_map(
    bus_id: UUID,
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Return the complete seat map for a bus with status and passenger info.

    Used by the passenger booking grid and the operator dashboard.
    Each entry includes seat metadata and, if occupied, the passenger's
    name, group, language, travel habit, and preferences.
    """
    allocator = SeatAllocator(session)
    try:
        return await allocator.get_seat_map(bus_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bus {bus_id} not found",
        )


@router.get(
    "/bus/{bus_id}/summary",
    response_model=SeatMapResponse,
    summary="Get seat map summary for a bus",
)
async def get_seat_map_summary(
    bus_id: UUID,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Return the seat map with occupancy summary counts."""
    allocator = SeatAllocator(session)
    try:
        seats = await allocator.get_seat_map(bus_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bus {bus_id} not found",
        )

    occupied = sum(1 for s in seats if s["status"] == "occupied")
    return SeatMapResponse(
        bus_id=str(bus_id),
        seats=seats,
        total_seats=len(seats),
        occupied_count=occupied,
        available_count=len(seats) - occupied,
    ).model_dump()


@router.delete(
    "/release/{booking_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Release a seat on booking cancellation",
)
async def release_seat(
    booking_id: UUID,
    session: AsyncSession = Depends(get_db),
) -> None:
    """Free the seat associated with a cancelled booking.

    Sets the seat status back to AVAILABLE and removes the reservation.
    """
    allocator = SeatAllocator(session)
    try:
        await allocator.release(booking_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.put(
    "/swap",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Swap seats between two bookings (operator only)",
)
async def swap_seats(
    body: SeatSwapRequest,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Exchange seats between two existing bookings.

    Both bookings must be on the same bus. This is an operator-only
    operation used during boarding management.
    """
    allocator = SeatAllocator(session)
    try:
        result = await allocator.swap_seats(
            body.booking_id_a, body.booking_id_b
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return result
