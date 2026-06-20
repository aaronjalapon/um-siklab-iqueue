"""Canonical leakage-safe six-route forecasting training pipeline.

The command trains and evaluates all judge-facing ablations using a
chronological 70/15/15 split. The test window is never used for fitting,
early stopping, threshold selection, or multiplier selection.

Usage:
    python ml/forecasting/train.py --epochs 80
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.forecasting.splits import ChronologicalSplit, chronological_split

RAW_CANDIDATES = [
    PROJECT_ROOT / "ml/forecasting/data/raw/ridership_synthetic.csv",
    PROJECT_ROOT / "ml/forecasting/ml/forecasting/data/raw/ridership_synthetic.csv",
]
DEFAULT_ARTIFACTS = PROJECT_ROOT / "iqueue_artifacts/artifacts"
FEATURE_COLUMNS = [
    "passenger_count",
    "is_holiday",
    "dow_sin",
    "dow_cos",
    "is_weekend",
    "month_sin",
    "month_cos",
    "day_of_month",
]


@dataclass(slots=True)
class RouteData:
    """Prepared route frame and immutable chronological boundaries."""

    route_id: str
    frame: pd.DataFrame
    split: ChronologicalSplit
    train_end: int
    validation_end: int
    surge_threshold: float


def _raw_path(path: Path | None) -> Path:
    if path:
        return path
    for candidate in RAW_CANDIDATES:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("Forecasting raw data is unavailable; run dvc pull")


def prepare_routes(path: Path) -> dict[str, RouteData]:
    """Load route data, engineer known-at-prediction features, and split dates."""

    frame = pd.read_csv(path, parse_dates=["date"])
    if "is_terminal_closure" in frame:
        frame = frame[frame["is_terminal_closure"] == 0]
    prepared: dict[str, RouteData] = {}
    for route_id, route in frame.groupby("route_id"):
        route = route.sort_values("date").reset_index(drop=True).copy()
        route["dow_sin"] = np.sin(2 * np.pi * route["date"].dt.dayofweek / 7)
        route["dow_cos"] = np.cos(2 * np.pi * route["date"].dt.dayofweek / 7)
        route["month_sin"] = np.sin(2 * np.pi * route["date"].dt.month / 12)
        route["month_cos"] = np.cos(2 * np.pi * route["date"].dt.month / 12)
        route["day_of_month"] = (route["date"].dt.day - 1) / 30.0
        split = chronological_split(route)
        train_end = len(split.train)
        validation_end = train_end + len(split.validation)
        prepared[str(route_id)] = RouteData(
            route_id=str(route_id),
            frame=route,
            split=split,
            train_end=train_end,
            validation_end=validation_end,
            surge_threshold=float(split.train["passenger_count"].median() * 1.8),
        )
    return prepared


def _metrics(actual: np.ndarray, predicted: np.ndarray, threshold: float) -> dict[str, float]:
    actual = np.asarray(actual, dtype=float)
    predicted = np.maximum(np.asarray(predicted, dtype=float), 0)
    actual_surge = actual >= threshold
    predicted_surge = predicted >= threshold
    tp = int(np.sum(actual_surge & predicted_surge))
    fp = int(np.sum(~actual_surge & predicted_surge))
    fn = int(np.sum(actual_surge & ~predicted_surge))
    tn = int(np.sum(~actual_surge & ~predicted_surge))
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    mask = actual > 1e-6
    return {
        "mae": float(np.mean(np.abs(actual - predicted))),
        "rmse": float(np.sqrt(np.mean((actual - predicted) ** 2))),
        "mape": float(np.mean(np.abs((actual[mask] - predicted[mask]) / actual[mask])) * 100),
        "surge_precision": precision,
        "surge_recall": recall,
        "surge_f1": f1,
        "false_alarm_rate": fp / (fp + tn) if fp + tn else 0.0,
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
    }


def _classification_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict[str, float]:
    actual = np.asarray(actual, dtype=bool)
    predicted = np.asarray(predicted, dtype=bool)
    tp = int(np.sum(actual & predicted))
    fp = int(np.sum(~actual & predicted))
    fn = int(np.sum(actual & ~predicted))
    tn = int(np.sum(~actual & ~predicted))
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    return {
        "surge_precision": precision,
        "surge_recall": recall,
        "surge_f1": 2 * precision * recall / (precision + recall) if precision + recall else 0.0,
        "false_alarm_rate": fp / (fp + tn) if fp + tn else 0.0,
    }


def _sequences(values: np.ndarray, targets: np.ndarray, lookback: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    x_rows, y_rows, indices = [], [], []
    for target_index in range(lookback, len(values)):
        x_rows.append(values[target_index - lookback:target_index])
        y_rows.append(targets[target_index])
        indices.append(target_index)
    return np.asarray(x_rows, dtype=np.float32), np.asarray(y_rows, dtype=np.float32), np.asarray(indices)


def _train_lstm(
    x_train: np.ndarray,
    y_train: np.ndarray,
    x_validation: np.ndarray,
    y_validation: np.ndarray,
    *,
    epochs: int,
    seed: int,
) -> tuple[Any, int]:
    import torch
    from torch.utils.data import DataLoader, TensorDataset
    from backend.app.services.forecasting.model import ArtifactLSTMForecaster

    torch.manual_seed(seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = ArtifactLSTMForecaster(input_size=x_train.shape[2], hidden_size=64, num_layers=1).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion = torch.nn.MSELoss()
    loader = DataLoader(
        TensorDataset(torch.tensor(x_train), torch.tensor(y_train)),
        batch_size=32,
        shuffle=True,
    )
    best_state: dict[str, Any] | None = None
    best_loss = float("inf")
    best_epoch = 0
    patience = 12
    stale = 0
    validation_x = torch.tensor(x_validation, device=device)
    validation_y = torch.tensor(y_validation, device=device)
    for epoch in range(1, epochs + 1):
        model.train()
        for batch_x, batch_y in loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            loss = criterion(model(batch_x), batch_y)
            loss.backward()
            optimizer.step()
        model.eval()
        with torch.no_grad():
            validation_loss = float(criterion(model(validation_x), validation_y))
        if validation_loss < best_loss - 1e-6:
            best_loss = validation_loss
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
            best_epoch = epoch
            stale = 0
        else:
            stale += 1
        if stale >= patience:
            break
    if best_state is None:
        raise RuntimeError("LSTM training produced no checkpoint")
    model.load_state_dict(best_state)
    return model.cpu(), best_epoch


def _classifier_rows(routes: dict[str, RouteData]) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    route_names = sorted(routes)
    for route_id, data in routes.items():
        route = data.frame
        for index in range(14, len(route)):
            history = route["passenger_count"].iloc[:index]
            current = route.iloc[index]
            lag1 = float(history.iloc[-1])
            lag7 = float(history.iloc[-7])
            row = {
                "passenger_count": lag1,
                "is_holiday": float(route["is_holiday"].iloc[index - 1]),
                "pax_lag1": lag1,
                "pax_lag7": lag7,
                "pax_lag14": float(history.iloc[-14]),
                "pax_roll_mean_7": float(history.iloc[-7:].mean()),
                "pax_roll_std_7": float(history.iloc[-7:].std(ddof=0)),
                "pax_wow_change": (lag1 - lag7) / (lag7 + 1.0),
                "dow_sin_t1": float(current["dow_sin"]),
                "dow_cos_t1": float(current["dow_cos"]),
                "is_weekend_t1": float(current["is_weekend"]),
                "month_sin_t1": float(current["month_sin"]),
                "month_cos_t1": float(current["month_cos"]),
                "day_of_month_t1": float(current["day_of_month"]),
                "route_cat": float(route_names.index(route_id)),
                "route_id": route_id,
                "row_index": index,
                "target_surge": int(current["passenger_count"] >= data.surge_threshold),
            }
            row["partition"] = "train" if index < data.train_end else "validation" if index < data.validation_end else "test"
            rows.append(row)
    return pd.DataFrame(rows)


def _select_classifier_threshold(actual: np.ndarray, probabilities: np.ndarray) -> float:
    candidates = np.arange(0.30, 0.76, 0.05)
    return float(max(candidates, key=lambda threshold: _classification_metrics(actual, probabilities >= threshold)["surge_f1"]))


def _aggregate(route_metrics: dict[str, dict[str, float]]) -> dict[str, float]:
    keys = ["mae", "rmse", "mape", "surge_precision", "surge_recall", "surge_f1", "false_alarm_rate"]
    return {key: float(np.mean([metrics[key] for metrics in route_metrics.values()])) for key in keys}


def _bootstrap_macro_ci(
    route_metrics: dict[str, dict[str, float]],
    key: str,
    *,
    seed: int,
) -> tuple[float | None, float | None]:
    """Bootstrap a 95% interval across route-level test metrics."""

    values = np.asarray([metrics[key] for metrics in route_metrics.values()], dtype=float)
    values = values[~np.isnan(values)]
    if not len(values):
        return None, None
    rng = np.random.default_rng(seed)
    samples = rng.choice(values, size=(2000, len(values)), replace=True).mean(axis=1)
    lower, upper = np.percentile(samples, [2.5, 97.5])
    return round(float(lower), 4), round(float(upper), 4)


def _checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _json_safe(value: Any) -> Any:
    """Replace NumPy scalars and non-finite floats with valid JSON values."""

    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and not np.isfinite(value):
        return None
    return value


def run_pipeline(raw_path: Path, artifacts: Path, *, epochs: int, seed: int) -> pd.DataFrame:
    """Train all candidates and export untouched-test evidence and bundle."""

    import joblib
    import lightgbm as lgb
    import sklearn
    import torch
    from prophet import Prophet
    from sklearn.preprocessing import MinMaxScaler

    np.random.seed(seed)
    artifacts.mkdir(parents=True, exist_ok=True)
    routes = prepare_routes(raw_path)
    classifier_frame = _classifier_rows(routes)
    classifier_features = [column for column in classifier_frame.columns if column not in {"route_id", "row_index", "partition", "target_surge"}]
    train_classifier = classifier_frame[classifier_frame["partition"] == "train"]
    validation_classifier = classifier_frame[classifier_frame["partition"] == "validation"]
    classifier = lgb.LGBMClassifier(
        n_estimators=500,
        learning_rate=0.03,
        num_leaves=31,
        class_weight="balanced",
        random_state=seed,
        verbosity=-1,
    )
    classifier.fit(
        train_classifier[classifier_features],
        train_classifier["target_surge"],
        eval_set=[(validation_classifier[classifier_features], validation_classifier["target_surge"])],
        callbacks=[lgb.early_stopping(30, verbose=False)],
    )
    validation_probability = classifier.predict_proba(validation_classifier[classifier_features])[:, 1]
    classifier_threshold = _select_classifier_threshold(validation_classifier["target_surge"].values, validation_probability)
    joblib.dump(classifier, artifacts / "surge_clf_global.pkl")
    joblib.dump(classifier_features, artifacts / "surge_clf_features.pkl")

    model_route_metrics: dict[str, dict[str, dict[str, float]]] = defaultdict(dict)
    route_details: dict[str, Any] = {}
    for route_number, (route_id, data) in enumerate(sorted(routes.items())):
        route = data.frame
        scaler = MinMaxScaler().fit(data.split.train[FEATURE_COLUMNS])
        scaled = scaler.transform(route[FEATURE_COLUMNS]).astype(np.float32)
        target_scaled = scaled[:, 0]

        prophet = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
        prophet.add_regressor("is_holiday")
        prophet_train = data.split.train[["date", "passenger_count", "is_holiday"]].rename(columns={"date": "ds", "passenger_count": "y"})
        prophet.fit(prophet_train)
        prophet_input = route[["date", "is_holiday"]].rename(columns={"date": "ds"})
        prophet_prediction = prophet.predict(prophet_input)["yhat"].to_numpy()
        prophet_scaled = ((prophet_prediction - scaler.data_min_[0]) / (scaler.data_range_[0] + 1e-8)).astype(np.float32)

        x_lstm, y_all, indices = _sequences(scaled, target_scaled, 14)
        hybrid_values = np.column_stack([scaled, prophet_scaled])
        x_hybrid, _, _ = _sequences(hybrid_values, target_scaled, 14)
        train_mask = indices < data.train_end
        validation_mask = (indices >= data.train_end) & (indices < data.validation_end)
        test_mask = indices >= data.validation_end
        lstm_only, lstm_epoch = _train_lstm(x_lstm[train_mask], y_all[train_mask], x_lstm[validation_mask], y_all[validation_mask], epochs=epochs, seed=seed + route_number)
        hybrid, hybrid_epoch = _train_lstm(x_hybrid[train_mask], y_all[train_mask], x_hybrid[validation_mask], y_all[validation_mask], epochs=epochs, seed=seed + route_number + 100)

        def unscale(values: np.ndarray) -> np.ndarray:
            return values * scaler.data_range_[0] + scaler.data_min_[0]

        with torch.no_grad():
            lstm_prediction = unscale(lstm_only(torch.tensor(x_lstm[test_mask])).numpy())
            hybrid_prediction = unscale(hybrid(torch.tensor(x_hybrid[test_mask])).numpy())
            validation_hybrid = unscale(hybrid(torch.tensor(x_hybrid[validation_mask])).numpy())
        actual_test = route["passenger_count"].iloc[indices[test_mask]].to_numpy()
        actual_validation = route["passenger_count"].iloc[indices[validation_mask]].to_numpy()
        prophet_test = prophet_prediction[indices[test_mask]]
        yesterday = route["passenger_count"].shift(1).iloc[indices[test_mask]].to_numpy()
        moving_average = route["passenger_count"].shift(1).rolling(7).mean().iloc[indices[test_mask]].to_numpy()

        route_classifier = classifier_frame[classifier_frame["route_id"] == route_id]
        validation_rows = route_classifier[route_classifier["partition"] == "validation"]
        test_rows = route_classifier[route_classifier["partition"] == "test"]
        validation_prob = classifier.predict_proba(validation_rows[classifier_features])[:, 1]
        test_prob = classifier.predict_proba(test_rows[classifier_features])[:, 1]
        validation_prob_by_index = dict(zip(validation_rows["row_index"], validation_prob))
        test_prob_by_index = dict(zip(test_rows["row_index"], test_prob))
        aligned_validation_prob = np.asarray([validation_prob_by_index[index] for index in indices[validation_mask]])
        aligned_test_prob = np.asarray([test_prob_by_index[index] for index in indices[test_mask]])
        multiplier_candidates = [1.3, 1.5, 1.7, 2.0]
        multiplier = max(
            multiplier_candidates,
            key=lambda value: (
                _metrics(actual_validation, np.where(aligned_validation_prob >= classifier_threshold, validation_hybrid * value, validation_hybrid), data.surge_threshold)["surge_f1"],
                -_metrics(actual_validation, np.where(aligned_validation_prob >= classifier_threshold, validation_hybrid * value, validation_hybrid), data.surge_threshold)["mae"],
            ),
        )
        combined = np.where(aligned_test_prob >= classifier_threshold, hybrid_prediction * multiplier, hybrid_prediction)

        predictions = {
            "Yesterday baseline": yesterday,
            "7-day moving average": moving_average,
            "Prophet-only": prophet_test,
            "LSTM-only": lstm_prediction,
            "Prophet+LSTM hybrid": hybrid_prediction,
            "Prophet+LSTM+LightGBM decision model": combined,
        }
        for model_name, prediction in predictions.items():
            model_route_metrics[model_name][route_id] = _metrics(actual_test, prediction, data.surge_threshold)
        model_route_metrics["LightGBM surge classifier"][route_id] = {
            "mae": float("nan"), "rmse": float("nan"), "mape": float("nan"),
            **_classification_metrics(actual_test >= data.surge_threshold, aligned_test_prob >= classifier_threshold),
        }

        torch.save(
            {
                "model_state_dict": hybrid.state_dict(), "input_size": 9,
                "hidden_size": 64, "num_layers": 1, "lookback": 14,
            },
            artifacts / f"lstm_{route_id}_best.pt",
        )
        torch.save(
            {"model_state_dict": lstm_only.state_dict(), "input_size": 8, "hidden_size": 64, "num_layers": 1, "lookback": 14},
            artifacts / f"lstm_{route_id}_ablation.pt",
        )
        joblib.dump({"model": prophet, "route_id": route_id}, artifacts / f"prophet_{route_id}.pkl")
        joblib.dump(scaler, artifacts / f"{route_id}_scaler.pkl")
        route_details[route_id] = {
            "train": [str(data.split.train["date"].min().date()), str(data.split.train["date"].max().date())],
            "validation": [str(data.split.validation["date"].min().date()), str(data.split.validation["date"].max().date())],
            "test": [str(data.split.test["date"].min().date()), str(data.split.test["date"].max().date())],
            "surge_threshold": data.surge_threshold,
            "lstm_best_epoch": lstm_epoch,
            "hybrid_best_epoch": hybrid_epoch,
            "surge_multiplier": multiplier,
        }

    rows = []
    for model_number, (model_name, metrics_by_route) in enumerate(model_route_metrics.items()):
        macro = _aggregate(metrics_by_route)
        mae_ci = _bootstrap_macro_ci(metrics_by_route, "mae", seed=seed + model_number)
        f1_ci = _bootstrap_macro_ci(metrics_by_route, "surge_f1", seed=seed + model_number + 50)
        rows.append({
            "model": model_name,
            **{key: None if np.isnan(value) else round(value, 4) for key, value in macro.items()},
            "mae_ci95_lower": mae_ci[0],
            "mae_ci95_upper": mae_ci[1],
            "surge_f1_ci95_lower": f1_ci[0],
            "surge_f1_ci95_upper": f1_ci[1],
            "source": "untouched_test",
        })
    comparison = pd.DataFrame(rows)
    comparison.to_csv(artifacts / "baseline_comparison.csv", index=False)
    (artifacts / "baseline_comparison.json").write_text(comparison.to_json(orient="records", indent=2), encoding="utf-8")
    _write_comparison_plot(comparison, artifacts / "model_comparison.png")

    combined_route_metrics = model_route_metrics[
        "Prophet+LSTM+LightGBM decision model"
    ]
    combined_macro = _aggregate(combined_route_metrics)
    eval_summary = {
        **combined_route_metrics,
        "overall_passed": bool(
            combined_macro["surge_recall"] >= 0.70
            and combined_macro["surge_f1"] >= 0.70
        ),
    }
    (artifacts / "eval_summary.json").write_text(
        json.dumps(eval_summary, indent=2),
        encoding="utf-8",
    )
    evaluation_report = {
        "evaluation_protocol": "chronological_70_15_15_untouched_test",
        "macro_metrics": comparison.to_dict(orient="records"),
        "per_route_metrics": model_route_metrics,
    }
    (artifacts / "evaluation_report.json").write_text(
        json.dumps(_json_safe(evaluation_report), indent=2, allow_nan=False),
        encoding="utf-8",
    )

    try:
        git_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=PROJECT_ROOT, text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        git_commit = "unknown"
    artifact_files = [path for path in artifacts.iterdir() if path.is_file() and path.name != "model_metadata.json"]
    metadata = {
        "version": f"candidate-{git_commit[:8]}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data_type": "synthetic",
        "field_pilot_completed": False,
        "evaluation_protocol": "chronological_70_15_15_untouched_test",
        "raw_data_sha256": _checksum(raw_path),
        "git_commit": git_commit,
        "python": platform.python_version(),
        "packages": {"scikit_learn": sklearn.__version__, "torch": torch.__version__, "lightgbm": lgb.__version__},
        "classifier_threshold": classifier_threshold,
        "routes": route_details,
        "macro_test_metrics": comparison.to_dict(orient="records"),
        "artifact_sha256": {path.name: _checksum(path) for path in sorted(artifact_files)},
        "promotion_policy": "improve surge F1 or recall; MAE regression <= 5%",
        "promotion_decision": "pending_champion_gate",
    }
    (artifacts / "model_metadata.json").write_text(
        json.dumps(_json_safe(metadata), indent=2, allow_nan=False),
        encoding="utf-8",
    )
    return comparison


def _write_comparison_plot(comparison: pd.DataFrame, output_path: Path) -> None:
    """Write judge-facing MAE and surge-F1 comparison bars."""

    import matplotlib.pyplot as plt

    plot_frame = comparison.dropna(subset=["mae", "surge_f1"], how="all").copy()
    labels = plot_frame["model"].str.replace(" decision model", "", regex=False)
    positions = np.arange(len(plot_frame))
    figure, axes = plt.subplots(1, 2, figsize=(14, 5.5))
    axes[0].bar(positions, plot_frame["mae"].fillna(0), color="#2563eb")
    axes[0].set_title("Untouched Test Demand Error")
    axes[0].set_ylabel("MAE (passengers, lower is better)")
    axes[1].bar(positions, plot_frame["surge_f1"].fillna(0), color="#059669")
    axes[1].set_title("Untouched Test Surge Detection")
    axes[1].set_ylabel("F1 (higher is better)")
    axes[1].set_ylim(0, 1)
    for axis in axes:
        axis.set_xticks(positions)
        axis.set_xticklabels(labels, rotation=32, ha="right")
        axis.grid(axis="y", alpha=0.2)
    figure.suptitle("IQueue Forecasting Model Evidence (Synthetic Data)")
    figure.tight_layout()
    figure.savefig(output_path, dpi=160, bbox_inches="tight")
    plt.close(figure)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train leakage-safe IQueue route models")
    parser.add_argument("--data", type=Path)
    parser.add_argument("--artifacts", type=Path, default=DEFAULT_ARTIFACTS)
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    raw_path = _raw_path(args.data)
    routes = prepare_routes(raw_path)
    print(f"Validated {len(routes)} routes from {raw_path}")
    for route in routes.values():
        print(f"  {route.route_id}: train={len(route.split.train)} val={len(route.split.validation)} test={len(route.split.test)}")
    if args.validate_only:
        return
    comparison = run_pipeline(raw_path, args.artifacts, epochs=args.epochs, seed=args.seed)
    print(comparison.to_string(index=False))


if __name__ == "__main__":
    main()
