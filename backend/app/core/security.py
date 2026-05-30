"""HMAC-SHA256 security helpers for QR boarding pass signing.

All token operations use timing-safe comparison to prevent
timing side-channel attacks on signature verification.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timezone


def generate_secret_key() -> str:
    """Generate a cryptographically secure HMAC secret key.

    Returns:
        Base64-encoded 32-byte random key string.

    Usage:
        >>> key = generate_secret_key()
        >>> print(key)  # Save this to QR_HMAC_SECRET in .env
    """
    return base64.b64encode(secrets.token_bytes(32)).decode("ascii")


def create_hmac_signature(payload: str, secret: str) -> str:
    """Create an HMAC-SHA256 signature for the given payload.

    Args:
        payload: The plaintext payload to sign (e.g. "p_id|route|bus|seat|window|ts")
        secret: The HMAC secret key (from QR_HMAC_SECRET env var)

    Returns:
        Base64-encoded HMAC-SHA256 signature string.
    """
    key = secret.encode("utf-8") if isinstance(secret, str) else secret
    message = payload.encode("utf-8")
    sig = hmac.new(key, message, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).rstrip(b"=").decode("ascii")


def create_qr_token(
    passenger_id: str,
    route_id: str,
    bus_id: str,
    seat: str,
    boarding_window: str,
    secret: str,
) -> str:
    """Create a full QR boarding pass token (payload + signature).

    The token format is: base64url(payload).base64url(signature)
    where payload = "passenger_id|route_id|bus_id|seat|boarding_window|timestamp"

    Args:
        passenger_id: UUID of the passenger
        route_id: UUID of the bus route
        bus_id: UUID of the bus
        seat: Seat number string (e.g. "12A")
        boarding_window: ISO format boarding window start time
        secret: HMAC secret key

    Returns:
        Complete signed token string.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    payload = f"{passenger_id}|{route_id}|{bus_id}|{seat}|{boarding_window}|{timestamp}"
    payload_b64 = base64.urlsafe_b64encode(payload.encode("utf-8")).rstrip(b"=").decode("ascii")
    signature = create_hmac_signature(payload, secret)
    return f"{payload_b64}.{signature}"


def verify_qr_token(token: str, secret: str) -> tuple[bool, dict | None]:
    """Verify a QR boarding pass token and extract its payload.

    Uses hmac.compare_digest for timing-safe signature comparison.

    Args:
        token: The complete token string (payload.signature)
        secret: The HMAC secret key

    Returns:
        Tuple of (is_valid: bool, payload_dict: dict | None).
        payload_dict contains the decoded fields if valid, None otherwise.
    """
    try:
        payload_b64, signature = token.rsplit(".", 1)
    except ValueError:
        return False, None

    # Add padding back for base64 decode
    payload_b64 += "=" * (4 - len(payload_b64) % 4)
    try:
        payload = base64.urlsafe_b64decode(payload_b64).decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        return False, None

    # Timing-safe comparison
    expected_sig = create_hmac_signature(payload, secret)
    if not hmac.compare_digest(expected_sig, signature):
        return False, None

    # Parse payload fields
    fields = payload.split("|")
    if len(fields) != 6:
        return False, None

    return True, {
        "passenger_id": fields[0],
        "route_id": fields[1],
        "bus_id": fields[2],
        "seat": fields[3],
        "boarding_window": fields[4],
        "signed_at": fields[5],
    }
