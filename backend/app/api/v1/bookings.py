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
    - Uses the Seat Allocator to assign the best seat by affinity scoring
    - Generates a QR boarding pass token
    - Persists the booking and returns it with the QR token
    """
    from datetime import timezone, timedelta

    # Validate passenger exists
    passenger = await db.get(Passenger, payload.passenger_id)
    if not passenger:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Passenger {payload.passenger_id} not found",
        )

    # Validate bus exists (eager load route for QR generation)
    bus_result = await db.execute(
        select(Bus)
        .options(selectinload(Bus.route))
        .where(Bus.id == payload.bus_id)
    )
    bus = bus_result.scalars().first()
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bus {payload.bus_id} not found",
        )

    # Count existing bookings for this bus on this date
    existing_bookings = (
        await db.execute(
            select(Booking).where(
                Booking.bus_id == payload.bus_id,
                Booking.departure_date >= payload.departure_date.replace(hour=0, minute=0),
                Booking.departure_date
                < payload.departure_date.replace(hour=0, minute=0) + timedelta(days=1),
            )
        )
    ).scalars().all()

    if len(existing_bookings) >= bus.capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bus is fully booked for this departure",
        )

    # Try the new SeatAllocator first; fall back to simple assignment
    assigned_seat_label: str | None = None
    assigned_affinity_score: float = 0.0
    boarding_window_start = payload.departure_date
    boarding_window_end = payload.departure_date + timedelta(minutes=15)

    try:
        from app.services.seat_assignment.engine import SeatAllocator
        from app.services.seat_assignment.scorer import PassengerContext

        allocator = SeatAllocator(db)
        pax_name = payload.passenger_name or passenger.name
        pax_ctx = PassengerContext(
            booking_id="temp",  # Will be replaced after Booking is created
            passenger_name=pax_name,
            group_id=payload.group_id,
            language_preference=payload.language_preference or passenger.language_pref,
            travel_habit=payload.travel_habit or passenger.travel_habits,
            lifestyle_interest=payload.lifestyle_interest or passenger.lifestyle_interests,
            needs_accessibility=payload.needs_accessibility or passenger.accessibility_needs,
            preferred_seat_type=payload.seat_preference,
            preferred_side=payload.preferred_side,
        )

        result = await allocator.assign(str(payload.bus_id), pax_ctx)
        assigned_seat_label = result["seat_label"]
        assigned_affinity_score = result["affinity_score"]

        # Parse boarding window from HH:MM–HH:MM format
        bw = result.get("boarding_window", "")
        if "–" in bw:
            from datetime import date
            parts = bw.split("–")
            today = payload.departure_date.date()
            t1_parts = parts[0].split(":")
            t2_parts = parts[1].split(":")
            boarding_window_start = datetime(
                today.year, today.month, today.day,
                int(t1_parts[0]), int(t1_parts[1]),
                tzinfo=timezone.utc,
            )
            boarding_window_end = datetime(
                today.year, today.month, today.day,
                int(t2_parts[0]), int(t2_parts[1]),
                tzinfo=timezone.utc,
            )
    except Exception:
        # Fallback: simple seat assignment
        taken_seats = {b.seat_number for b in existing_bookings}
        assigned_seat_label = None
        for seat_num in range(1, bus.capacity + 1):
            if str(seat_num) not in taken_seats:
                assigned_seat_label = str(seat_num)
                break

        if assigned_seat_label is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No available seats",
            )

        row = (int(assigned_seat_label) - 1) // 4 + 1
        boarding_window_start = payload.departure_date + timedelta(minutes=row * 3)
        boarding_window_end = boarding_window_start + timedelta(minutes=15)

    # Create the booking
    booking = Booking(
        passenger_id=payload.passenger_id,
        bus_id=payload.bus_id,
        seat_number=assigned_seat_label,
        boarding_window_start=boarding_window_start,
        boarding_window_end=boarding_window_end,
        status=BookingStatus.CONFIRMED,
        departure_date=payload.departure_date,
    )

    db.add(booking)
    await db.flush()

    # Link the pending SeatReservation (created during seat assignment) to this booking
    try:
        from app.models.seat import Seat, SeatReservation

        # Find the reservation for this passenger on this bus with no booking linked yet
        res_result = await db.execute(
            select(SeatReservation)
            .join(Seat, SeatReservation.seat_id == Seat.id)
            .where(
                Seat.bus_id == payload.bus_id,
                SeatReservation.passenger_name == (payload.passenger_name or passenger.name),
            )
            .order_by(SeatReservation.created_at.desc())
            .limit(1)
        )
        pending_res = res_result.scalars().first()
        if pending_res:
            pending_res.booking_id = booking.id
            await db.flush()
    except Exception:
        pass  # Non-critical — booking succeeded even if link fails

    # Generate QR token with route context
    try:
        from app.services.qr_service.qr import QRService

        qr_service = QRService()
        booking.qr_token = qr_service.generate_token(
            booking,
            route=bus.route if bus else None,
            bus=bus,
        )
        await db.flush()  # Persist the QR token before refresh
    except Exception:
        booking.qr_token = None

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
) -> dict:
    """Retrieve a booking by ID with passenger and route details."""
    result = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.passenger),
            selectinload(Booking.bus).selectinload(Bus.route),
        )
        .where(Booking.id == booking_id)
    )
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found",
        )

    return {
        "id": booking.id,
        "passenger_id": booking.passenger_id,
        "bus_id": booking.bus_id,
        "seat_number": booking.seat_number,
        "boarding_window_start": booking.boarding_window_start,
        "boarding_window_end": booking.boarding_window_end,
        "status": booking.status.value,
        "qr_token": booking.qr_token,
        "departure_date": booking.departure_date,
        "created_at": booking.created_at,
        "updated_at": booking.updated_at,
        "passenger_name": booking.passenger.name if booking.passenger else None,
        "route_origin": booking.bus.route.origin if booking.bus and booking.bus.route else None,
        "route_destination": booking.bus.route.destination if booking.bus and booking.bus.route else None,
    }


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
