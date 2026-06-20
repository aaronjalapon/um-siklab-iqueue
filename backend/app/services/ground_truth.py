"""Shared route-day ground-truth construction for retraining and demo replay."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import date, datetime
from statistics import median
from typing import Any, Iterable


def _date_string(value: Any) -> str:
    """Normalize date-like values to an ISO service date."""

    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)[:10]


def _serialized_features(value: Any) -> dict[str, Any]:
    """Normalize JSON features exported by PostgreSQL or CSV."""

    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value:
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def build_ground_truth_records(
    snapshots: Iterable[dict[str, Any]],
    overrides: Iterable[dict[str, Any]],
    outcomes: Iterable[dict[str, Any]],
    booking_counts: Iterable[dict[str, Any]] = (),
    holiday_flags: dict[tuple[str, str, str], bool] | None = None,
) -> list[dict[str, Any]]:
    """Join latest forecasts, decisions, and outcomes into route-day rows."""

    latest_snapshots: dict[tuple[str, str, str], dict[str, Any]] = {}
    for snapshot in snapshots:
        key = (
            str(snapshot["tenant_id"]),
            str(snapshot["route_id"]),
            _date_string(snapshot.get("forecast_date") or snapshot.get("service_date")),
        )
        previous = latest_snapshots.get(key)
        if previous is None or str(snapshot.get("created_at", "")) >= str(
            previous.get("created_at", "")
        ):
            latest_snapshots[key] = snapshot

    latest_overrides: dict[str, dict[str, Any]] = {}
    for override in overrides:
        snapshot_id = str(override["forecast_snapshot_id"])
        previous = latest_overrides.get(snapshot_id)
        if previous is None or str(override.get("decided_at", "")) >= str(
            previous.get("decided_at", "")
        ):
            latest_overrides[snapshot_id] = override

    prebooked = {
        (
            str(item["tenant_id"]),
            str(item["route_id"]),
            _date_string(item["service_date"]),
        ): int(item.get("prebooked_passengers", 0))
        for item in booking_counts
    }
    outcome_rows = list(outcomes)
    route_actuals: dict[str, list[float]] = defaultdict(list)
    for outcome in outcome_rows:
        route_actuals[str(outcome["route_id"])].append(
            float(outcome["actual_passenger_count"])
        )
    thresholds = {
        route_id: median(values) * 1.8
        for route_id, values in route_actuals.items()
        if values
    }

    rows: list[dict[str, Any]] = []
    for outcome in outcome_rows:
        service_date = _date_string(outcome["service_date"])
        key = (
            str(outcome["tenant_id"]),
            str(outcome["route_id"]),
            service_date,
        )
        snapshot = latest_snapshots.get(key)
        if snapshot is None:
            continue
        snapshot_id = str(snapshot.get("id") or snapshot.get("forecast_snapshot_id"))
        override = latest_overrides.get(snapshot_id, {})
        action = override.get("action_taken") or "no_action_logged"
        action = getattr(action, "value", action)
        recommended = snapshot.get("recommended_action") or ""
        final_action = override.get("final_action") or ""
        service_day = date.fromisoformat(service_date)
        features = _serialized_features(snapshot.get("input_features"))
        is_holiday = (
            (holiday_flags or {}).get(key)
            if holiday_flags is not None
            else bool(features.get("is_holiday", False))
        )
        actual_count = int(outcome["actual_passenger_count"])
        rows.append(
            {
                "tenant_id": key[0],
                "route_id": key[1],
                "service_date": service_date,
                "forecast_snapshot_id": snapshot_id,
                "predicted_volume": int(snapshot["predicted_volume"]),
                "surge_probability": float(snapshot["surge_probability"]),
                "risk_level": snapshot["risk_level"],
                "recommended_action": recommended,
                "model_version": snapshot.get("model_version"),
                "model_source": snapshot.get("model_source"),
                "model_confidence": snapshot.get("model_confidence"),
                "confidence_lower": snapshot.get("confidence_lower"),
                "confidence_upper": snapshot.get("confidence_upper"),
                "is_weekend": service_day.weekday() >= 5,
                "day_of_week": service_day.weekday(),
                "month": service_day.month,
                "is_holiday": bool(is_holiday),
                "prebooked_passengers": prebooked.get(key, 0),
                "admin_action_taken": str(action).lower(),
                "override_type": override.get("override_type"),
                "recommendation_followed": (
                    str(action).lower() == "accepted"
                    or bool(final_action and final_action == recommended)
                ),
                "actual_passenger_count": actual_count,
                "actual_surge": actual_count >= thresholds.get(key[1], float("inf")),
                "peak_queue_length": outcome.get("peak_queue_length"),
                "average_wait_time_minutes": outcome.get(
                    "average_wait_time_minutes"
                ),
                "wait_time_p95": outcome.get("wait_time_p95_minutes"),
                "extra_buses_dispatched": int(
                    outcome.get("extra_buses_dispatched", 0)
                ),
                "lanes_opened": int(outcome.get("lanes_opened", 1)),
                "missed_boardings": int(outcome.get("missed_boardings", 0)),
                "overcrowding_incident": bool(
                    outcome.get("overcrowding_incident", False)
                ),
            }
        )
    return sorted(rows, key=lambda row: (row["route_id"], row["service_date"]))
