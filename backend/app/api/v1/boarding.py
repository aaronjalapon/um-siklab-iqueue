"""Terminal boarding-pass verification endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import validate_qr_timing, verify_qr_token
from app.core.config import get_settings
from app.core.deps import get_db
from app.models.booking import Booking, BookingStatus
from app.schemas.boarding import (
    BoardingMemberStatus,
    BoardingVerifyRequest,
    BoardingVerifyResponse,
)

router = APIRouter()


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
        select(Booking).where(Booking.qr_token == payload.token)
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

    now = datetime.now(timezone.utc)
    start = booking.boarding_window_start
    end = booking.boarding_window_end
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    if now < start - timedelta(minutes=120):
        timing_valid, timing_reason = False, "not_yet_valid"
    elif now > end + timedelta(hours=6):
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
        select(Booking).where(Booking.group_id == group_id)
    )
    bookings = list(result.scalars().all())
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
            or booking.qr_token != token
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
