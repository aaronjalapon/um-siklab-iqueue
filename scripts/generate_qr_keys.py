#!/usr/bin/env python3
"""Generate QR boarding pass signing keys for IQueue.

Generates a cryptographically secure HMAC-SHA256 secret key
and writes it to .env for use by the QR boarding pass service.

Usage:
    python scripts/generate_qr_keys.py
    python scripts/generate_qr_keys.py --output .env.production

WARNING: Rotating this key invalidates ALL existing boarding passes.
         Only run this once during initial setup.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Add backend to path so we can import security module
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.security import generate_secret_key


def update_env_file(env_path: Path, key: str) -> None:
    """Update or add QR_HMAC_SECRET in the .env file."""
    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()
        updated = False
        new_lines = []
        for line in lines:
            if line.startswith("QR_HMAC_SECRET="):
                new_lines.append(f"QR_HMAC_SECRET={key}")
                updated = True
            else:
                new_lines.append(line)
        if not updated:
            new_lines.append(f"QR_HMAC_SECRET={key}")
        content = "\n".join(new_lines) + "\n"
    else:
        # Create a minimal .env with just the QR key
        content = (
            "# IQueue Environment Variables\n"
            f"QR_HMAC_SECRET={key}\n"
            "# Copy .env.example for the full set of variables\n"
            "# and fill in QR_HMAC_SECRET above.\n"
        )

    env_path.write_text(content, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate QR boarding pass HMAC signing keys for IQueue."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".env"),
        help="Path to .env file to update (default: .env)",
    )
    args = parser.parse_args()

    # Generate key
    key = generate_secret_key()

    # Update .env
    env_path = args.output.resolve()
    update_env_file(env_path, key)

    print(f"\n✅ QR signing key generated!")
    print(f"   Key:  {key}")
    print(f"   File: {env_path}")
    print(f"\n⚠️  WARNING: Rotating this key invalidates ALL existing boarding passes.")
    print(f"   Keep this key secret and never commit it to version control.\n")


if __name__ == "__main__":
    main()
