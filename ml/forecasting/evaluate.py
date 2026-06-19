"""Generate model-comparison evidence for IQueue forecasting.

Outputs:
    - baseline_comparison.csv
    - baseline_comparison.json
    - model_comparison.png

The report combines directly computed simple baselines with saved notebook
metrics when available. This gives judges concrete evidence for the gains from
the hybrid Prophet + LSTM + LightGBM architecture.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

RAW_DATA_CANDIDATES = [
    Path("ml/forecasting/data/raw/ridership_synthetic.csv"),
    Path("ml/forecasting/ml/forecasting/data/raw/ridership_synthetic.csv"),
]
ARTIFACT_CANDIDATES = [
    Path("iqueue_artifacts/artifacts"),
    Path("ml/forecasting/artifacts/iqueue_artifacts/artifacts"),
    Path("backend/app/services/forecasting/artifacts"),
]
OUTPUT_DIR = Path("iqueue_artifacts/artifacts")


def _first_existing(paths: list[Path]) -> Path | None:
    """Return the first existing path from a list."""

    for path in paths:
        if path.exists():
            return path
    return None


def _load_json(path: Path) -> dict[str, Any]:
    """Load JSON if present, otherwise return an empty dict."""

    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _metrics(y_true: np.ndarray, y_pred: np.ndarray, threshold: float) -> dict[str, float]:
    """Compute demand and surge metrics."""

    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.maximum(np.asarray(y_pred, dtype=float), 0)
    mask = y_true > 1e-6
    actual_surge = y_true >= threshold
    predicted_surge = y_pred >= threshold

    tp = int(np.sum(actual_surge & predicted_surge))
    fp = int(np.sum(~actual_surge & predicted_surge))
    fn = int(np.sum(actual_surge & ~predicted_surge))
    tn = int(np.sum(~actual_surge & ~predicted_surge))

    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    false_alarm_rate = fp / (fp + tn) if fp + tn else 0.0

    return {
        "mae": float(np.mean(np.abs(y_true - y_pred))),
        "rmse": float(np.sqrt(np.mean((y_true - y_pred) ** 2))),
        "mape": float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100),
        "surge_precision": precision,
        "surge_recall": recall,
        "surge_f1": f1,
        "false_alarm_rate": false_alarm_rate,
    }


def _average_metric_dicts(route_metrics: list[dict[str, float]]) -> dict[str, float]:
    """Average a list of metric dicts."""

    keys = [
        "mae",
        "rmse",
        "mape",
        "surge_precision",
        "surge_recall",
        "surge_f1",
        "false_alarm_rate",
    ]
    return {
        key: float(np.mean([m.get(key, 0.0) for m in route_metrics]))
        for key in keys
    }


def _row(model: str, metrics: dict[str, Any], source: str) -> dict[str, Any]:
    """Build one comparison table row."""

    return {
        "model": model,
        "mae": _round_or_none(metrics.get("mae")),
        "rmse": _round_or_none(metrics.get("rmse")),
        "mape": _round_or_none(metrics.get("mape")),
        "surge_precision": _round_or_none(metrics.get("surge_precision"), 3),
        "surge_recall": _round_or_none(metrics.get("surge_recall"), 3),
        "surge_f1": _round_or_none(metrics.get("surge_f1"), 3),
        "false_alarm_rate": _round_or_none(metrics.get("false_alarm_rate"), 3),
        "source": source,
    }


def _round_or_none(value: Any, digits: int = 2) -> float | None:
    """Round numeric values while preserving unavailable metrics as null."""

    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
        return round(float(value), digits)
    except (TypeError, ValueError):
        return None


def _simple_baselines(raw_path: Path) -> list[dict[str, Any]]:
    """Compute yesterday and 7-day moving-average baselines."""

    df = pd.read_csv(raw_path, parse_dates=["date"])
    if "is_terminal_closure" in df.columns:
        df = df[df["is_terminal_closure"] == 0]
    df = df.sort_values(["route_id", "date"])

    yesterday_metrics: list[dict[str, float]] = []
    moving_avg_metrics: list[dict[str, float]] = []

    for _, route_df in df.groupby("route_id"):
        route_df = route_df.sort_values("date").copy()
        split_idx = int(len(route_df) * 0.8)
        train_df = route_df.iloc[:split_idx]
        test_df = route_df.iloc[split_idx:].copy()
        threshold = float(train_df["passenger_count"].median() * 1.8)

        route_df["yesterday_pred"] = route_df["passenger_count"].shift(1)
        route_df["ma7_pred"] = route_df["passenger_count"].shift(1).rolling(7).mean()
        preds = route_df.iloc[split_idx:].copy()
        preds["yesterday_pred"] = preds["yesterday_pred"].fillna(train_df["passenger_count"].median())
        preds["ma7_pred"] = preds["ma7_pred"].fillna(train_df["passenger_count"].median())

        actual = test_df["passenger_count"].values
        yesterday_metrics.append(_metrics(actual, preds["yesterday_pred"].values, threshold))
        moving_avg_metrics.append(_metrics(actual, preds["ma7_pred"].values, threshold))

    return [
        _row("Yesterday baseline", _average_metric_dicts(yesterday_metrics), "computed"),
        _row("7-day moving average", _average_metric_dicts(moving_avg_metrics), "computed"),
    ]


def _prophet_only_metrics(raw_path: Path, artifact_dir: Path) -> dict[str, Any] | None:
    """Evaluate saved per-route Prophet models when artifacts are available."""

    prophet_files = sorted(artifact_dir.glob("prophet_*.pkl"))
    if not prophet_files:
        return None

    try:
        import joblib
    except ImportError:
        return None

    df = pd.read_csv(raw_path, parse_dates=["date"])
    if "is_terminal_closure" in df.columns:
        df = df[df["is_terminal_closure"] == 0]
    df = df.sort_values(["route_id", "date"])
    route_metrics: list[dict[str, float]] = []

    for path in prophet_files:
        slug = path.stem.replace("prophet_", "")
        route_df = df[df["route_id"] == slug].sort_values("date")
        if route_df.empty:
            continue
        split_idx = int(len(route_df) * 0.8)
        train_df = route_df.iloc[:split_idx]
        test_df = route_df.iloc[split_idx:]
        threshold = float(train_df["passenger_count"].median() * 1.8)

        try:
            payload = joblib.load(path)
            model = payload["model"] if isinstance(payload, dict) else payload
            future = pd.DataFrame(
                {
                    "ds": test_df["date"],
                    "is_holiday": test_df["is_holiday"].astype(int),
                }
            )
            pred = model.predict(future)["yhat"].values
        except Exception:
            continue

        route_metrics.append(_metrics(test_df["passenger_count"].values, pred, threshold))

    if not route_metrics:
        return None
    return _average_metric_dicts(route_metrics)


def _aggregate_saved_metrics(metrics: dict[str, Any]) -> dict[str, Any] | None:
    """Aggregate per-route saved metrics from notebook JSON files."""

    route_metrics = [value for value in metrics.values() if isinstance(value, dict)]
    if not route_metrics:
        return None
    averaged = _average_metric_dicts(route_metrics)
    if "false_alarm_rate" not in route_metrics[0]:
        averaged["false_alarm_rate"] = None
    return averaged


def _lightgbm_row(metrics: dict[str, Any]) -> dict[str, Any] | None:
    """Aggregate LightGBM classifier-only surge metrics."""

    route_metrics = [value for value in metrics.values() if isinstance(value, dict)]
    if not route_metrics:
        return None
    averaged = {
        "mae": None,
        "rmse": None,
        "mape": None,
        "surge_precision": float(np.mean([m.get("precision", 0) for m in route_metrics])),
        "surge_recall": float(np.mean([m.get("recall", 0) for m in route_metrics])),
        "surge_f1": float(np.mean([m.get("f1", 0) for m in route_metrics])),
        "false_alarm_rate": None,
    }
    return _row("LightGBM surge classifier", averaged, "saved_metrics")


def build_comparison() -> pd.DataFrame:
    """Build the full comparison table and write report artifacts."""

    raw_path = _first_existing(RAW_DATA_CANDIDATES)
    artifact_dir = _first_existing(ARTIFACT_CANDIDATES) or OUTPUT_DIR
    rows: list[dict[str, Any]] = []

    if raw_path:
        rows.extend(_simple_baselines(raw_path))
        prophet_metrics = _prophet_only_metrics(raw_path, artifact_dir)
        if prophet_metrics:
            rows.append(_row("Prophet-only", prophet_metrics, "artifact_eval"))
        else:
            rows.append(_row("Prophet-only", {}, "not_available"))
    else:
        rows.extend(
            [
                _row("Yesterday baseline", {}, "raw_data_missing"),
                _row("7-day moving average", {}, "raw_data_missing"),
                _row("Prophet-only", {}, "raw_data_missing"),
            ]
        )

    baseline = _aggregate_saved_metrics(_load_json(artifact_dir / "eval_baseline.json"))
    if baseline:
        rows.append(_row("Prophet+LSTM hybrid", baseline, "saved_metrics"))
    else:
        rows.append(_row("Prophet+LSTM hybrid", {}, "not_available"))

    rows.append(
        _row(
            "LSTM-only",
            {},
            "not_available_separate_checkpoint",
        )
    )

    lightgbm = _lightgbm_row(_load_json(artifact_dir / "surge_clf_metrics.json"))
    if lightgbm:
        rows.append(lightgbm)
    else:
        rows.append(_row("LightGBM surge classifier", {}, "not_available"))

    combined = _aggregate_saved_metrics(_load_json(artifact_dir / "eval_summary.json"))
    if combined:
        rows.append(
            _row(
                "Prophet+LSTM+LightGBM decision model",
                combined,
                "saved_metrics",
            )
        )
    else:
        rows.append(_row("Prophet+LSTM+LightGBM decision model", {}, "not_available"))

    comparison = pd.DataFrame(rows)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    comparison.to_csv(OUTPUT_DIR / "baseline_comparison.csv", index=False)
    (OUTPUT_DIR / "baseline_comparison.json").write_text(
        comparison.to_json(orient="records", indent=2),
        encoding="utf-8",
    )
    _write_comparison_plot(comparison, OUTPUT_DIR / "model_comparison.png")
    return comparison


def _write_comparison_plot(comparison: pd.DataFrame, output_path: Path) -> None:
    """Write a compact bar chart for dashboard/report use."""

    try:
        import matplotlib.pyplot as plt
    except ImportError:
        return

    plot_df = comparison.dropna(subset=["mae", "surge_f1"], how="all").copy()
    if plot_df.empty:
        return

    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    x = np.arange(len(plot_df))
    labels = plot_df["model"].str.replace(" decision model", "", regex=False)

    axes[0].bar(x, plot_df["mae"].fillna(0), color="#2563eb")
    axes[0].set_title("Demand Error (MAE)")
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(labels, rotation=35, ha="right")
    axes[0].set_ylabel("Passengers")

    axes[1].bar(x, plot_df["surge_f1"].fillna(0), color="#16a34a")
    axes[1].set_title("Surge Detection F1")
    axes[1].set_ylim(0, 1)
    axes[1].set_xticks(x)
    axes[1].set_xticklabels(labels, rotation=35, ha="right")

    fig.tight_layout()
    fig.savefig(output_path, dpi=140, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    """CLI entry point."""

    comparison = build_comparison()
    print("Model comparison written:")
    print(f"  {OUTPUT_DIR / 'baseline_comparison.csv'}")
    print(f"  {OUTPUT_DIR / 'baseline_comparison.json'}")
    print(f"  {OUTPUT_DIR / 'model_comparison.png'}")
    print(comparison.to_string(index=False))


if __name__ == "__main__":
    main()
