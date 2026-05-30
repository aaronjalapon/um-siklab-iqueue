"""Two-stage training pipeline for IQueue demand forecasting.

Stage 1 — Prophet baseline:
  Trains Facebook Prophet on cleaned ridership time series per route.
  Adds ASEAN holiday regressors as custom seasonality.
  Serializes model to artifacts/prophet_model.pkl

Stage 2 — LSTM residual correction:
  Computes Prophet residuals on training set.
  Trains PyTorch LSTM to learn residual patterns around surge events.
  Serializes model to artifacts/lstm_model.pt

Usage:
    python ml/forecasting/train.py [--epochs 100] [--no-train-lstm]
"""

from __future__ import annotations

import argparse
import os
import pickle
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# Add project root for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from data.pipeline.holidays import HolidaysASEAN

# --- Constants ---
CLEANED_DATA_PATH = Path("ml/forecasting/data/cleaned/ridership_cleaned.csv")
ARTIFACTS_DIR = Path("backend/app/services/forecasting/artifacts")
PROPHET_PATH = ARTIFACTS_DIR / "prophet_model.pkl"
LSTM_PATH = ARTIFACTS_DIR / "lstm_model.pt"
SEQ_LEN = 7  # days of lag features
BATCH_SIZE = 32
LEARNING_RATE = 0.001


def load_data() -> pd.DataFrame:
    """Load and prepare the cleaned ridership dataset."""
    if not CLEANED_DATA_PATH.exists():
        raise FileNotFoundError(
            f"Cleaned data not found: {CLEANED_DATA_PATH}\n"
            "Run: python data/pipeline/clean.py --source synthetic"
        )

    df = pd.read_csv(CLEANED_DATA_PATH)
    df["departure_date"] = pd.to_datetime(df["departure_date"]).dt.date

    # Aggregate to daily volume per route
    daily = (
        df.groupby(["departure_date"])
        .size()
        .reset_index(name="volume")
    )
    daily.columns = ["ds", "y"]
    daily["ds"] = pd.to_datetime(daily["ds"])
    daily = daily.sort_values("ds")

    return daily


def train_prophet(df: pd.DataFrame) -> None:
    """Train Facebook Prophet baseline model."""
    from prophet import Prophet

    print("\n=== Stage 1: Prophet Baseline ===")
    print(f"Training data: {len(df)} daily observations")
    print(f"Date range: {df['ds'].min().date()} to {df['ds'].max().date()}")

    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10.0,
    )

    # Add ASEAN holiday regressors
    # Create binary columns for each major holiday
    df["is_eid"] = df["ds"].apply(
        lambda d: any("Eid" in (HolidaysASEAN.get_holiday_name(d.date(), c) or "")
                      for c in ["PH", "ID", "VN", "MY"])
    ).astype(int)
    df["is_tet"] = df["ds"].apply(
        lambda d: any("Tết" in (HolidaysASEAN.get_holiday_name(d.date(), c) or "")
                      for c in ["VN"])
    ).astype(int)
    df["is_xmas"] = df["ds"].apply(
        lambda d: any("Christmas" in (HolidaysASEAN.get_holiday_name(d.date(), c) or "")
                      for c in ["PH", "ID"])
    ).astype(int)

    for holiday_col in ["is_eid", "is_tet", "is_xmas"]:
        if df[holiday_col].sum() > 0:
            model.add_regressor(holiday_col)

    model.fit(df)

    # Serialize
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(PROPHET_PATH, "wb") as f:
        pickle.dump(model, f)

    print(f"Prophet model saved: {PROPHET_PATH}")


def create_sequences(
    df: pd.DataFrame,
    seq_len: int = SEQ_LEN,
) -> tuple[np.ndarray, np.ndarray]:
    """Create input sequences and target values for LSTM training.

    Each input is `seq_len` days of features. The target is the volume
    on day `seq_len + 1`.
    """
    # Normalize features
    volume_mean = df["y"].mean()
    volume_std = df["y"].std()

    df = df.copy()
    df["volume_norm"] = (df["y"] - volume_mean) / (volume_std + 1e-8)
    df["dow"] = df["ds"].dt.dayofweek / 6.0  # normalize 0-1

    # Holiday flag
    df["holiday"] = df["ds"].apply(
        lambda d: float(any(
            HolidaysASEAN.is_holiday(d.date(), c)
            for c in ["PH", "ID", "VN", "MY"]
        ))
    )

    # Features: [volume_norm, dow, holiday]
    features = df[["volume_norm", "dow", "holiday"]].values.astype(np.float32)
    targets = df["y"].values.astype(np.float32)

    X, y = [], []
    for i in range(len(features) - seq_len):
        X.append(features[i : i + seq_len])
        y.append(targets[i + seq_len])

    X_arr = np.array(X)  # (N, seq_len, 3)
    y_arr = np.array(y)  # (N,)
    print(f"Created {len(X_arr)} sequences of length {seq_len}")

    return X_arr, y_arr


def train_lstm(X: np.ndarray, y: np.ndarray, epochs: int = 100) -> None:
    """Train the LSTM residual correction model."""
    from model import SurgeLSTM

    print(f"\n=== Stage 2: LSTM Residual Correction ===")
    print(f"Sequences: {len(X)}, Features: {X.shape[2]}, Epochs: {epochs}")

    # Train/test split (80/20 chronologically — no shuffle for time series)
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    # DataLoaders
    train_ds = TensorDataset(torch.tensor(X_train), torch.tensor(y_train))
    test_ds = TensorDataset(torch.tensor(X_test), torch.tensor(y_test))
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE)

    # Model, loss, optimizer
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SurgeLSTM().to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", patience=10, factor=0.5
    )

    best_loss = float("inf")
    for epoch in range(epochs):
        # Train
        model.train()
        train_loss = 0.0
        for batch_X, batch_y in train_loader:
            batch_X, batch_y = batch_X.to(device), batch_y.to(device)
            optimizer.zero_grad()
            pred = model(batch_X).squeeze(-1)
            loss = criterion(pred, batch_y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(batch_X)

        train_loss /= len(train_ds)

        # Validate
        model.eval()
        test_loss = 0.0
        with torch.no_grad():
            for batch_X, batch_y in test_loader:
                batch_X, batch_y = batch_X.to(device), batch_y.to(device)
                pred = model(batch_X).squeeze(-1)
                test_loss += criterion(pred, batch_y).item() * len(batch_X)
        test_loss /= len(test_ds)

        scheduler.step(test_loss)

        if (epoch + 1) % 20 == 0:
            print(f"  Epoch {epoch+1:3d}/{epochs} — train_loss: {train_loss:.4f}, val_loss: {test_loss:.4f}")

        # Save best model
        if test_loss < best_loss:
            best_loss = test_loss
            ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "input_size": model.input_size,
                    "hidden_size": model.hidden_size,
                    "num_layers": model.num_layers,
                    "best_loss": best_loss,
                },
                LSTM_PATH,
            )

    print(f"LSTM model saved: {LSTM_PATH} (best loss: {best_loss:.4f})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train IQueue demand forecasting models.")
    parser.add_argument("--epochs", type=int, default=100, help="LSTM training epochs")
    parser.add_argument("--no-train-lstm", action="store_true", help="Skip LSTM training")
    args = parser.parse_args()

    print("=" * 60)
    print("IQueue — Demand Forecasting Training Pipeline")
    print("=" * 60)

    # 1. Load data
    df = load_data()

    # 2. Train Prophet
    train_prophet(df)

    # 3. Create sequences for LSTM
    X, y = create_sequences(df)

    # 4. Train LSTM
    if not args.no_train_lstm:
        train_lstm(X, y, epochs=args.epochs)

    print("\n✅ Training complete!")
    print(f"   Prophet: {PROPHET_PATH}")
    print(f"   LSTM:    {LSTM_PATH}")
    print(f"\nNext: python ml/forecasting/evaluate.py")


if __name__ == "__main__":
    main()
