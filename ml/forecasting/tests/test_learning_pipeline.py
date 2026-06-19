"""Tests for continuous-learning ML utilities."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from ml.forecasting import build_ground_truth, evaluate, retraining


def test_build_ground_truth_creates_route_day_rows(tmp_path: Path) -> None:
    """Ground-truth builder should join forecasts, overrides, and outcomes."""

    input_dir = tmp_path / "exports"
    input_dir.mkdir()
    pd.DataFrame(
        [
            {
                "id": "snapshot-1",
                "tenant_id": "tenant-1",
                "route_id": "route-1",
                "forecast_date": "2026-06-20",
                "predicted_volume": 100,
                "surge_probability": 0.8,
                "risk_level": "high",
                "recommended_action": "Open extra boarding lane",
                "model_version": "v1",
                "model_source": "ml_bundle",
                "model_confidence": 0.7,
                "confidence_lower": 80,
                "confidence_upper": 130,
                "created_at": "2026-06-19T10:00:00Z",
            }
        ]
    ).to_csv(input_dir / "forecast_snapshots.csv", index=False)
    pd.DataFrame(
        [
            {
                "forecast_snapshot_id": "snapshot-1",
                "action_taken": "modified",
                "override_type": "operator_judgment",
                "final_action": "Open two lanes",
                "decided_at": "2026-06-19T10:05:00Z",
            }
        ]
    ).to_csv(input_dir / "operator_overrides.csv", index=False)
    pd.DataFrame(
        [
            {
                "tenant_id": "tenant-1",
                "route_id": "route-1",
                "service_date": "2026-06-20",
                "actual_passenger_count": 140,
                "peak_queue_length": 30,
                "average_wait_time_minutes": 7,
                "wait_time_p95_minutes": 13,
                "extra_buses_dispatched": 1,
                "lanes_opened": 2,
                "missed_boardings": 0,
                "overcrowding_incident": False,
            }
        ]
    ).to_csv(input_dir / "operational_outcomes.csv", index=False)

    output = tmp_path / "ground_truth_route_days.csv"
    df = build_ground_truth.build_ground_truth(input_dir, output)
    metadata = json.loads(output.with_suffix(".meta.json").read_text())

    assert len(df) == 1
    assert df.iloc[0]["actual_passenger_count"] == 140
    assert df.iloc[0]["admin_action_taken"] == "modified"
    assert "actual_passenger_count" not in metadata["feature_columns"]
    assert "wait_time_p95" not in metadata["feature_columns"]


def test_retraining_gate_requires_metric_gain() -> None:
    """Candidate promotion needs surge gain and bounded MAE regression."""

    champion = {"avg_mae": 100, "avg_surge_f1": 0.70, "avg_surge_recall": 0.72}
    improved = {"avg_mae": 104, "avg_surge_f1": 0.74, "avg_surge_recall": 0.73}
    regressed = {"avg_mae": 112, "avg_surge_f1": 0.76, "avg_surge_recall": 0.78}

    passed, reasons = retraining.candidate_passes_gate(champion, improved)
    assert passed
    assert "surge_f1_improved" in reasons

    passed, reasons = retraining.candidate_passes_gate(champion, regressed)
    assert not passed
    assert "mae_regression_over_5_percent" in reasons


def test_evaluate_exports_comparison_files(tmp_path: Path, monkeypatch) -> None:
    """Evaluation report should write CSV, JSON, and graph artifacts."""

    raw_path = tmp_path / "ridership_synthetic.csv"
    artifact_dir = tmp_path / "artifacts"
    artifact_dir.mkdir()

    rows = []
    for day in pd.date_range("2026-01-01", periods=20):
        rows.append(
            {
                "date": day.isoformat(),
                "route_id": "route-1",
                "route_label": "Route 1",
                "passenger_count": 100 + day.day,
                "is_holiday": 0,
                "day_of_week": day.dayofweek,
                "is_weekend": int(day.dayofweek >= 5),
                "is_terminal_closure": 0,
            }
        )
    pd.DataFrame(rows).to_csv(raw_path, index=False)
    (artifact_dir / "eval_summary.json").write_text(
        json.dumps(
            {
                "route-1": {
                    "mae": 10,
                    "rmse": 12,
                    "mape": 8,
                    "surge_precision": 0.8,
                    "surge_recall": 0.9,
                    "surge_f1": 0.85,
                },
                "overall_passed": True,
            }
        )
    )

    monkeypatch.setattr(evaluate, "RAW_DATA_CANDIDATES", [raw_path])
    monkeypatch.setattr(evaluate, "ARTIFACT_CANDIDATES", [artifact_dir])
    monkeypatch.setattr(evaluate, "OUTPUT_DIR", artifact_dir)

    comparison = evaluate.build_comparison()

    assert not comparison.empty
    assert (artifact_dir / "baseline_comparison.csv").exists()
    assert (artifact_dir / "baseline_comparison.json").exists()
