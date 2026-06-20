#!/usr/bin/env python3
"""Create or verify the deployable six-route forecasting bundle manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROUTES = (
    "cagayan-iligan",
    "cotabato-zambo",
    "davao-butuan",
    "davao-cagayan",
    "davao-cotabato",
    "davao-general-santos",
)
SHARED_FILES = (
    "surge_clf_global.pkl",
    "surge_clf_features.pkl",
    "baseline_comparison.json",
)
MANIFEST_NAME = "bundle_manifest.json"


def required_files() -> list[str]:
    """Return all runtime and evidence files required for deployment."""

    route_files: list[str] = []
    for route in ROUTES:
        route_files.extend(
            (
                f"prophet_{route}.pkl",
                f"lstm_{route}_best.pt",
                f"{route}_scaler.pkl",
            )
        )
    return [*route_files, *SHARED_FILES]


def sha256(path: Path) -> str:
    """Calculate a file SHA-256 digest without loading it into memory."""

    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_manifest(artifacts: Path) -> dict[str, Any]:
    """Build a deterministic manifest for an artifact directory."""

    missing = [name for name in required_files() if not (artifacts / name).is_file()]
    if missing:
        raise ValueError(f"Forecast bundle is incomplete: {', '.join(missing)}")
    metadata_path = artifacts / "model_metadata.json"
    metadata = (
        json.loads(metadata_path.read_text(encoding="utf-8"))
        if metadata_path.exists()
        else {}
    )
    files = {
        name: {
            "sha256": sha256(artifacts / name),
            "bytes": (artifacts / name).stat().st_size,
        }
        for name in required_files()
    }
    return {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "bundle_version": metadata.get("version", "legacy-hackathon-bundle"),
        "evaluation_protocol": metadata.get(
            "evaluation_protocol", "legacy_validation_metrics"
        ),
        "synthetic_data": metadata.get("data_type", "synthetic") == "synthetic",
        "route_count": len(ROUTES),
        "total_bytes": sum(item["bytes"] for item in files.values()),
        "files": files,
    }


def verify_manifest(artifacts: Path) -> dict[str, Any]:
    """Verify required files and checksums against the saved manifest."""

    manifest_path = artifacts / MANIFEST_NAME
    if not manifest_path.exists():
        raise ValueError(
            f"Missing {manifest_path}; run with --write-manifest before building"
        )
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected_files = manifest.get("files", {})
    missing = [name for name in required_files() if name not in expected_files]
    if missing:
        raise ValueError(f"Manifest omits required files: {', '.join(missing)}")
    for name in required_files():
        path = artifacts / name
        if not path.is_file():
            raise ValueError(f"Bundle file is missing: {name}")
        if sha256(path) != expected_files[name].get("sha256"):
            raise ValueError(f"Bundle checksum mismatch: {name}")
    return manifest


def main() -> None:
    """Run manifest generation or verification from the command line."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifacts", type=Path, required=True)
    parser.add_argument("--write-manifest", action="store_true")
    args = parser.parse_args()
    if args.write_manifest:
        manifest = build_manifest(args.artifacts)
        (args.artifacts / MANIFEST_NAME).write_text(
            json.dumps(manifest, indent=2),
            encoding="utf-8",
        )
        print(f"Wrote {args.artifacts / MANIFEST_NAME}")
    else:
        manifest = verify_manifest(args.artifacts)
        print(
            "Forecast bundle verified: "
            f"{manifest['route_count']} routes, {manifest['total_bytes']} bytes, "
            f"protocol={manifest['evaluation_protocol']}"
        )


if __name__ == "__main__":
    main()
