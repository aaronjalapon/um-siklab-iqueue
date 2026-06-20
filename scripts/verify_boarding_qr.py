"""Offline QR signature and timing verifier for provisioned gate devices."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.security import validate_qr_timing, verify_qr_token


def main() -> None:
    """Verify a token without database or network access."""

    parser = argparse.ArgumentParser(description="Verify an IQueue boarding QR")
    parser.add_argument("token", nargs="?", help="QR token; reads stdin when omitted")
    args = parser.parse_args()
    token = args.token or sys.stdin.read().strip()
    secret = os.getenv("QR_HMAC_SECRET")
    if not secret:
        raise SystemExit("QR_HMAC_SECRET is required on the provisioned device")

    signature_valid, payload = verify_qr_token(token, secret)
    if not signature_valid or payload is None:
        result = {"valid": False, "reason": "invalid_signature"}
    else:
        valid, reason = validate_qr_timing(payload)
        result = {
            "valid": valid,
            "reason": reason,
            "signature_valid": True,
            "payload": payload,
        }
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["valid"] else 1)


if __name__ == "__main__":
    main()
