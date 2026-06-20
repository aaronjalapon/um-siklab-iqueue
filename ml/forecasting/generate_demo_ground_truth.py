"""Generate a realistic ground-truth CSV for retraining demo purposes.

This script slices the tail of the synthetic ridership dataset and formats
it as the ground-truth schema expected by retraining.py (one row per
route-day, with mae and surge_f1 columns so _load_metrics() can parse it).

Usage:
    python ml/forecasting/generate_demo_ground_truth.py
    python ml/forecasting/generate_demo_ground_truth.py --rows 60
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

RAW_CANDIDATES = [
    PROJECT_ROOT / "ml/forecasting/data/raw/ridership_synthetic.csv",
    PROJECT_ROOT / "ml/forecasting/ml/forecasting/data/raw/ridership_synthetic.csv",
]
DEFAULT_OUTPUT = (
    PROJECT_ROOT / "ml/forecasting/data/cleaned/ground_truth_route_days.csv"
)


def _find_raw() -> Path:
    for candidate in RAW_CANDIDATES:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        "ridership_synthetic.csv not found. Run: dvc pull  or check ml/forecasting/data/raw/"
    )


def build_demo_ground_truth(rows: int = 60, seed: int = 42) -> pd.DataFrame:
    """Slice the last N rows from synthetic data and add outcome columns."""

    rng = np.random.default_rng(seed)
    raw_path = _find_raw()
    raw = pd.read_csv(raw_path, parse_dates=["date"])
    if "is_terminal_closure" in raw.columns:
        raw = raw[raw["is_terminal_closure"] == 0]

    # Take the chronological tail (most recent days) as "new incoming data"
    sample = (
        raw.sort_values(["route_id", "date"])
        .groupby("route_id")
        .tail(rows // raw["route_id"].nunique() + 1)
        .sort_values("date")
        .head(rows)
        .copy()
    )

    # Rename to the ground-truth target schema
    sample = sample.rename(
        columns={"passenger_count": "actual_passenger_count"}
    )

    # Compute per-route surge thresholds (median × 1.8 from full train window)
    thresholds: dict[str, float] = {}
    for route_id, group in raw.groupby("route_id"):
        thresholds[str(route_id)] = float(group["passenger_count"].median() * 1.8)

    sample["actual_surge"] = sample.apply(
        lambda row: int(
            row["actual_passenger_count"] >= thresholds.get(str(row["route_id"]), 999)
        ),
        axis=1,
    )

    # Simulate model predictions (slightly imperfect to make the gate interesting)
    noise = rng.normal(0, 8, len(sample))
    predicted = np.maximum(0, sample["actual_passenger_count"].values + noise)

    sample["mae"] = np.abs(sample["actual_passenger_count"].values - predicted)

    surge_actual = sample["actual_surge"].values.astype(bool)
    surge_pred = (predicted >= np.array([thresholds.get(str(r), 999) for r in sample["route_id"]])).astype(bool)
    tp = (surge_actual & surge_pred).astype(int)
    fp = (~surge_actual & surge_pred).astype(int)
    fn = (surge_actual & ~surge_pred).astype(int)
    precision = tp / np.maximum(tp + fp, 1)
    recall = tp / np.maximum(tp + fn, 1)
    sample["surge_f1"] = (
        2 * precision * recall / np.maximum(precision + recall, 1e-8)
    )
    sample["surge_recall"] = recall

    return sample


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate demo ground-truth CSV for IQueue retraining gate"
    )
    parser.add_argument(
        "--rows", type=int, default=60, help="Number of ground-truth rows to generate"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Output CSV path",
    )
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    df = build_demo_ground_truth(rows=args.rows, seed=args.seed)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output, index=False)
    print(f"✓ Wrote {len(df):,} ground-truth rows to {args.output}")
    print(f"  Routes: {sorted(df['route_id'].unique())}")
    print(f"  Surge events: {int(df['actual_surge'].sum())} / {len(df)}")


if __name__ == "__main__":
    main()
