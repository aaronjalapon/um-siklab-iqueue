"""Integration tests for boarding-pass verification."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.core.security import create_group_qr_token, create_qr_token
from app.models.booking import Booking, BookingStatus


@pytest.mark.asyncio
async def test_verify_boarding_pass_accepts_ready_booking(
    client: AsyncClient,
    db_session,
    booking,
    route,
) -> None:
    """A signed, current, active booking should pass the gate check."""

    now = datetime.now(timezone.utc)
    booking.boarding_window_start = now - timedelta(minutes=5)
    booking.boarding_window_end = now + timedelta(minutes=10)
    token = create_qr_token(
        passenger_id=str(booking.passenger_id),
        route_id=str(route.id),
        bus_id=str(booking.bus_id),
        seat=booking.seat_number,
        boarding_window=booking.boarding_window_start.isoformat(),
        secret=get_settings().QR_HMAC_SECRET,
    )
    booking.qr_token = token
    await db_session.flush()

    response = await client.post("/api/v1/boarding/verify", json={"token": token})
    assert response.status_code == 200
    assert response.json()["valid"] is True
    assert response.json()["reason"] == "ready"


@pytest.mark.asyncio
async def test_verify_boarding_pass_rejects_tampering(client: AsyncClient) -> None:
    """A modified QR payload should fail before any booking lookup."""

    response = await client.post(
        "/api/v1/boarding/verify",
        json={"token": "tampered.payload.signature"},
    )
    assert response.status_code == 200
    assert response.json()["valid"] is False
    assert response.json()["reason"] == "invalid_signature"


@pytest.mark.asyncio
async def test_group_with_missed_member_requires_staff_review(
    client: AsyncClient,
    db_session,
    passenger,
    bus,
    route,
) -> None:
    """A signed family pass never auto-admits a missed member."""
    import uuid

    from app.models.passenger import Passenger

    now = datetime.now(timezone.utc)
    group_id = uuid.uuid4()
    second_passenger = Passenger(
        id=uuid.uuid4(),
        tenant_id=passenger.tenant_id,
        name="Second Member",
        phone="+639190000002",
        language_pref="en",
        accessibility_needs=False,
    )
    db_session.add(second_passenger)
    bookings = [
        Booking(
            id=uuid.uuid4(), group_id=group_id, passenger_id=passenger.id,
            bus_id=bus.id, seat_number="1A", boarding_window_start=now - timedelta(minutes=5),
            boarding_window_end=now + timedelta(minutes=10), status=BookingStatus.CONFIRMED,
            departure_date=now,
        ),
        Booking(
            id=uuid.uuid4(), group_id=group_id, passenger_id=second_passenger.id,
            bus_id=bus.id, seat_number="1B", boarding_window_start=now - timedelta(minutes=5),
            boarding_window_end=now + timedelta(minutes=10), status=BookingStatus.MISSED,
            departure_date=now,
        ),
    ]
    db_session.add_all(bookings)
    await db_session.flush()
    token = create_group_qr_token(
        group_id=str(group_id), route_id=str(route.id), bus_id=str(bus.id),
        members=[{"booking_id": str(item.id), "passenger_id": str(item.passenger_id), "seat": item.seat_number} for item in bookings],
        boarding_window_start=(now - timedelta(minutes=5)).isoformat(),
        boarding_window_end=(now + timedelta(minutes=10)).isoformat(),
        secret=get_settings().QR_HMAC_SECRET,
    )
    for item in bookings:
        item.qr_token = token
    await db_session.flush()

    response = await client.post("/api/v1/boarding/verify", json={"token": token})
    assert response.status_code == 200
    assert response.json()["valid"] is False
    assert response.json()["reason"] == "group_requires_review"
    assert response.json()["boarding_status"] == "requires_review"
    assert any(member["requires_review"] for member in response.json()["members"])
