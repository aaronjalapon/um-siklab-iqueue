"""Unit tests for the QR Boarding Pass service."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.core.security import create_qr_token, generate_secret_key, verify_qr_token
from app.services.qr_service.qr import QRService


class TestQRTokenGeneration:
    """Tests for QR token creation and verification."""

    def test_generate_secret_key_is_unique(self):
        """Each generated key should be different."""
        key1 = generate_secret_key()
        key2 = generate_secret_key()
        assert key1 != key2
        assert len(key1) > 32  # Base64 of 32 bytes

    def test_create_and_verify_valid_token(self):
        """A valid token should pass verification and return the payload."""
        secret = generate_secret_key()
        token = create_qr_token(
            passenger_id=str(uuid.uuid4()),
            route_id=str(uuid.uuid4()),
            bus_id=str(uuid.uuid4()),
            seat="12A",
            boarding_window=datetime.now(timezone.utc).isoformat(),
            secret=secret,
        )

        is_valid, payload = verify_qr_token(token, secret)
        assert is_valid, "Valid token should pass verification"
        assert payload is not None
        assert payload["seat"] == "12A"
        assert "passenger_id" in payload
        assert "route_id" in payload
        assert "bus_id" in payload
        assert "boarding_window" in payload
        assert "signed_at" in payload

    def test_tampered_token_fails_verification(self):
        """A modified token should fail verification."""
        secret = generate_secret_key()
        token = create_qr_token(
            passenger_id=str(uuid.uuid4()),
            route_id=str(uuid.uuid4()),
            bus_id=str(uuid.uuid4()),
            seat="12A",
            boarding_window=datetime.now(timezone.utc).isoformat(),
            secret=secret,
        )

        # Tamper with the payload part
        parts = token.split(".")
        tampered = parts[0] + "X" + "." + parts[1]

        is_valid, payload = verify_qr_token(tampered, secret)
        assert not is_valid, "Tampered token should fail"

    def test_wrong_secret_fails_verification(self):
        """A token signed with one secret should fail with another."""
        secret1 = generate_secret_key()
        secret2 = generate_secret_key()

        token = create_qr_token(
            passenger_id=str(uuid.uuid4()),
            route_id=str(uuid.uuid4()),
            bus_id=str(uuid.uuid4()),
            seat="5C",
            boarding_window=datetime.now(timezone.utc).isoformat(),
            secret=secret1,
        )

        is_valid, _ = verify_qr_token(token, secret2)
        assert not is_valid, "Token verified with wrong secret should fail"

    def test_invalid_token_format_returns_false(self):
        """Malformed tokens should fail gracefully."""
        secret = generate_secret_key()

        # No dot separator
        is_valid, _ = verify_qr_token("invalidtoken", secret)
        assert not is_valid

        # Too many dots
        is_valid, _ = verify_qr_token("a.b.c", secret)
        assert not is_valid

        # Empty token
        is_valid, _ = verify_qr_token("", secret)
        assert not is_valid


class TestQRService:
    """Tests for the QRService class."""

    def test_render_qr_returns_png_bytes(self):
        """QR rendering should return valid PNG bytes."""
        secret = generate_secret_key()
        service = QRService(secret=secret)

        token = create_qr_token(
            passenger_id=str(uuid.uuid4()),
            route_id=str(uuid.uuid4()),
            bus_id=str(uuid.uuid4()),
            seat="1A",
            boarding_window=datetime.now(timezone.utc).isoformat(),
            secret=secret,
        )

        png_bytes = service.render_qr(token)
        assert isinstance(png_bytes, bytes)
        assert len(png_bytes) > 0
        # PNG magic bytes
        assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n"

    def test_verify_token_with_service(self):
        """QRService should delegate verification correctly."""
        secret = generate_secret_key()
        service = QRService(secret=secret)

        token = create_qr_token(
            passenger_id=str(uuid.uuid4()),
            route_id=str(uuid.uuid4()),
            bus_id=str(uuid.uuid4()),
            seat="8D",
            boarding_window=datetime.now(timezone.utc).isoformat(),
            secret=secret,
        )

        is_valid, payload = service.verify_token(token)
        assert is_valid
        assert payload["seat"] == "8D"
