"""Demand forecasting inference service.

Loads per-route Prophet + LSTM models at startup and provides 7-day ahead
surge predictions for any route. Maps route UUIDs to trained model pairs
via deterministic UUID v5 slugs.

Architecture:
    Prophet (baseline trend + holiday regressors)
    + LSTM (residual correction, seq_len=7, 3 features)
    → final passenger volume → surge probability (0–1)
"""

from __future__ import annotations

import pickle
import uuid
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import torch

from app.core.config import get_settings
from app.schemas.forecast import SurgePrediction


# ---------------------------------------------------------------------------
# Deterministic route slug ↔ UUID (matches scripts/seed_demo_data.py)
# ---------------------------------------------------------------------------
_ROUTE_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

# Known route slugs (must match trained model filenames and seed script)
_KNOWN_SLUGS = [
    "davao-cagayan",
    "davao-cotabato",
    "davao-general-santos",
    "cagayan-iligan",
    "davao-butuan",
    "cotabato-zambo",
]


def _route_slug_from_id(route_id: uuid.UUID | str) -> str | None:
    """Resolve a route UUID to a known slug, or None if unknown."""
    rid = uuid.UUID(str(route_id)) if not isinstance(route_id, uuid.UUID) else route_id
    for slug in _KNOWN_SLUGS:
        if uuid.uuid5(_ROUTE_NAMESPACE, f"iqueue.route.{slug}") == rid:
            return slug
    return None


def _route_id_from_slug(slug: str) -> uuid.UUID:
    return uuid.uuid5(_ROUTE_NAMESPACE, f"iqueue.route.{slug}")


# ---------------------------------------------------------------------------
# ForecastingService
# ---------------------------------------------------------------------------


class ForecastingService:
    """Per-route demand forecasting using Prophet + LSTM hybrid models.

    Loads all 6 trained route model pairs at initialization.  Maps route
    UUIDs to the correct Prophet/LSTM/scaler triplet for inference.

    Falls back to a heuristic when models are unavailable for a given route.
    """

    # LSTM expects this many days of history for the lag window
    LSTM_SEQ_LEN = 7
    LSTM_INPUT_SIZE = 3  # volume_norm, day_of_week, is_holiday

    def __init__(self) -> None:
        self._loaded = False

        # Per-route model caches
        self._prophets: dict[str, object] = {}       # slug → Prophet model
        self._lstms: dict[str, torch.nn.Module] = {}  # slug → SurgeLSTM
        self._lstm_configs: dict[str, dict] = {}      # slug → checkpoint metadata
        self._scalers: dict[str, object] = {}         # slug → MinMaxScaler
        self._route_medians: dict[str, float] = {}    # slug → median daily volume

        self._ensure_loaded()

    # ------------------------------------------------------------------
    # Model loading
    # ------------------------------------------------------------------

    def _ensure_loaded(self) -> None:
        """Lazy-load all per-route models from disk."""
        if self._loaded:
            return

        settings = get_settings()
        artifacts_dir = Path(settings.FORECASTING_ARTIFACTS_DIR)

        if not artifacts_dir.exists():
            self._loaded = True
            return

        for slug in _KNOWN_SLUGS:
            self._load_route_models(slug, artifacts_dir)

        self._loaded = True

    def _load_route_models(self, slug: str, artifacts_dir: Path) -> None:
        """Load Prophet, LSTM, and scaler for a single route slug."""
        import logging
        logger = logging.getLogger(__name__)

        # Prophet
        prophet_path = artifacts_dir / f"prophet_{slug}.pkl"
        if prophet_path.exists():
            try:
                with open(prophet_path, "rb") as f:
                    self._prophets[slug] = pickle.load(f)
            except Exception as exc:
                logger.warning("Failed to load Prophet for %s: %s", slug, exc)

        # LSTM
        lstm_path = artifacts_dir / f"lstm_{slug}_best.pt"
        if lstm_path.exists():
            try:
                import sys
                ml_path = str(Path(__file__).resolve().parents[4] / "ml" / "forecasting")
                if ml_path not in sys.path:
                    sys.path.insert(0, ml_path)
                from model import SurgeLSTM

                checkpoint = torch.load(lstm_path, map_location="cpu", weights_only=False)
                model = SurgeLSTM(
                    input_size=checkpoint.get("input_size", self.LSTM_INPUT_SIZE),
                    hidden_size=checkpoint.get("hidden_size", 64),
                    num_layers=checkpoint.get("num_layers", 2),
                )
                model.load_state_dict(checkpoint["model_state_dict"])
                model.eval()
                self._lstms[slug] = model
                self._lstm_configs[slug] = checkpoint
            except Exception as exc:
                logger.warning("Failed to load LSTM for %s: %s", slug, exc)

        # Scaler (MinMaxScaler, joblib format)
        scaler_path = artifacts_dir / f"{slug}_scaler.pkl"
        if scaler_path.exists():
            try:
                import joblib
                self._scalers[slug] = joblib.load(scaler_path)
                # Median volume from scaler (used when no historical data available)
                scaler = self._scalers[slug]
                if hasattr(scaler, "data_min_") and hasattr(scaler, "data_max_"):
                    # MinMaxScaler: median ≈ midpoint of range
                    self._route_medians[slug] = float(
                        (scaler.data_min_[0] + scaler.data_max_[0]) / 2.0
                    )
            except Exception as exc:
                logger.warning("Failed to load scaler for %s: %s", slug, exc)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def predict(
        self,
        route_id: uuid.UUID | str,
        horizon_days: int = 7,
    ) -> list[SurgePrediction]:
        """Generate surge predictions for the next N days.

        Args:
            route_id: UUID of the bus route (resolved to slug for model lookup).
            horizon_days: Number of days to forecast (default: 7).

        Returns:
            List of SurgePrediction objects, one per day.
        """
        slug = _route_slug_from_id(route_id)
        today = date.today()

        predictions: list[SurgePrediction] = []

        for i in range(horizon_days):
            d = today + timedelta(days=i + 1)
            is_weekend = d.weekday() >= 5

            # 1. Prophet baseline
            prophet_val = self._prophet_forecast(slug, d)

            # 2. LSTM residual correction
            lstm_correction = self._lstm_forecast(slug, d, prophet_val, is_weekend)

            # 3. Combined volume
            predicted_volume = max(0, int(prophet_val + lstm_correction))

            # 4. Surge probability
            surge_prob = self._compute_surge_prob(slug, d, predicted_volume)

            # 5. Confidence interval (±15%)
            margin = max(5, int(predicted_volume * 0.15))

            # 6. Holiday info
            is_holiday, holiday_name = self._check_holiday(d)

            predictions.append(
                SurgePrediction(
                    forecast_date=d,
                    surge_probability=round(min(1.0, surge_prob), 4),
                    predicted_volume=predicted_volume,
                    confidence_lower=max(0, predicted_volume - margin),
                    confidence_upper=predicted_volume + margin,
                    is_holiday=is_holiday,
                    holiday_name=holiday_name,
                )
            )

        return predictions

    # ------------------------------------------------------------------
    # Prophet inference
    # ------------------------------------------------------------------

    def _prophet_forecast(self, slug: str | None, d: date) -> float:
        """Get Prophet baseline prediction for a date."""
        prophet = self._prophets.get(slug) if slug else None

        if prophet is None:
            return self._estimate_baseline(d)

        try:
            future_df = pd.DataFrame({"ds": [pd.Timestamp(d)]})
            # Add holiday regressors that the Prophet model expects
            for col in ["is_eid", "is_tet", "is_xmas"]:
                future_df[col] = 0
            # Check and set holiday flags
            is_holiday, holiday_name = self._check_holiday(d)
            if holiday_name:
                if "eid" in holiday_name.lower():
                    future_df["is_eid"] = 1
                if "tết" in holiday_name.lower() or "tet" in holiday_name.lower():
                    future_df["is_tet"] = 1
                if "christmas" in holiday_name.lower():
                    future_df["is_xmas"] = 1

            result = prophet.predict(future_df)["yhat"].iloc[0]
            return float(max(0, result))
        except Exception:
            return self._estimate_baseline(d)

    # ------------------------------------------------------------------
    # LSTM inference
    # ------------------------------------------------------------------

    def _lstm_forecast(
        self, slug: str | None, d: date, prophet_val: float, is_weekend: bool
    ) -> float:
        """Get LSTM residual correction.

        Uses the scaler to normalize input features and the trained LSTM
        to predict the residual (actual - Prophet).  When no historical
        data is available, synthesizes a 7-day lag window from the route
        median and the Prophet prediction itself.
        """
        lstm = self._lstms.get(slug) if slug else None
        scaler = self._scalers.get(slug) if slug else None

        if lstm is None or scaler is None:
            # Fallback: simple weekend/holiday heuristic
            return self._estimate_lstm_correction(d)

        try:
            # Build a synthetic 7-day lag window
            median_vol = self._route_medians.get(slug, prophet_val)

            seq = []
            for lag in range(self.LSTM_SEQ_LEN, 0, -1):
                past_date = d - timedelta(days=lag)
                past_is_weekend = 1.0 if past_date.weekday() >= 5 else 0.0
                past_is_holiday, _ = self._check_holiday(past_date)

                # Use a blend of median and Prophet for synthetic history
                past_vol = median_vol * 0.7 + prophet_val * 0.3

                # Normalize volume using scaler
                # MinMaxScaler: X_scaled = (X - min) / (max - min)
                vol_norm = (past_vol - scaler.data_min_[0]) / (
                    scaler.data_max_[0] - scaler.data_min_[0] + 1e-8
                )

                dow_norm = past_date.weekday() / 6.0
                holiday_flag = 1.0 if past_is_holiday else 0.0

                seq.append([vol_norm, dow_norm, holiday_flag])

            x = torch.tensor([seq], dtype=torch.float32)  # (1, 7, 3)
            residual = lstm.predict(x).item()

            # Clip residual to reasonable range
            max_residual = median_vol * 0.5 if median_vol > 0 else 100
            residual = max(-max_residual, min(max_residual, residual))

            return float(residual)

        except Exception:
            return self._estimate_lstm_correction(d)

    # ------------------------------------------------------------------
    # Surge probability
    # ------------------------------------------------------------------

    def _compute_surge_prob(
        self, slug: str | None, d: date, predicted_volume: int
    ) -> float:
        """Compute surge probability (0-1) from predicted volume and context."""
        median = self._route_medians.get(slug, 100) if slug else 100

        # Base probability: how far above median?
        if median > 0:
            ratio = predicted_volume / median
            base_prob = max(0.0, min(0.8, (ratio - 1.0) * 0.5))
        else:
            base_prob = min(0.6, predicted_volume / 200.0)

        # Holiday boost
        holiday_boost = 0.0
        try:
            from data.pipeline.holidays import HolidaysASEAN

            holiday_boost = max(
                (HolidaysASEAN.get_surge_multiplier(d, c) - 1.0) * 0.5
                for c in ["PH", "ID", "VN", "MY"]
            )
        except ImportError:
            pass

        # Weekend boost
        weekend_boost = 0.1 if d.weekday() >= 5 else 0.0

        return min(0.95, base_prob + holiday_boost + weekend_boost)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _estimate_baseline(d: date) -> float:
        """Heuristic baseline when no Prophet model is available."""
        is_weekend = d.weekday() >= 5
        base = 80.0

        try:
            from data.pipeline.holidays import HolidaysASEAN

            mult = max(
                HolidaysASEAN.get_surge_multiplier(d, c)
                for c in ["PH", "ID", "VN", "MY"]
            )
            base *= mult
        except ImportError:
            pass

        if is_weekend:
            base *= 1.3

        return base

    @staticmethod
    def _estimate_lstm_correction(d: date) -> float:
        """Simple LSTM correction heuristic when model unavailable."""
        is_weekend = d.weekday() >= 5
        return 5.0 if is_weekend else -2.0

    @staticmethod
    def _check_holiday(d: date) -> tuple[bool, str | None]:
        """Check if a date is a holiday in any ASEAN country."""
        try:
            from data.pipeline.holidays import HolidaysASEAN

            for country in ["PH", "ID", "VN", "MY"]:
                if HolidaysASEAN.is_holiday(d, country):
                    name = HolidaysASEAN.get_holiday_name(d, country)
                    return True, name
        except ImportError:
            pass
        return False, None
