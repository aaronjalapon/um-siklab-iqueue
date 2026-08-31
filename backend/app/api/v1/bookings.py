"""Booking route handlers — create, retrieve, and manage seat bookings."""

from __future__ import annotations

import logging
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db
from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.passenger import Passenger
from app.models.seat import Seat, SeatStatus
from app.schemas.booking import (
    BookingCreate,
    BookingDetailResponse,
    BookingResponse,
    GroupBookingCreate,
    GroupBookingMemberResponse,
    GroupBookingPreviewResponse,
    GroupBookingRequest,
    GroupBookingResponse,
    GroupSeatAssignment,
)
from app.services.seat_assignment.date_aware import (
    _bookings_for_service_day,
    _load_bus_and_seats,
    assign_for_travel_date,
)
from app.services.seat_assignment.engine import SeatUnavailableError
from app.services.seat_assignment.group import (
    GroupAllocation,
    allocate_group_seats,
    synchronized_boarding_window,
)
from app.services.seat_assignment.scorer import PassengerContext

router = APIRouter()
logger = logging.getLogger(__name__)


def _validate_group_people(payload: GroupBookingRequest) -> None:
    normalized_names = [member.name.strip().casefold() for member in payload.members]
    normalized_phones = [member.phone.strip() for member in payload.members]
    if len(set(normalized_names)) != len(normalized_names):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Each family member must have a unique name",
        )
    if len(set(normalized_phones)) != len(normalized_phones):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Each family member must have a unique phone number",
        )


async def _group_preview(
    payload: GroupBookingRequest,
    db: AsyncSession,
    *,
    lock: bool = False,
):
    """Load current service-day availability and produce one stable cluster."""
    _validate_group_people(payload)
    bus_result = await db.execute(
        select(Bus)
        .options(selectinload(Bus.route), selectinload(Bus.layout))
        .where(Bus.id == payload.bus_id)
    )
    bus = bus_result.scalars().first()
    if bus is None:
        raise HTTPException(status_code=404, detail=f"Bus {payload.bus_id} not found")
    if bus.tenant_id != payload.tenant_id:
        raise HTTPException(
            status_code=403,
            detail="Family and bus belong to different tenants",
        )

    _, seats = await _load_bus_and_seats(db, payload.bus_id)
    if lock:
        locked = await db.execute(
            select(Seat)
            .where(Seat.bus_id == payload.bus_id)
            .order_by(Seat.row_number, Seat.col_number)
            .with_for_update()
        )
        seats = list(locked.scalars().all())
    bookings = await _bookings_for_service_day(
        db, payload.bus_id, payload.departure_date
    )
    occupied = {booking.seat_number for booking in bookings}
    available = [
        seat
        for seat in seats
        if seat.status != SeatStatus.BLOCKED and seat.seat_label not in occupied
    ]
    try:
        allocations = allocate_group_seats(payload.members, available)
    except SeatUnavailableError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    window_start, window_end = synchronized_boarding_window(
        payload.departure_date, allocations
    )
    return bus, allocations, window_start, window_end


def _preview_response(
    payload: GroupBookingRequest,
    allocations: list[GroupAllocation],
    window_start,
    window_end,
) -> GroupBookingPreviewResponse:
    return GroupBookingPreviewResponse(
        assignments=[
            GroupSeatAssignment(
                member_index=allocation.member_index,
                member_name=payload.members[allocation.member_index].name,
                seat_id=allocation.seat.id,
                seat_label=allocation.seat.seat_label,
                row_number=allocation.seat.row_number,
                col_number=allocation.seat.col_number,
                is_accessibility=allocation.seat.is_accessibility,
                reasons=list(allocation.reasons),
            )
            for allocation in allocations
        ],
        accessibility_passenger_count=sum(
            member.accessibility_needs for member in payload.members
        ),
        boarding_window_start=window_start,
        boarding_window_end=window_end,
        affinity_opt_in=payload.preferences.affinity_opt_in,
    )


@router.post(
    "/groups/preview",
    response_model=GroupBookingPreviewResponse,
    summary="Preview an accessibility-first family seat cluster",
)
async def preview_group_booking(
    payload: GroupBookingRequest,
    db: AsyncSession = Depends(get_db),
) -> GroupBookingPreviewResponse:
    """Recommend seats without storing passengers, names, or phone numbers."""
    _, allocations, window_start, window_end = await _group_preview(payload, db)
    return _preview_response(payload, allocations, window_start, window_end)


@router.post(
    "/groups",
    response_model=GroupBookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Atomically confirm a family booking and combined pass",
)
async def create_group_booking(
    payload: GroupBookingCreate,
    db: AsyncSession = Depends(get_db),
) -> GroupBookingResponse:
    """Upsert all passengers and create every booking, or create none."""
    from app.core.config import get_settings
    from app.core.security import create_group_qr_token

    bus, allocations, window_start, window_end = await _group_preview(
        payload, db, lock=True
    )
    expected = {
        allocation.member_index: allocation.seat.seat_label
        for allocation in allocations
    }
    submitted = {
        assignment.member_index: assignment.seat_label
        for assignment in payload.seat_assignments
    }
    if (
        len(submitted) != len(payload.members)
        or submitted != expected
        or len(payload.seat_assignments) != len(payload.members)
    ):
        raise HTTPException(
            status_code=409,
            detail="The family seat recommendation changed; regenerate before confirming",
        )

    group_id = uuid4()
    passengers: list[Passenger] = []
    bookings: list[Booking] = []

    # The request-scoped session commits only after this endpoint succeeds. Any
    # validation or persistence error rolls back every passenger and booking.
    for member in payload.members:
        existing = await db.scalar(
            select(Passenger).where(
                Passenger.tenant_id == payload.tenant_id,
                Passenger.phone == member.phone.strip(),
            )
        )
        if existing is None:
            existing = Passenger(
                tenant_id=payload.tenant_id,
                name=member.name.strip(),
                phone=member.phone.strip(),
                language_pref=payload.preferences.language_preference,
                travel_habits=payload.preferences.travel_habit,
                lifestyle_interests=payload.preferences.lifestyle_interest,
                accessibility_needs=member.accessibility_needs,
            )
            db.add(existing)
        else:
            existing.name = member.name.strip()
            existing.language_pref = payload.preferences.language_preference
            existing.travel_habits = payload.preferences.travel_habit
            existing.lifestyle_interests = payload.preferences.lifestyle_interest
            existing.accessibility_needs = member.accessibility_needs
        passengers.append(existing)
    await db.flush()

    for allocation, passenger in zip(allocations, passengers, strict=True):
        booking = Booking(
            group_id=group_id,
            passenger_id=passenger.id,
            bus_id=payload.bus_id,
            seat_number=allocation.seat.seat_label,
            boarding_window_start=window_start,
            boarding_window_end=window_end,
            status=BookingStatus.CONFIRMED,
            departure_date=payload.departure_date,
        )
        db.add(booking)
        bookings.append(booking)
    await db.flush()

    token = create_group_qr_token(
        group_id=str(group_id),
        route_id=str(bus.route_id),
        bus_id=str(bus.id),
        members=[
            {
                "booking_id": str(booking.id),
                "passenger_id": str(booking.passenger_id),
                "seat": booking.seat_number,
            }
            for booking in bookings
        ],
        boarding_window_start=window_start.isoformat(),
        boarding_window_end=window_end.isoformat(),
        secret=get_settings().QR_HMAC_SECRET,
    )
    for booking in bookings:
        booking.qr_token = token
    await db.flush()

    return GroupBookingResponse(
        group_id=group_id,
        bus_id=bus.id,
        route_id=bus.route_id,
        route_origin=bus.route.origin,
        route_destination=bus.route.destination,
        departure_date=payload.departure_date,
        boarding_window_start=window_start,
        boarding_window_end=window_end,
        qr_token=token,
        members=[
            GroupBookingMemberResponse(
                booking_id=booking.id,
                passenger_id=passenger.id,
                name=passenger.name,
                seat_label=booking.seat_number,
                accessibility_needs=passenger.accessibility_needs,
                status=booking.status.value,
                reasons=list(allocation.reasons),
            )
            for booking, passenger, allocation in zip(
                bookings, passengers, allocations, strict=True
            )
        ],
    )


@router.get(
    "/groups/{group_id}",
    response_model=GroupBookingResponse,
    summary="Recover a confirmed combined family pass",
)
async def get_group_booking(
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> GroupBookingResponse:
    result = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.passenger),
            selectinload(Booking.bus).selectinload(Bus.route),
        )
        .where(Booking.group_id == group_id)
        .order_by(Booking.created_at, Booking.id)
    )
    bookings = list(result.scalars().all())
    if not bookings:
        raise HTTPException(status_code=404, detail=f"Group {group_id} not found")
    first = bookings[0]
    return GroupBookingResponse(
        group_id=group_id,
        bus_id=first.bus_id,
        route_id=first.bus.route_id,
        route_origin=first.bus.route.origin,
        route_destination=first.bus.route.destination,
        departure_date=first.departure_date,
        boarding_window_start=first.boarding_window_start,
        boarding_window_end=first.boarding_window_end,
        qr_token=first.qr_token or "",
        members=[
            GroupBookingMemberResponse(
                booking_id=booking.id,
                passenger_id=booking.passenger_id,
                name=booking.passenger.name,
                seat_label=booking.seat_number,
                accessibility_needs=booking.passenger.accessibility_needs,
                status=booking.status.value,
                reasons=(
                    ["Accessible seat near the exit", "Accessibility requirement met"]
                    if booking.passenger.accessibility_needs
                    else ["Kept near family"]
                ),
            )
            for booking in bookings
        ],
    )


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
    from datetime import datetime, timezone, timedelta

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
    if passenger.tenant_id != bus.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Passenger and bus belong to different tenants",
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
    boarding_window_start = payload.departure_date
    boarding_window_end = payload.departure_date + timedelta(minutes=15)

    try:
        pax_name = payload.passenger_name or passenger.name
        pax_ctx = PassengerContext(
            booking_id="temp",
            passenger_name=pax_name,
            group_id=payload.group_id,
            language_preference=payload.language_preference or passenger.language_pref,
            travel_habit=payload.travel_habit or passenger.travel_habits,
            lifestyle_interest=payload.lifestyle_interest or passenger.lifestyle_interests,
            needs_accessibility=payload.needs_accessibility or passenger.accessibility_needs,
            preferred_seat_type=payload.seat_preference,
            preferred_side=payload.preferred_side,
            affinity_opt_in=payload.affinity_opt_in,
        )

        result = await assign_for_travel_date(
            db,
            payload.bus_id,
            pax_ctx,
            payload.departure_date,
            seat_label=payload.selected_seat,
            departure_datetime=payload.departure_date,
        )
        assigned_seat_label = result["seat_label"]

        # Parse boarding window from HH:MM–HH:MM format
        bw = result.get("boarding_window", "")
        if "–" in bw:
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
    except SeatUnavailableError as exc:
        if payload.selected_seat:
            logger.info(
                "Selected seat %s could not be reserved: %s",
                payload.selected_seat,
                exc,
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Selected seat {payload.selected_seat} is no longer available",
            )
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
    except Exception as exc:
        logger.warning("Date-aware seat assignment failed; using fallback: %s", exc)
        if payload.selected_seat:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Selected seat {payload.selected_seat} is no longer available",
            )
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
        "group_id": booking.group_id,
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
