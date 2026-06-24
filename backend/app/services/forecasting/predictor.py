"""Demand forecasting inference service.

Loads per-route Prophet + LSTM models at startup and provides 7-day ahead
surge predictions for any route. Maps route UUIDs to trained model pairs
via deterministic UUID v5 slugs.

Architecture:
    Prophet (baseline trend + holiday regressors)
    + LSTM (passenger correction, 14-day lookback, 9 features)
    → final passenger volume → surge probability (0–1)
"""

from __future__ import annotations

import uuid
import json
import math
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import torch

from app.core.config import get_settings
from app.schemas.forecast import SurgePrediction
from .model import ArtifactLSTMForecaster, SurgeLSTM


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

    # Matches the final notebook configuration used for deployed checkpoints.
    LSTM_SEQ_LEN = 14
    LSTM_INPUT_SIZE = 9

    def __init__(self) -> None:
        self._loaded = False

        # Per-route model caches
        self._prophets: dict[str, object] = {}       # slug → Prophet model
        self._lstms: dict[str, torch.nn.Module] = {}  # slug → SurgeLSTM
        self._lstm_configs: dict[str, dict] = {}      # slug → checkpoint metadata
        self._scalers: dict[str, object] = {}         # slug → MinMaxScaler
        self._route_medians: dict[str, float] = {}    # slug → median daily volume
        self._surge_classifier: object | None = None
        self._surge_feature_names: list[str] = []
        self._metrics_summary: dict | None = None
        self._artifact_version: str | None = None
        self._classifier_threshold = 0.55
        self._surge_multipliers: dict[str, float] = {}

        self._ensure_loaded()

    @property
    def is_ready(self) -> bool:
        """Return whether forecasting has completed startup initialization."""

        return self._loaded

    @property
    def loaded_routes(self) -> list[str]:
        """Return routes with a complete Prophet, LSTM, and scaler triplet."""

        return [slug for slug in _KNOWN_SLUGS if self.has_route_bundle(slug)]

    @property
    def classifier_loaded(self) -> bool:
        """Return whether the shared surge classifier is available."""

        return self._surge_classifier is not None and bool(self._surge_feature_names)

    @property
    def bundle_status(self) -> str:
        """Return complete, partial, or unavailable artifact state."""

        loaded = len(self.loaded_routes)
        if loaded == len(_KNOWN_SLUGS) and self.classifier_loaded:
            return "complete"
        if loaded or self.classifier_loaded:
            return "partial"
        return "unavailable"

    def has_route_bundle(self, route: uuid.UUID | str) -> bool:
        """Return whether a route has all artifacts required for ML inference."""

        slug = route if isinstance(route, str) and route in _KNOWN_SLUGS else None
        if slug is None:
            try:
                slug = _route_slug_from_id(route)
            except (ValueError, TypeError):
                return False
        return bool(
            slug in self._prophets
            and slug in self._lstms
            and slug in self._scalers
        )

    @property
    def artifact_version(self) -> str | None:
        """Return the active model bundle version when known."""

        return self._artifact_version

    @property
    def metrics_summary(self) -> dict | None:
        """Return compact metrics for the active bundle when available."""

        return self._metrics_summary

    def warmup(self) -> None:
        """Load forecasting artifacts so startup readiness can report status."""

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

        self._load_surge_classifier(artifacts_dir)
        self._load_metrics_summary(artifacts_dir)
        self._loaded = True

    def _load_surge_classifier(self, artifacts_dir: Path) -> None:
        """Load the global LightGBM surge classifier and feature schema."""

        classifier_path = artifacts_dir / "surge_clf_global.pkl"
        features_path = artifacts_dir / "surge_clf_features.pkl"
        if not classifier_path.exists() or not features_path.exists():
            return

        try:
            import joblib

            self._surge_classifier = joblib.load(classifier_path)
            self._surge_feature_names = list(joblib.load(features_path))
        except Exception:
            self._surge_classifier = None
            self._surge_feature_names = []

    def _load_metrics_summary(self, artifacts_dir: Path) -> None:
        """Load optional metrics metadata from the artifact directory."""

        metadata_path = artifacts_dir / "model_metadata.json"
        manifest_path = artifacts_dir / "bundle_manifest.json"
        for version_path in (metadata_path, manifest_path):
            if not version_path.exists():
                continue
            try:
                metadata = json.loads(version_path.read_text(encoding="utf-8"))
                self._artifact_version = str(
                    metadata.get("version")
                    or metadata.get("bundle_version")
                    or "unknown"
                )
                if version_path == metadata_path:
                    self._classifier_threshold = float(
                        metadata.get("classifier_threshold", 0.55)
                    )
                    self._surge_multipliers = {
                        str(route): float(details["surge_multiplier"])
                        for route, details in metadata.get("routes", {}).items()
                        if isinstance(details, dict)
                        and details.get("surge_multiplier") is not None
                    }
                break
            except (OSError, ValueError, TypeError):
                continue

        metrics_path = artifacts_dir / "eval_summary.json"
        if not metrics_path.exists():
            self._artifact_version = self._artifact_version or "v1-hackathon-rules"
            return

        try:
            with open(metrics_path, encoding="utf-8") as f:
                metrics = json.load(f)
            route_metrics = [v for v in metrics.values() if isinstance(v, dict)]
            if route_metrics:
                self._metrics_summary = {
                    "avg_mae": round(
                        sum(float(m.get("mae", 0)) for m in route_metrics)
                        / len(route_metrics),
                        2,
                    ),
                    "avg_surge_f1": round(
                        sum(float(m.get("surge_f1", 0)) for m in route_metrics)
                        / len(route_metrics),
                        3,
                    ),
                    "routes_evaluated": len(route_metrics),
                    "overall_passed": bool(metrics.get("overall_passed")),
                }
            self._artifact_version = self._artifact_version or "v1-hackathon"
        except Exception:
            self._artifact_version = self._artifact_version or "v1-hackathon-rules"

    def _load_route_models(self, slug: str, artifacts_dir: Path) -> None:
        """Load Prophet, LSTM, and scaler for a single route slug."""
        import logging
        logger = logging.getLogger(__name__)

        # Prophet
        prophet_path = artifacts_dir / f"prophet_{slug}.pkl"
        if prophet_path.exists():
            try:
                import joblib

                payload = joblib.load(prophet_path)
                self._prophets[slug] = (
                    payload.get("model") if isinstance(payload, dict) else payload
                )
            except Exception as exc:
                logger.warning("Failed to load Prophet for %s: %s", slug, exc)

        # LSTM
        lstm_path = artifacts_dir / f"lstm_{slug}_best.pt"
        if lstm_path.exists():
            try:
                checkpoint = torch.load(lstm_path, map_location="cpu", weights_only=False)
                state_dict = checkpoint["model_state_dict"]
                if "fc.weight" in state_dict:
                    model = ArtifactLSTMForecaster(
                        input_size=checkpoint.get("input_size", 9),
                        hidden_size=checkpoint.get("hidden_size", 64),
                        num_layers=checkpoint.get("num_layers", 1),
                    )
                else:
                    model = SurgeLSTM(
                        input_size=checkpoint.get(
                            "input_size", self.LSTM_INPUT_SIZE
                        ),
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
        recent_history: list[tuple[date, float]] | None = None,
        as_of_date: date | None = None,
    ) -> list[SurgePrediction]:
        """Generate surge predictions for the next N days.

        Args:
            route_id: UUID of the bus route (resolved to slug for model lookup).
            horizon_days: Number of days to forecast (default: 7).

        Returns:
            List of SurgePrediction objects, one per day.
        """
        slug = _route_slug_from_id(route_id)
        today = as_of_date or date.today()
        rolling_history = sorted(recent_history or [], key=lambda item: item[0])
        prophet_cache: dict[date, float] = {}

        predictions: list[SurgePrediction] = []

        for i in range(horizon_days):
            d = today + timedelta(days=i + 1)
            is_weekend = d.weekday() >= 5

            # 1. Prophet baseline
            if d not in prophet_cache:
                prophet_cache[d] = self._prophet_forecast(slug, d)
            prophet_val = prophet_cache[d]

            # 2. LSTM residual correction
            lstm_correction = self._lstm_forecast(
                slug,
                d,
                prophet_val,
                is_weekend,
                rolling_history,
                prophet_cache,
            )

            # 3. Combined volume
            predicted_volume = max(0, int(prophet_val + lstm_correction))

            # 4. Surge probability and LightGBM decision boost
            surge_prob = self._classifier_surge_probability(
                slug,
                d,
                predicted_volume,
                rolling_history,
            )
            if surge_prob is None:
                surge_prob = self._compute_surge_prob(
                    slug, d, predicted_volume
                )
            elif surge_prob >= self._classifier_threshold:
                multiplier = self._surge_multipliers.get(slug or "", 2.0)
                predicted_volume = int(predicted_volume * multiplier)

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
            rolling_history.append((d, float(predicted_volume)))

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
            is_holiday, holiday_name = self._check_holiday(d)
            expected_regressors = getattr(prophet, "extra_regressors", {})
            for column in expected_regressors:
                value = 0
                if column == "is_holiday":
                    value = int(is_holiday)
                elif holiday_name:
                    normalized_name = holiday_name.lower()
                    if column == "is_eid":
                        value = int("eid" in normalized_name)
                    elif column == "is_tet":
                        value = int(
                            "tết" in normalized_name or "tet" in normalized_name
                        )
                    elif column == "is_xmas":
                        value = int("christmas" in normalized_name)
                future_df[column] = value

            result = prophet.predict(future_df)["yhat"].iloc[0]
            return float(max(0, result))
        except Exception:
            return self._estimate_baseline(d)

    # ------------------------------------------------------------------
    # LSTM inference
    # ------------------------------------------------------------------

    def _lstm_forecast(
        self,
        slug: str | None,
        d: date,
        prophet_val: float,
        is_weekend: bool,
        recent_history: list[tuple[date, float]] | None = None,
        prophet_cache: dict[date, float] | None = None,
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

            seq: list[list[float]] = []
            history_by_date = dict(recent_history or [])
            input_size = int(
                self._lstm_configs.get(slug, {}).get(
                    "input_size", self.LSTM_INPUT_SIZE
                )
            )
            for lag in range(self.LSTM_SEQ_LEN, 0, -1):
                past_date = d - timedelta(days=lag)
                past_is_weekend = 1.0 if past_date.weekday() >= 5 else 0.0
                past_is_holiday, _ = self._check_holiday(past_date)

                # Prefer observed route history, then use the documented
                # cold-start blend for missing dates.
                past_vol = history_by_date.get(
                    past_date,
                    median_vol * 0.7 + prophet_val * 0.3,
                )

                if input_size >= 9 and getattr(scaler, "n_features_in_", 0) >= 8:
                    raw_values = [
                        past_vol,
                        float(past_is_holiday),
                        math.sin(2 * math.pi * past_date.weekday() / 7),
                        math.cos(2 * math.pi * past_date.weekday() / 7),
                        past_is_weekend,
                        math.sin(2 * math.pi * past_date.month / 12),
                        math.cos(2 * math.pi * past_date.month / 12),
                        (past_date.day - 1) / 30.0,
                    ]
                    feature_names = list(
                        getattr(
                            scaler,
                            "feature_names_in_",
                            [
                                "passenger_count",
                                "is_holiday",
                                "dow_sin",
                                "dow_cos",
                                "is_weekend",
                                "month_sin",
                                "month_cos",
                                "day_of_month",
                            ],
                        )
                    )
                    raw_features = pd.DataFrame(
                        [raw_values[: len(feature_names)]],
                        columns=feature_names,
                    )
                    scaled = scaler.transform(raw_features)[0].tolist()
                    cache = prophet_cache if prophet_cache is not None else {}
                    if past_date not in cache:
                        cache[past_date] = self._prophet_forecast(slug, past_date)
                    past_prophet = cache[past_date]
                    prophet_scaled = (
                        past_prophet - scaler.data_min_[0]
                    ) / (scaler.data_range_[0] + 1e-8)
                    seq.append((scaled + [float(prophet_scaled)])[:input_size])
                else:
                    vol_norm = (past_vol - scaler.data_min_[0]) / (
                        scaler.data_max_[0] - scaler.data_min_[0] + 1e-8
                    )
                    seq.append(
                        [
                            vol_norm,
                            past_date.weekday() / 6.0,
                            float(past_is_holiday),
                        ][:input_size]
                    )

            x = torch.tensor([seq], dtype=torch.float32)
            model_output = lstm.predict(x).item()
            if input_size >= 8:
                predicted_count = (
                    model_output * scaler.data_range_[0]
                    + scaler.data_min_[0]
                )
                residual = predicted_count - prophet_val
            else:
                residual = model_output

            # Clip residual to reasonable range
            max_residual = median_vol * 0.5 if median_vol > 0 else 100
            residual = max(-max_residual, min(max_residual, residual))

            return float(residual)

        except Exception:
            return self._estimate_lstm_correction(d)

    def _classifier_surge_probability(
        self,
        slug: str | None,
        d: date,
        predicted_volume: int,
        recent_history: list[tuple[date, float]] | None = None,
    ) -> float | None:
        """Estimate surge probability with the global LightGBM classifier."""

        if (
            slug is None
            or self._surge_classifier is None
            or not self._surge_feature_names
        ):
            return None

        try:
            median = self._route_medians.get(slug, float(predicted_volume))
            observed = [
                float(value)
                for observed_date, value in sorted(
                    recent_history or [], key=lambda item: item[0]
                )
                if observed_date < d
            ]
            latest = observed[-1] if observed else median
            lag7 = observed[-7] if len(observed) >= 7 else median
            lag14 = observed[-14] if len(observed) >= 14 else median
            rolling = observed[-7:] or [median]
            current_date = d - timedelta(days=1)
            current_holiday, _ = self._check_holiday(current_date)
            values = {
                "passenger_count": latest,
                "is_holiday": float(current_holiday),
                "pax_lag1": latest,
                "pax_lag7": lag7,
                "pax_lag14": lag14,
                "pax_roll_mean_7": float(np.mean(rolling)),
                "pax_roll_std_7": float(np.std(rolling)),
                "pax_wow_change": (latest - lag7) / (lag7 + 1.0),
                "dow_sin_t1": math.sin(2 * math.pi * d.weekday() / 7),
                "dow_cos_t1": math.cos(2 * math.pi * d.weekday() / 7),
                "is_weekend_t1": float(d.weekday() >= 5),
                "month_sin_t1": math.sin(2 * math.pi * d.month / 12),
                "month_cos_t1": math.cos(2 * math.pi * d.month / 12),
                "day_of_month_t1": min(d.day / 30.0, 1.0),
                "route_cat": float(_KNOWN_SLUGS.index(slug)),
            }
            features = pd.DataFrame(
                [[values[name] for name in self._surge_feature_names]],
                columns=self._surge_feature_names,
            )
            return float(
                self._surge_classifier.predict_proba(features)[0, 1]
            )
        except Exception:
            return None

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
