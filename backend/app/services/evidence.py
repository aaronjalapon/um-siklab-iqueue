"""Read-only evidence aggregation for the hackathon demonstration."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.core.startup import get_forecasting_service


def _load_json(path: Path) -> Any:
    """Return parsed JSON or None when an optional artifact is absent."""

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None


def _repo_root() -> Path:
    """Resolve the repository/runtime root in local and container layouts."""

    candidates = (
        Path.cwd(),
        Path(__file__).resolve().parents[3],
        Path(__file__).resolve().parents[2],
    )
    return next(
        (candidate for candidate in candidates if (candidate / "evidence").is_dir()),
        Path.cwd(),
    )


def build_evidence_summary() -> dict[str, Any]:
    """Combine model, optimization, chatbot, QR, and impact evidence."""

    settings = get_settings()
    artifact_dir = Path(settings.FORECASTING_ARTIFACTS_DIR)
    root = _repo_root()
    comparison = _load_json(artifact_dir / "baseline_comparison.json") or []
    metadata = (
        _load_json(artifact_dir / "model_metadata.json")
        or _load_json(artifact_dir / "bundle_manifest.json")
        or {}
    )
    system_evidence = _load_json(root / "evidence/system_evidence.json") or {}
    chatbot_evidence = _load_json(root / "evidence/chatbot_evaluation.json") or {}
    forecasting = get_forecasting_service()

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data_disclosure": {
            "data_type": "synthetic",
            "field_pilot_completed": False,
            "statement": (
                "Prototype metrics use synthetic route-day data and deterministic "
                "simulation; they are not claims of measured field impact."
            ),
        },
        "active_bundle": {
            "version": forecasting.artifact_version if forecasting else None,
            "status": forecasting.bundle_status if forecasting else "unavailable",
            "loaded_routes": forecasting.loaded_routes if forecasting else [],
            "classifier_loaded": (
                forecasting.classifier_loaded if forecasting else False
            ),
            "metadata": metadata,
        },
        "model_comparison": comparison,
        "subsystems": {
            "forecasting": system_evidence.get("forecasting", {}),
            "seat_allocation": system_evidence.get("seat_allocation", {}),
            "chatbot": chatbot_evidence or system_evidence.get("chatbot", {}),
            "qr_boarding": system_evidence.get("qr_boarding", {}),
            "operational_simulation": system_evidence.get(
                "operational_simulation", {}
            ),
        },
    }
