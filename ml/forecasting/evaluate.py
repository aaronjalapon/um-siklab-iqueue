"""Evaluate IQueue demand forecasting models.

Reports MAE, RMSE, and Surge Recall on a held-out test set.
Surge Recall = (correctly predicted surge days) / (actual surge days)
Minimum acceptable Surge Recall: 70%
"""

from __future__ import annotations

import pickle
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from data.pipeline.holidays import HolidaysASEAN

# --- Paths ---
CLEANED_DATA_PATH = Path("ml/forecasting/data/cleaned/ridership_cleaned.csv")
PROPHET_PATH = Path("backend/app/services/forecasting/artifacts/prophet_model.pkl")
LSTM_PATH = Path("backend/app/services/forecasting/artifacts/lstm_model.pt")


def evaluate() -> dict:
    """Run evaluation and return metrics dict."""
    print("=" * 60)
    print("IQueue — Forecasting Model Evaluation")
    print("=" * 60)

    # --- Load data ---
    df = pd.read_csv(CLEANED_DATA_PATH)
    df["ds"] = pd.to_datetime(df["departure_date"])
    daily = df.groupby("ds").size().reset_index(name="y")
    daily = daily.sort_values("ds")

    # Split: last 20% as test
    split = int(len(daily) * 0.8)
    train_df = daily.iloc[:split]
    test_df = daily.iloc[split:]

    print(f"\nTrain: {len(train_df)} days ({train_df['ds'].min().date()} → {train_df['ds'].max().date()})")
    print(f"Test:  {len(test_df)} days ({test_df['ds'].min().date()} → {test_df['ds'].max().date()})")

    metrics = {}

    # --- Load Prophet ---
    if PROPHET_PATH.exists():
        with open(PROPHET_PATH, "rb") as f:
            prophet_model = pickle.load(f)

        # Prophet predictions
        future = prophet_model.make_future_dataframe(periods=len(test_df))
        # Add holiday regressors
        future["is_eid"] = future["ds"].apply(
            lambda d: float(any("Eid" in (HolidaysASEAN.get_holiday_name(d.date(), c) or "")
                                for c in ["PH", "ID", "VN", "MY"]))
        )
        future["is_tet"] = future["ds"].apply(
            lambda d: float(any("Tết" in (HolidaysASEAN.get_holiday_name(d.date(), c) or "")
                                for c in ["VN"]))
        )
        future["is_xmas"] = future["ds"].apply(
            lambda d: float(any("Christmas" in (HolidaysASEAN.get_holiday_name(d.date(), c) or "")
                                for c in ["PH", "ID"]))
        )

        prophet_forecast = prophet_model.predict(future)
        prophet_preds = prophet_forecast["yhat"].values[-len(test_df):]

        # Prophet-only metrics
        actual = test_df["y"].values.astype(np.float64)
        prophet_mae = np.mean(np.abs(actual - prophet_preds))
        prophet_rmse = np.sqrt(np.mean((actual - prophet_preds) ** 2))
        metrics["prophet_mae"] = round(prophet_mae, 2)
        metrics["prophet_rmse"] = round(prophet_rmse, 2)
        print(f"\nProphet-only — MAE: {prophet_mae:.2f}, RMSE: {prophet_rmse:.2f}")
    else:
        print("\n⚠ Prophet model not found — skipping Prophet evaluation")
        prophet_preds = None

    # --- Load LSTM ---
    if LSTM_PATH.exists():
        from model import SurgeLSTM

        checkpoint = torch.load(LSTM_PATH, map_location="cpu", weights_only=False)
        model = SurgeLSTM(
            input_size=checkpoint.get("input_size", 3),
            hidden_size=checkpoint.get("hidden_size", 64),
            num_layers=checkpoint.get("num_layers", 2),
        )
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()
        print(f"\nLSTM loaded (best loss: {checkpoint['best_loss']:.4f})")

        # Build sequences for LSTM
        # Use the entire daily series to build lag sequences
        df_all = daily.copy()
        volume_mean = df_all["y"].mean()
        volume_std = df_all["y"].std()
        df_all["volume_norm"] = (df_all["y"] - volume_mean) / (volume_std + 1e-8)
        df_all["dow"] = df_all["ds"].dt.dayofweek / 6.0
        df_all["holiday"] = df_all["ds"].apply(
            lambda d: float(any(
                HolidaysASEAN.is_holiday(d.date(), c)
                for c in ["PH", "ID", "VN", "MY"]
            ))
        )
        features = df_all[["volume_norm", "dow", "holiday"]].values.astype(np.float32)

        SEQ_LEN = 7
        lstm_preds = []
        actuals = []

        for i in range(split, len(features) - 1):
            seq = features[i - SEQ_LEN : i]
            if len(seq) < SEQ_LEN:
                continue
            x = torch.tensor(seq).unsqueeze(0)  # (1, seq_len, 3)
            pred_residual = model.predict(x).item()
            # LSTM predicts residual; add Prophet baseline if available
            prophet_val = prophet_preds[i - split] if prophet_preds is not None and (i - split) < len(prophet_preds) else df_all["y"].iloc[i - SEQ_LEN : i].mean()
            lstm_preds.append(prophet_val + pred_residual)
            actuals.append(df_all["y"].iloc[i])

        actual_arr = np.array(actuals, dtype=np.float64)
        pred_arr = np.array(lstm_preds, dtype=np.float64)
        hybrid_mae = np.mean(np.abs(actual_arr - pred_arr))
        hybrid_rmse = np.sqrt(np.mean((actual_arr - pred_arr) ** 2))
        metrics["hybrid_mae"] = round(hybrid_mae, 2)
        metrics["hybrid_rmse"] = round(hybrid_rmse, 2)
        print(f"Hybrid (Prophet+LSTM) — MAE: {hybrid_mae:.2f}, RMSE: {hybrid_rmse:.2f}")
    else:
        print("\n⚠ LSTM model not found — skipping hybrid evaluation")

    # --- Surge Recall ---
    # A surge day = volume > 75th percentile of training data
    surge_threshold = np.percentile(train_df["y"].values, 75)
    actual_surge = actual > surge_threshold
    predicted_surge = pred_arr > surge_threshold

    surge_recall = actual_surge[predicted_surge].sum() / max(actual_surge.sum(), 1)
    metrics["surge_recall"] = round(surge_recall, 4)
    metrics["surge_threshold"] = round(surge_threshold, 0)

    print(f"\n--- Surge Recall ---")
    print(f"Threshold (75th pct): {surge_threshold:.0f} passengers/day")
    print(f"Actual surge days:     {actual_surge.sum()}")
    print(f"Predicted correctly:   {actual_surge[predicted_surge].sum()}")
    print(f"Surge Recall:          {surge_recall:.2%}")

    if surge_recall >= 0.70:
        print("✅ Surge Recall ≥ 70% — PASS")
    else:
        print("❌ Surge Recall < 70% — need improvement")

    # --- Summary ---
    print(f"\n{'='*60}")
    print("Evaluation Summary")
    print(f"{'='*60}")
    for k, v in metrics.items():
        print(f"  {k}: {v}")

    return metrics


if __name__ == "__main__":
    evaluate()
