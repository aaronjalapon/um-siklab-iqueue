"""Integration tests for boarding-pass verification."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.core.security import create_qr_token


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
