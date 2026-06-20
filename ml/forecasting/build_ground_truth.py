"""Build route-day ground truth from forecast feedback exports.

The script expects CSV exports of the learning tables created by the backend:

    forecast_snapshots.csv
    operator_overrides.csv
    operational_outcomes.csv
    bookings.csv          optional
    buses.csv             optional, used to map bookings to routes

It writes a DVC-friendly route-day dataset where pre-departure model features
are joined with post-operation outcomes. Manual overrides are included as
human-in-the-loop labels, but they are not treated as "the model was wrong"
unless the actual outcome confirms it.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.services.ground_truth import build_ground_truth_records  # noqa: E402

FEATURE_COLUMNS = [
    "tenant_id",
    "route_id",
    "service_date",
    "forecast_snapshot_id",
    "predicted_volume",
    "surge_probability",
    "risk_level",
    "recommended_action",
    "model_version",
    "model_source",
    "model_confidence",
    "confidence_lower",
    "confidence_upper",
    "is_weekend",
    "day_of_week",
    "month",
    "is_holiday",
    "prebooked_passengers",
    "admin_action_taken",
    "override_type",
    "recommendation_followed",
]

TARGET_COLUMNS = [
    "actual_passenger_count",
    "actual_surge",
    "peak_queue_length",
    "average_wait_time_minutes",
    "wait_time_p95",
    "extra_buses_dispatched",
    "lanes_opened",
    "missed_boardings",
    "overcrowding_incident",
]


def _read_csv(input_dir: Path, name: str) -> pd.DataFrame:
    """Read a CSV export or return an empty DataFrame."""

    path = input_dir / name
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


def _latest_by(df: pd.DataFrame, keys: list[str], sort_col: str) -> pd.DataFrame:
    """Return the latest row per key based on a sortable timestamp column."""

    if df.empty:
        return df
    work = df.copy()
    if sort_col in work.columns:
        work[sort_col] = pd.to_datetime(work[sort_col], errors="coerce")
        work = work.sort_values(sort_col)
    return work.drop_duplicates(keys, keep="last")


def _holiday_flag(service_date: pd.Timestamp) -> bool:
    """Best-effort ASEAN holiday lookup."""

    try:
        from data.pipeline.holidays import HolidaysASEAN

        return any(
            HolidaysASEAN.is_holiday(service_date.date(), country)
            for country in ("PH", "ID", "VN", "MY")
        )
    except Exception:
        return False


def _booking_counts(bookings: pd.DataFrame, buses: pd.DataFrame) -> pd.DataFrame:
    """Aggregate known bookings into tenant-route-day counts."""

    required_booking_cols = {"bus_id", "departure_date", "status"}
    required_bus_cols = {"id", "tenant_id", "route_id"}
    if (
        bookings.empty
        or buses.empty
        or not required_booking_cols.issubset(bookings.columns)
        or not required_bus_cols.issubset(buses.columns)
    ):
        return pd.DataFrame(
            columns=["tenant_id", "route_id", "service_date", "prebooked_passengers"]
        )

    confirmed_statuses = {"confirmed", "boarded", "pending"}
    work = bookings.copy()
    work["status"] = work["status"].astype(str).str.lower()
    work = work[work["status"].isin(confirmed_statuses)]
    work["service_date"] = pd.to_datetime(work["departure_date"]).dt.date.astype(str)

    bus_map = buses[["id", "tenant_id", "route_id"]].rename(columns={"id": "bus_id"})
    work = work.merge(bus_map, on="bus_id", how="left")
    work = work.dropna(subset=["tenant_id", "route_id"])

    return (
        work.groupby(["tenant_id", "route_id", "service_date"])
        .size()
        .reset_index(name="prebooked_passengers")
    )


def build_ground_truth(input_dir: Path, output_path: Path) -> pd.DataFrame:
    """Create and save the route-day ground-truth dataset."""

    snapshots = _read_csv(input_dir, "forecast_snapshots.csv")
    overrides = _read_csv(input_dir, "operator_overrides.csv")
    outcomes = _read_csv(input_dir, "operational_outcomes.csv")
    bookings = _read_csv(input_dir, "bookings.csv")
    buses = _read_csv(input_dir, "buses.csv")

    if snapshots.empty:
        raise FileNotFoundError(f"Missing forecast_snapshots.csv in {input_dir}")
    if outcomes.empty:
        raise FileNotFoundError(f"Missing operational_outcomes.csv in {input_dir}")

    booking_counts = _booking_counts(bookings, buses)
    holiday_flags = {
        (
            str(row["tenant_id"]),
            str(row["route_id"]),
            pd.Timestamp(row["forecast_date"]).date().isoformat(),
        ): _holiday_flag(pd.Timestamp(row["forecast_date"]))
        for row in snapshots.to_dict(orient="records")
    }
    records = build_ground_truth_records(
        snapshots.to_dict(orient="records"),
        overrides.to_dict(orient="records"),
        outcomes.to_dict(orient="records"),
        booking_counts.to_dict(orient="records"),
        holiday_flags,
    )
    final = pd.DataFrame(records)
    output_cols = [c for c in FEATURE_COLUMNS + TARGET_COLUMNS if c in final.columns]
    final = final[output_cols]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    final.to_csv(output_path, index=False)

    metadata_path = output_path.with_suffix(".meta.json")
    metadata = {
        "rows": len(final),
        "feature_columns": [c for c in FEATURE_COLUMNS if c in final.columns],
        "target_columns": [c for c in TARGET_COLUMNS if c in final.columns],
        "source_tables": [
            "forecast_snapshots",
            "operator_overrides",
            "operational_outcomes",
            "bookings",
            "buses",
        ],
    }
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return final


def main() -> None:
    """CLI entry point."""

    parser = argparse.ArgumentParser(description="Build IQueue ground-truth route-day data")
    parser.add_argument("--input-dir", type=Path, default=Path("data/learning_exports"))
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ml/forecasting/data/cleaned/ground_truth_route_days.csv"),
    )
    args = parser.parse_args()

    df = build_ground_truth(args.input_dir, args.output)
    print(f"Wrote {len(df):,} ground-truth rows to {args.output}")


if __name__ == "__main__":
    main()
