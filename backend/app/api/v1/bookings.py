"""Booking route handlers — create, retrieve, and manage seat bookings."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1 import bookings as booking_module
from app.core.deps import get_db
from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.bus_route import BusRoute
from app.models.passenger import Passenger
from app.schemas.booking import BookingCreate, BookingDetailResponse, BookingResponse

router = APIRouter()


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a booking",
)
async def create_booking(
    payload: BookingCreate,
    db: AsyncSession = Depends(get_db),
) -> Booking:
    """Create a new seat booking on a bus.

    - Validates the passenger and bus exist
    - Assigns a seat via the Seat Allocator (if available)
    - Generates a QR boarding pass token (if QR service available)
    - Persists the booking and returns it with the QR token
    """
    # Validate passenger exists
    passenger = await db.get(Passenger, payload.passenger_id)
    if not passenger:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Passenger {payload.passenger_id} not found",
        )

    # Validate bus exists
    bus = await db.get(Bus, payload.bus_id)
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bus {payload.bus_id} not found",
        )

    # Count existing bookings for this bus on this date
    from datetime import timezone, timedelta
    existing_count = (
        await db.execute(
            select(Booking).where(
                Booking.bus_id == payload.bus_id,
                Booking.departure_date >= payload.departure_date.replace(hour=0, minute=0),
                Booking.departure_date
                < payload.departure_date.replace(hour=0, minute=0) + timedelta(days=1),
            )
        )
    ).scalars().all()

    if len(existing_count) >= bus.capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bus is fully booked for this departure",
        )

    # Simple seat assignment (will be replaced by SeatAllocator in Phase 2.4)
    taken_seats = {b.seat_number for b in existing_count}
    assigned_seat = None
    for seat_num in range(1, bus.capacity + 1):
        if str(seat_num) not in taken_seats:
            assigned_seat = str(seat_num)
            break

    if assigned_seat is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No available seats",
        )

    # Calculate boarding window (15-minute slot, front seats first)
    row = (int(assigned_seat) - 1) // 4 + 1
    window_start = payload.departure_date + timedelta(minutes=row * 3)
    window_end = window_start + timedelta(minutes=15)

    # Create the booking
    booking = Booking(
        passenger_id=payload.passenger_id,
        bus_id=payload.bus_id,
        seat_number=assigned_seat,
        boarding_window_start=window_start,
        boarding_window_end=window_end,
        status=BookingStatus.CONFIRMED,
        departure_date=payload.departure_date,
    )

    # Try to generate QR token (will work once QR service is in place)
    try:
        from app.services.qr_service.qr import QRService
        qr_service = QRService()
        booking.qr_token = qr_service.generate_token(booking)
    except (ImportError, Exception):
        booking.qr_token = None

    db.add(booking)
    await db.flush()
    await db.refresh(booking)

    return booking


@router.get(
    "/{booking_id}",
    response_model=BookingDetailResponse,
    summary="Get booking details",
)
async def get_booking(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> Booking:
    """Retrieve a booking by ID with passenger and route details."""
    booking = await db.get(Booking, booking_id, options=[selectinload(Booking.passenger), selectinload(Booking.bus)])
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found",
        )

    return booking


@router.get(
    "/{booking_id}/qr",
    summary="Get QR boarding pass image",
    responses={200: {"content": {"image/png": {}}}},
)
async def get_booking_qr(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Return the QR boarding pass as a PNG image."""
    from fastapi.responses import Response

    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found",
        )

    if not booking.qr_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No QR token available for this booking",
        )

    try:
        from app.services.qr_service.qr import QRService
        qr_service = QRService()
        image_bytes = qr_service.render_qr(booking.qr_token)
        return Response(content=image_bytes, media_type="image/png")
    except (ImportError, Exception) as e:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"QR rendering not available: {e}",
        )
