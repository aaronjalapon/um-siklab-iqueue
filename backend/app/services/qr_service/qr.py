"""QR boarding pass service — token generation, verification, and rendering.

Generates HMAC-SHA256 signed tokens for offline gate scanning.
Tokens are base64url-encoded and embedded in QR PNG images.

Token format: base64url(payload).base64url(signature)
Payload: passenger_id|route_id|bus_id|seat|boarding_window|timestamp
"""

from __future__ import annotations

import io
from uuid import UUID

import qrcode
from qrcode.image.pil import PilImage

from app.core.security import create_qr_token, verify_qr_token
from app.models.booking import Booking
from app.models.bus import Bus
from app.models.bus_route import BusRoute


class QRService:
    """QR boarding pass generation and verification service.

    Uses HMAC-SHA256 from app.core.security for signing and the qrcode
    library for PNG image rendering.

    Usage:
        service = QRService(secret=os.getenv("QR_HMAC_SECRET"))
        token = service.generate_token(booking, route, bus)
        is_valid, payload = service.verify_token(token)
        png_bytes = service.render_qr(token)
    """

    def __init__(self, secret: str | None = None):
        """Initialize the QR service with an HMAC secret.

        Args:
            secret: HMAC secret key. If None, loaded from QR_HMAC_SECRET env var.
        """
        if secret is None:
            from app.core.config import get_settings
            secret = get_settings().QR_HMAC_SECRET
        self._secret = secret

    def generate_token(
        self,
        booking: Booking,
        route: BusRoute | None = None,
        bus: Bus | None = None,
    ) -> str:
        """Create a signed QR boarding pass token for a booking.

        Args:
            booking: The Booking ORM instance
            route: BusRoute (optional — if not provided, uses bus_id as route_id)
            bus: Bus (optional — if not provided, uses booking.bus_id)

        Returns:
            Signed token string in base64url format
        """
        route_id = str(route.id) if route else str(booking.bus_id)
        bus_id = str(bus.id) if bus else str(booking.bus_id)

        return create_qr_token(
            passenger_id=str(booking.passenger_id),
            route_id=route_id,
            bus_id=bus_id,
            seat=booking.seat_number,
            boarding_window=booking.boarding_window_start.isoformat(),
            secret=self._secret,
        )

    def verify_token(self, token: str) -> tuple[bool, dict | None]:
        """Verify a QR boarding pass token.

        Uses timing-safe HMAC comparison to prevent side-channel attacks.

        Args:
            token: The complete token string (payload.signature)

        Returns:
            (is_valid, payload_dict) — payload_dict has passenger_id, route_id,
            bus_id, seat, boarding_window, signed_at if valid.
        """
        return verify_qr_token(token, self._secret)

    def render_qr(self, token: str) -> bytes:
        """Render a token as a QR code PNG image.

        Args:
            token: The signed token string

        Returns:
            PNG image as raw bytes (suitable for StreamingResponse)
        """
        qr = qrcode.QRCode(
            version=None,  # auto-fit
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(token)
        qr.make(fit=True)

        img = qr.make_image(
            fill_color="black",
            back_color="white",
            image_factory=PilImage,
        )

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
