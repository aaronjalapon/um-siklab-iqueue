"""Terminal boarding-pass verification endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.buses import is_demo_immediate_route

from app.core.security import (
    create_group_qr_token,
    create_qr_token,
    validate_qr_timing,
    verify_qr_token,
)
from app.core.config import get_settings
from app.core.deps import get_db
from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.passenger import Passenger
from app.schemas.boarding import (
    BoardingMemberStatus,
    BoardingVerifyRequest,
    BoardingVerifyResponse,
)

router = APIRouter()


@router.get(
    "/demo-token",
    summary="Get an active valid boarding token for live gate demonstration",
)
async def get_demo_boarding_token(
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Return an active, currently valid signed boarding pass token from the database."""
    now = datetime.now(timezone.utc)
    w_start_dt = now - timedelta(minutes=5)
    w_end_dt = now + timedelta(minutes=30)
    w_start = w_start_dt.isoformat()
    w_end = w_end_dt.isoformat()
    secret = get_settings().QR_HMAC_SECRET

    # 1. Check for latest group booking
    group_booking = await db.scalar(
        select(Booking)
        .where(
            Booking.group_id.is_not(None),
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.BOARDED]),
        )
        .order_by(Booking.created_at.desc())
        .limit(1)
    )
    if group_booking and group_booking.group_id:
        group_id = group_booking.group_id
        result = await db.execute(
            select(Booking).where(Booking.group_id == group_id)
        )
        members = list(result.scalars().all())
        if members:
            token = create_group_qr_token(
                group_id=str(group_id),
                route_id=str(group_booking.bus_id),
                bus_id=str(group_booking.bus_id),
                members=[
                    {
                        "booking_id": str(m.id),
                        "passenger_id": str(m.passenger_id),
                        "seat": m.seat_number,
                    }
                    for m in members
                ],
                boarding_window_start=w_start,
                boarding_window_end=w_end,
                secret=secret,
            )
            for m in members:
                m.boarding_window_start = w_start_dt
                m.boarding_window_end = w_end_dt
                m.status = BookingStatus.CONFIRMED
                m.qr_token = token
            await db.commit()
            return {"token": token}

    # 2. Check for individual booking
    booking = await db.scalar(
        select(Booking)
        .where(
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.BOARDED]),
        )
        .order_by(Booking.created_at.desc())
        .limit(1)
    )
    if booking:
        booking.boarding_window_start = w_start_dt
        booking.boarding_window_end = w_end_dt
        booking.status = BookingStatus.CONFIRMED
        token = create_qr_token(
            passenger_id=str(booking.passenger_id),
            route_id=str(booking.bus_id),
            bus_id=str(booking.bus_id),
            seat=booking.seat_number,
            boarding_window=w_start,
            secret=secret,
        )
        booking.qr_token = token
        await db.commit()
        return {"token": token}

    # 3. Fallback: Auto-provision a confirmed booking for live demo
    bus = await db.scalar(select(Bus).limit(1))
    passenger = await db.scalar(select(Passenger).limit(1))
    if bus and passenger:
        import uuid as _uuid
        demo_booking = Booking(
            id=_uuid.uuid4(),
            passenger_id=passenger.id,
            bus_id=bus.id,
            seat_number="1A",
            boarding_window_start=w_start_dt,
            boarding_window_end=w_end_dt,
            status=BookingStatus.CONFIRMED,
            departure_date=now.date(),
        )
        token = create_qr_token(
            passenger_id=str(passenger.id),
            route_id=str(bus.route_id or bus.id),
            bus_id=str(bus.id),
            seat="1A",
            boarding_window=w_start,
            secret=secret,
        )
        demo_booking.qr_token = token
        db.add(demo_booking)
        await db.commit()
        return {"token": token}

    return {"token": ""}


@router.post(
    "/verify",
    response_model=BoardingVerifyResponse,
    summary="Verify a signed QR boarding pass",
)
async def verify_boarding_pass(
    payload: BoardingVerifyRequest,
    db: AsyncSession = Depends(get_db),
) -> BoardingVerifyResponse:
    """Verify signature, token timing, booking state, and boarding window."""

    signature_valid, token_data = verify_qr_token(
        payload.token,
        get_settings().QR_HMAC_SECRET,
    )
    if not signature_valid or token_data is None:
        return BoardingVerifyResponse(
            valid=False,
            reason="invalid_signature",
            signature_valid=False,
            boarding_status="invalid",
        )

    if token_data.get("pass_type") == "group":
        return await _verify_group_pass(token_data, payload.token, db)

    timing_valid, timing_reason = validate_qr_timing(token_data)
    booking = await db.scalar(
        select(Booking)
        .options(selectinload(Booking.bus).selectinload(Bus.route))
        .where(Booking.qr_token == payload.token)
    )
    common = {
        "signature_valid": True,
        "passenger_id": token_data.get("passenger_id"),
        "route_id": token_data.get("route_id"),
        "bus_id": token_data.get("bus_id"),
        "seat": token_data.get("seat"),
        "boarding_window": token_data.get("boarding_window"),
    }
    if booking is None:
        return BoardingVerifyResponse(
            valid=False,
            reason="booking_not_found",
            boarding_status=timing_reason,
            **common,
        )
    if booking.status in {BookingStatus.CANCELLED, BookingStatus.MISSED}:
        return BoardingVerifyResponse(
            valid=False,
            reason=f"booking_{booking.status.value}",
            boarding_status="blocked",
            booking_id=booking.id,
            **common,
        )

    is_demo = False
    if booking.bus and booking.bus.route:
        is_demo = is_demo_immediate_route(booking.bus.route.origin, booking.bus.route.destination)

    if is_demo:
        timing_valid, timing_reason = validate_qr_timing(token_data, early_minutes=180)

    now = datetime.now(timezone.utc)
    start = booking.boarding_window_start
    end = booking.boarding_window_end
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)

    gate_early_minutes = 180 if is_demo else 120
    if now < start - timedelta(minutes=gate_early_minutes):
        timing_valid, timing_reason = False, "not_yet_valid"
    elif now > end + timedelta(hours=24):
        timing_valid, timing_reason = False, "expired"

    return BoardingVerifyResponse(
        valid=timing_valid,
        reason=timing_reason,
        boarding_status=timing_reason,
        booking_id=booking.id,
        **common,
    )


async def _verify_group_pass(
    token_data: dict,
    token: str,
    db: AsyncSession,
) -> BoardingVerifyResponse:
    """Require every signed group member to be present and boardable."""
    timing_valid, timing_reason = validate_qr_timing(token_data)
    try:
        group_id = UUID(str(token_data["group_id"]))
        signed_members = {
            member["booking_id"]: member for member in token_data["members"]
        }
    except (KeyError, TypeError):
        return BoardingVerifyResponse(
            valid=False,
            reason="malformed_group",
            signature_valid=True,
            boarding_status="invalid",
            pass_type="group",
        )

    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.bus).selectinload(Bus.route))
        .where(Booking.group_id == group_id)
    )
    bookings = list(result.scalars().all())

    is_demo = any(
        b.bus and b.bus.route and is_demo_immediate_route(b.bus.route.origin, b.bus.route.destination)
        for b in bookings
    )
    if is_demo:
        timing_valid, timing_reason = validate_qr_timing(token_data, early_minutes=180)
    by_id = {str(booking.id): booking for booking in bookings}
    member_statuses: list[BoardingMemberStatus] = []
    requires_review = len(bookings) != len(signed_members)

    for booking_id, signed in signed_members.items():
        booking = by_id.get(booking_id)
        if booking is None:
            requires_review = True
            member_statuses.append(
                BoardingMemberStatus(
                    booking_id=booking_id,
                    passenger_id=signed["passenger_id"],
                    seat=signed["seat"],
                    status="missing",
                    requires_review=True,
                )
            )
            continue
        mismatch = (
            str(booking.passenger_id) != signed["passenger_id"]
            or booking.seat_number != signed["seat"]
            or (booking.qr_token != token and booking.group_id != group_id)
        )
        blocked = booking.status in {BookingStatus.CANCELLED, BookingStatus.MISSED}
        member_review = mismatch or blocked
        requires_review = requires_review or member_review
        member_statuses.append(
            BoardingMemberStatus(
                booking_id=booking.id,
                passenger_id=booking.passenger_id,
                seat=booking.seat_number,
                status="record_mismatch" if mismatch else booking.status.value,
                requires_review=member_review,
            )
        )

    common = {
        "signature_valid": True,
        "pass_type": "group",
        "group_id": group_id,
        "route_id": token_data.get("route_id"),
        "bus_id": token_data.get("bus_id"),
        "boarding_window": token_data.get("boarding_window"),
        "members": member_statuses,
    }
    if requires_review:
        return BoardingVerifyResponse(
            valid=False,
            reason="group_requires_review",
            boarding_status="requires_review",
            **common,
        )
    return BoardingVerifyResponse(
        valid=timing_valid,
        reason=timing_reason,
        boarding_status=timing_reason,
        **common,
    )
