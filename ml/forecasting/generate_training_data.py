#!/usr/bin/env python3
"""
IQueue — Enhanced Synthetic Ridership Data Generator
=====================================================
Generates realistic daily passenger counts for 6 Mindanao inter-provincial
bus routes, calibrated against real-world transit statistics extracted from
the Adelaide Metro bus ridership dataset (kaggle-bus-ridership.CSV).

Usage:
    python generate_training_data.py \\
        --kaggle-data ml/forecasting/data/kaggle-bus-ridership.CSV \\
        --output-dir ml/forecasting/data/raw/

Output:
    - ridership_synthetic.csv  (6,576 rows × 9 columns)
    - data_generation_stats.json (statistical profile used)
"""

import argparse
import csv
import json
import os
import statistics
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np


# ══════════════════════════════════════════════════════════════════════════
# Route Definitions (6 Mindanao pilot routes)
# ══════════════════════════════════════════════════════════════════════════

ROUTES = [
    {"id": "davao-cagayan",          "label": "Davao → Cagayan de Oro",   "base_pax": 420},
    {"id": "davao-cotabato",         "label": "Davao → Cotabato City",    "base_pax": 280},
    {"id": "davao-general-santos",   "label": "Davao → General Santos",   "base_pax": 350},
    {"id": "cagayan-iligan",         "label": "Cagayan de Oro → Iligan",  "base_pax": 190},
    {"id": "davao-butuan",           "label": "Davao → Butuan",           "base_pax": 310},
    {"id": "cotabato-zambo",         "label": "Cotabato → Zamboanga",     "base_pax": 160},
]

ROUTE_IDS = [r["id"] for r in ROUTES]
ROUTE_BASE_PAX = {r["id"]: r["base_pax"] for r in ROUTES}
ROUTE_LABELS = {r["id"]: r["label"] for r in ROUTES}

# ══════════════════════════════════════════════════════════════════════════
# ASEAN Surge Event Definitions
# ══════════════════════════════════════════════════════════════════════════

SURGE_EVENTS = [
    # (name, month, peak_days, base_multiplier, ramp_days_before, ramp_days_after)
    {
        "name": "Holy Week",
        "month": 4,
        "peak_days": list(range(3, 7)),   # Wed-Sat of Holy Week (approximate)
        "mult_mean": 3.2,
        "mult_std": 0.3,
        "ramp_up": 2,
        "ramp_down": 1,
    },
    {
        "name": "Christmas",
        "month": 12,
        "peak_days": list(range(22, 26)),
        "mult_mean": 3.5,
        "mult_std": 0.25,
        "ramp_up": 3,
        "ramp_down": 2,
    },
    {
        "name": "New Year",
        "month": 1,
        "peak_days": list(range(1, 3)),
        "mult_mean": 2.8,
        "mult_std": 0.25,
        "ramp_up": 1,
        "ramp_down": 1,
    },
    {
        "name": "All Saints Day",
        "month": 11,
        "peak_days": [1, 2],
        "mult_mean": 3.0,
        "mult_std": 0.25,
        "ramp_up": 1,
        "ramp_down": 1,
    },
    {
        "name": "Independence Day",
        "month": 6,
        "peak_days": [12],
        "mult_mean": 1.8,
        "mult_std": 0.15,
        "ramp_up": 1,
        "ramp_down": 0,
    },
    {
        "name": "Eid al-Fitr",
        "month": 4,
        "peak_days": list(range(9, 12)),
        "mult_mean": 2.5,
        "mult_std": 0.3,
        "ramp_up": 2,
        "ramp_down": 1,
    },
    {
        "name": "Hariraya",
        "month": 4,
        "peak_days": list(range(9, 12)),
        "mult_mean": 2.5,
        "mult_std": 0.3,
        "ramp_up": 2,
        "ramp_down": 1,
    },
]

# ══════════════════════════════════════════════════════════════════════════
# Day-of-Week Multipliers (calibrated from transit domain knowledge)
# ══════════════════════════════════════════════════════════════════════════
# Friday and Sunday are peak travel days for inter-provincial buses in ASEAN.
# Monday-Thursday: normal, Friday: high outbound, Saturday: moderate,
# Sunday: high return travel.
DOW_MULTIPLIERS = {
    0: 0.92,   # Monday    — slightly below average
    1: 0.88,   # Tuesday   — lowest demand
    2: 0.90,   # Wednesday — below average
    3: 0.95,   # Thursday  — slight pickup
    4: 1.25,   # Friday    — high outbound travel
    5: 0.98,   # Saturday  — close to average
    6: 1.12,   # Sunday    — high return travel
}


# ══════════════════════════════════════════════════════════════════════════
# Kaggle Data Analyzer
# ══════════════════════════════════════════════════════════════════════════

class KaggleDataAnalyzer:
    """Extract empirical statistics from Adelaide Metro bus ridership data."""

    def __init__(self, csv_path: str, sample_rows: int = 2_000_000):
        self.csv_path = csv_path
        self.sample_rows = sample_rows

        # Extracted statistics (populated by analyze())
        self.route_weekly_cvs: list[float] = []
        self.route_max_mean_ratios: list[float] = []
        self.route_lag1_acfs: list[float] = []
        self.route_means: list[float] = []
        self.num_routes: int = 0
        self.total_rows: int = 0

        # Derived reference statistics
        self.median_cv: float = 0.25
        self.median_max_mean: float = 1.45
        self.median_acf: float = 0.55
        self.volume_p50: float = 324.0
        self.volume_p90: float = 5350.0

    def analyze(self) -> dict:
        """Read kaggle CSV and compute empirical statistics. Returns stats dict."""
        print(f"Analyzing {self.csv_path}...")
        if not os.path.exists(self.csv_path):
            print(f"WARNING: Kaggle data not found at {self.csv_path}")
            print("Using default reference statistics from prior analysis.")
            return self._default_stats()

        route_weekly = defaultdict(lambda: defaultdict(int))
        self.total_rows = 0

        with open(self.csv_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                route = row["RouteID"]
                week = row["WeekBeginning"]
                boardings = int(row["NumberOfBoardings"])
                route_weekly[route][week] += boardings
                self.total_rows += 1
                if self.total_rows % 2_000_000 == 0:
                    print(f"  ... processed {self.total_rows:,} rows")

        self.num_routes = len(route_weekly)
        print(f"  Total rows: {self.total_rows:,}")
        print(f"  Total routes: {self.num_routes}")

        # Compute per-route statistics
        for route, weeks in route_weekly.items():
            vals = sorted(weeks.values())
            if len(vals) < 5:
                continue
            mean_v = statistics.mean(vals)
            stdev_v = statistics.stdev(vals) if len(vals) > 1 else 0.0
            cv = stdev_v / mean_v if mean_v > 0 else 0.0
            max_v = max(vals)
            ratio = max_v / mean_v if mean_v > 0 else 0.0

            self.route_weekly_cvs.append(cv)
            self.route_max_mean_ratios.append(ratio)
            self.route_means.append(mean_v)

            # Lag-1 autocorrelation
            if len(vals) > 10:
                n = len(vals)
                num = sum((vals[i] - mean_v) * (vals[i + 1] - mean_v) for i in range(n - 1))
                den = sum((vals[i] - mean_v) ** 2 for i in range(n))
                if den > 0:
                    self.route_lag1_acfs.append(num / den)

        # Compute summary statistics
        self.median_cv = float(np.median(self.route_weekly_cvs)) if self.route_weekly_cvs else 0.25
        self.median_max_mean = float(np.median(self.route_max_mean_ratios)) if self.route_max_mean_ratios else 1.45
        self.median_acf = float(np.median(self.route_lag1_acfs)) if self.route_lag1_acfs else 0.55

        sorted_means = sorted(self.route_means)
        if sorted_means:
            self.volume_p50 = float(sorted_means[len(sorted_means) // 2])
            self.volume_p90 = float(sorted_means[9 * len(sorted_means) // 10])

        stats = self._build_stats()
        print(f"\n  Reference statistics extracted:")
        print(f"    Median weekly CV:     {self.median_cv:.3f}")
        print(f"    Median max/mean ratio: {self.median_max_mean:.3f}")
        print(f"    Median lag-1 ACF:      {self.median_acf:.3f}")
        print(f"    Volume p50:            {self.volume_p50:.0f}")
        print(f"    Volume p90:            {self.volume_p90:.0f}")
        print(f"    Routes with >=5 weeks: {len(self.route_weekly_cvs)}")
        return stats

    def _default_stats(self) -> dict:
        """Return pre-computed defaults from prior full-dataset analysis."""
        self.median_cv = 0.254
        self.median_max_mean = 1.454
        self.median_acf = 0.55
        self.volume_p50 = 324.0
        self.volume_p90 = 5350.0
        return self._build_stats()

    def _build_stats(self) -> dict:
        return {
            "source": "kaggle-bus-ridership.CSV (Adelaide Metro 2013)",
            "total_rows_analyzed": self.total_rows,
            "num_routes": self.num_routes,
            "median_weekly_cv": round(self.median_cv, 4),
            "median_max_mean_ratio": round(self.median_max_mean, 4),
            "median_lag1_acf": round(self.median_acf, 4),
            "volume_p50": round(self.volume_p50, 0),
            "volume_p90": round(self.volume_p90, 0),
            "cv_percentiles": {
                "p10": round(float(np.percentile(self.route_weekly_cvs, 10)), 4) if self.route_weekly_cvs else 0.15,
                "p50": round(float(np.percentile(self.route_weekly_cvs, 50)), 4) if self.route_weekly_cvs else 0.25,
                "p90": round(float(np.percentile(self.route_weekly_cvs, 90)), 4) if self.route_weekly_cvs else 0.50,
            },
            "acf_percentiles": {
                "p10": round(float(np.percentile(self.route_lag1_acfs, 10)), 4) if self.route_lag1_acfs else 0.2,
                "p50": round(float(np.percentile(self.route_lag1_acfs, 50)), 4) if self.route_lag1_acfs else 0.55,
                "p90": round(float(np.percentile(self.route_lag1_acfs, 90)), 4) if self.route_lag1_acfs else 0.75,
            },
        }


# ══════════════════════════════════════════════════════════════════════════
# Enhanced Synthetic Data Generator
# ══════════════════════════════════════════════════════════════════════════

class SyntheticDataGenerator:
    """Generate realistic synthetic ridership data calibrated to real-world stats."""

    def __init__(
        self,
        stats: dict,
        start_date: str = "2022-01-01",
        end_date: str = "2024-12-31",
        seed: int = 42,
    ):
        self.stats = stats
        self.start_date = datetime.strptime(start_date, "%Y-%m-%d")
        self.end_date = datetime.strptime(end_date, "%Y-%m-%d")
        self.rng = np.random.RandomState(seed)

        # Derive generation parameters from real-world statistics
        self.target_cv = stats["median_weekly_cv"]  # ~0.25
        self.target_acf = stats["median_lag1_acf"]   # ~0.55
        self.target_max_mean = stats["median_max_mean_ratio"]  # ~1.45

    # ── Surge Event Calendar ────────────────────────────────────────────
    def _build_surge_calendar(self) -> dict:
        """Pre-compute surge multipliers for every day in the date range.

        Returns dict mapping (year, month, day) -> (multiplier, event_name).
        Surge events have ramp-up (increasing multiplier), peak, and ramp-down phases.
        """
        calendar: dict[tuple, tuple[float, str]] = {}

        for year in range(self.start_date.year, self.end_date.year + 1):
            for ev in SURGE_EVENTS:
                event_mult = self.rng.normal(ev["mult_mean"], ev["mult_std"])
                event_mult = max(1.3, event_mult)  # floor at +30%

                peak_days = ev["peak_days"]
                ramp_up = ev["ramp_up"]
                ramp_down = ev["ramp_down"]

                # Ramp-up days (before first peak day)
                first_peak = min(peak_days)
                for offset in range(ramp_up, 0, -1):
                    day = first_peak - offset
                    if day < 1:
                        continue
                    try:
                        dt = datetime(year, ev["month"], day)
                        if self.start_date <= dt <= self.end_date:
                            # Linear ramp: from 1.0 to event_mult
                            frac = 1.0 - (offset / (ramp_up + 1))
                            mult = 1.0 + frac * (event_mult - 1.0)
                            calendar[(year, ev["month"], day)] = (mult, ev["name"] + " (ramp-up)")
                    except ValueError:
                        pass

                # Peak days
                for day in peak_days:
                    try:
                        dt = datetime(year, ev["month"], day)
                        if self.start_date <= dt <= self.end_date:
                            calendar[(year, ev["month"], day)] = (event_mult, ev["name"])
                    except ValueError:
                        pass

                # Ramp-down days (after last peak day)
                last_peak = max(peak_days)
                for offset in range(1, ramp_down + 1):
                    day = last_peak + offset
                    try:
                        dt = datetime(year, ev["month"], day)
                        if self.start_date <= dt <= self.end_date:
                            frac = offset / (ramp_down + 1)
                            mult = 1.0 + (1.0 - frac) * (event_mult - 1.0)
                            calendar[(year, ev["month"], day)] = (mult, ev["name"] + " (ramp-down)")
                    except ValueError:
                        pass

        return calendar

    # ── Monthly Seasonality ─────────────────────────────────────────────
    def _monthly_factor(self, month: int) -> float:
        """Return seasonal multiplier for a given month (1-12).

        ASEAN bus travel peaks in Dec-Jan (holidays), Apr-May (summer/Holy Week),
        and dips in Aug-Sep (rainy/typhoon season).
        """
        # Sinusoidal with peak in December and secondary peak in April-May
        base = 1.0
        # Primary annual cycle: peak in month 12, trough in month 7
        primary = 0.06 * np.sin(2 * np.pi * (month - 3) / 12)
        # Secondary: peak in month 4-5 (summer travel)
        secondary = 0.04 * np.sin(4 * np.pi * (month - 2.5) / 12)
        return base + primary + secondary

    # ── Trend Component ─────────────────────────────────────────────────
    def _trend_factor(self, date: datetime) -> float:
        """Annual growth trend: ~1.5% per year compounded from start."""
        days_since_start = (date - self.start_date).days
        annual_growth = 0.015
        daily_growth = (1 + annual_growth) ** (1 / 365.25) - 1
        return (1 + daily_growth) ** days_since_start

    # ── AR(1) Noise Process ─────────────────────────────────────────────
    def _generate_ar1_noise(self, n_days: int, cv: float, phi: float) -> np.ndarray:
        """Generate an AR(1) noise series: x_t = phi * x_{t-1} + eps_t.

        Args:
            n_days: Length of series to generate.
            cv: Target coefficient of variation (std/mean).
            phi: Autoregressive coefficient (lag-1 ACF target).

        Returns:
            Array of noise multipliers centered at 1.0 with the desired CV and ACF.
        """
        # Stationary AR(1) variance: var(x) = sigma_eps^2 / (1 - phi^2)
        # We want: std(x) = cv (since mean=1), so var(x) = cv^2
        # sigma_eps = cv * sqrt(1 - phi^2)
        sigma_eps = cv * np.sqrt(1.0 - phi**2)

        # Generate white noise innovations
        eps = self.rng.normal(0, sigma_eps, n_days)

        # AR(1) process
        x = np.zeros(n_days)
        x[0] = self.rng.normal(0, cv)  # initialize from stationary distribution
        for t in range(1, n_days):
            x[t] = phi * x[t - 1] + eps[t]

        # Center at 1.0
        return 1.0 + x

    # ── Correlated Route Shocks ─────────────────────────────────────────
    def _generate_systemic_shocks(self, n_days: int, prob: float = 0.03) -> np.ndarray:
        """Generate systemic shocks that affect all routes simultaneously.

        Examples: weather events, fuel price hikes, road closures affecting region.

        Args:
            n_days: Length of series.
            prob: Probability of a shock on any given day.

        Returns:
            Array of shock multipliers centered at 1.0.
        """
        shocks = np.ones(n_days)
        for t in range(n_days):
            if self.rng.random() < prob:
                # Shock magnitude: 0.5x to 1.5x (severe disruption to mild boost)
                shocks[t] = self.rng.uniform(0.5, 1.5)
                # Extend shock duration (1-3 days)
                duration = self.rng.randint(1, 4)
                for d in range(1, duration):
                    if t + d < n_days:
                        decay = 1.0 - (d / duration) * 0.5
                        shocks[t + d] = 1.0 + (shocks[t] - 1.0) * decay
        return shocks

    # ── Terminal Closures ───────────────────────────────────────────────
    def _generate_closures(self, n_days: int, rate: float = 0.015) -> np.ndarray:
        """Generate terminal closure flags with adjacent-day correlation.

        Closures tend to cluster (e.g., multi-day typhoon).
        """
        closures = np.zeros(n_days, dtype=int)
        t = 0
        while t < n_days:
            if self.rng.random() < rate:
                # Closure event: 1-3 days
                duration = self.rng.randint(1, 4)
                for d in range(duration):
                    if t + d < n_days:
                        closures[t + d] = 1
                t += duration
            else:
                t += 1
        return closures

    # ── Main Generation ─────────────────────────────────────────────────
    def generate(self) -> "pd.DataFrame":
        """Generate the complete synthetic ridership dataset.

        Returns:
            DataFrame with columns: date, route_id, route_label, passenger_count,
            is_holiday, holiday_name, day_of_week, is_weekend, is_terminal_closure.
        """
        import pandas as pd

        all_dates = pd.date_range(self.start_date, self.end_date, freq="D")
        n_days_total = len(all_dates)
        print(f"Generating {n_days_total} days × {len(ROUTES)} routes = "
              f"{n_days_total * len(ROUTES)} rows")
        print(f"Date range: {self.start_date.date()} → {self.end_date.date()}")

        # Pre-compute surge calendar
        surge_calendar = self._build_surge_calendar()
        surge_days_per_route = defaultdict(list)

        # Generate systemic shocks (shared across all routes)
        systemic_shocks = self._generate_systemic_shocks(n_days_total, prob=0.025)

        rows = []
        total_closure_days = 0

        for route in ROUTES:
            rid = route["id"]
            rlabel = route["label"]
            bp = route["base_pax"]

            # Per-route AR(1) noise series with route-specific CV
            # NOTE: The AR(1) noise is only ONE component of total variance.
            # DOW multipliers (+~10% CV), monthly seasonality (+~3%), systemic
            # shocks (+~5%), and surge events all add to the observed daily CV.
            # We target a base AR(1) CV of ~0.10-0.14 so that the combined
            # daily CV on non-surge days lands in the 0.20-0.28 range,
            # matching real Adelaide bus data (median weekly CV ~0.25).
            base_cv = 0.12  # base AR(1) noise CV
            # Larger routes have slightly lower total CV (law of large numbers)
            size_factor = 1.0 + 0.15 * (1.0 - bp / 420)  # 1.0 to 1.15
            route_cv = base_cv * size_factor
            route_cv = max(0.10, min(0.16, route_cv))
            route_phi = self.target_acf + self.rng.uniform(-0.05, 0.05)
            route_phi = max(0.4, min(0.75, route_phi))

            ar1_noise = self._generate_ar1_noise(n_days_total, route_cv, route_phi)

            # Per-route closures
            closures = self._generate_closures(n_days_total, rate=0.015)

            # Route-specific shock modifier (some routes more affected)
            route_shock_sensitivity = self.rng.uniform(0.7, 1.3)

            route_surge_days = 0
            for t, dt in enumerate(all_dates):
                date_val = dt.to_pydatetime()
                dow = date_val.weekday()
                is_weekend_flag = 1 if dow >= 5 else 0

                # Terminal closure
                if closures[t]:
                    pax = 0
                    is_hol = 0
                    hol_name = "none"
                    total_closure_days += 1
                else:
                    # Base passenger count with trend
                    trend = self._trend_factor(date_val)
                    monthly = self._monthly_factor(date_val.month)
                    dow_mult = DOW_MULTIPLIERS.get(dow, 1.0)

                    # Check for surge event
                    surge_key = (date_val.year, date_val.month, date_val.day)
                    if surge_key in surge_calendar:
                        surge_mult, hol_name = surge_calendar[surge_key]
                        is_hol = 1
                        route_surge_days += 1
                    else:
                        surge_mult = 1.0
                        is_hol = 0
                        hol_name = "none"

                    # Combine all multipliers
                    shock_effect = 1.0 + (systemic_shocks[t] - 1.0) * route_shock_sensitivity

                    pax_raw = bp * trend * monthly * dow_mult * ar1_noise[t] * surge_mult * shock_effect
                    pax = int(max(0, round(pax_raw)))

                rows.append({
                    "date": date_val.strftime("%Y-%m-%d"),
                    "route_id": rid,
                    "route_label": rlabel,
                    "passenger_count": pax,
                    "is_holiday": is_hol,
                    "holiday_name": hol_name,
                    "day_of_week": dow,
                    "is_weekend": is_weekend_flag,
                    "is_terminal_closure": int(closures[t]),
                })

            surge_days_per_route[rid] = route_surge_days

        df = pd.DataFrame(rows)
        df["date"] = pd.to_datetime(df["date"])

        # Print summary
        print(f"\nGeneration complete:")
        print(f"  Total rows: {len(df)}")
        print(f"  Terminal closure days: {total_closure_days} "
              f"({total_closure_days / len(df) * 100:.2f}%)")
        for rid in ROUTE_IDS:
            rdf = df[df["route_id"] == rid]
            non_zero = rdf[rdf["passenger_count"] > 0]["passenger_count"]
            print(f"  {rid:25s} | mean={non_zero.mean():7.0f} median={non_zero.median():7.0f} "
                  f"std={non_zero.std():7.0f} cv={non_zero.std()/non_zero.mean():.3f} "
                  f"surge_days={surge_days_per_route[rid]}")

        return df


# ══════════════════════════════════════════════════════════════════════════
# Statistical Validation
# ══════════════════════════════════════════════════════════════════════════

def validate_generated_data(df: "pd.DataFrame", stats: dict) -> dict:
    """Validate the generated data against target statistics.

    Returns a validation report dict.
    """
    import pandas as pd

    report = {
        "row_count": len(df),
        "expected_rows": 6576,
        "row_count_ok": len(df) == 6576,
        "columns": list(df.columns),
        "expected_columns": [
            "date", "route_id", "route_label", "passenger_count",
            "is_holiday", "holiday_name", "day_of_week",
            "is_weekend", "is_terminal_closure",
        ],
        "columns_ok": sorted(list(df.columns)) == sorted([
            "date", "route_id", "route_label", "passenger_count",
            "is_holiday", "holiday_name", "day_of_week",
            "is_weekend", "is_terminal_closure",
        ]),
        "date_range": {
            "start": str(df["date"].min().date()),
            "end": str(df["date"].max().date()),
        },
        "routes": {},
        "overall": {},
    }

    # Per-route validation
    all_cvs = []
    all_acfs = []
    for rid in ROUTE_IDS:
        rdf = df[(df["route_id"] == rid) & (df["passenger_count"] > 0)]
        # Compute CV on NON-surge, non-closure days only (fair comparison to baseline)
        normal_days = rdf[rdf["is_holiday"] == 0]
        vals_normal = normal_days["passenger_count"].values
        cv_normal = float(np.std(vals_normal) / np.mean(vals_normal)) if len(vals_normal) > 0 else 0

        # Also compute full CV for reference
        vals_all = rdf["passenger_count"].values
        cv_all = float(np.std(vals_all) / np.mean(vals_all)) if len(vals_all) > 0 else 0

        # Compute lag-1 ACF on non-closure, non-surge days
        if len(vals_normal) > 10:
            mean_v = np.mean(vals_normal)
            num = np.sum((vals_normal[:-1] - mean_v) * (vals_normal[1:] - mean_v))
            den = np.sum((vals_normal - mean_v) ** 2)
            acf1 = float(num / den) if den > 0 else 0.0
        else:
            acf1 = 0.0

        surge_pct = float(rdf["is_holiday"].mean() * 100)
        closure_pct = float(df[(df["route_id"] == rid)]["is_terminal_closure"].mean() * 100)

        all_cvs.append(cv_normal)
        all_acfs.append(acf1)
        report["routes"][rid] = {
            "mean": round(float(np.mean(vals_all)), 1),
            "median": round(float(np.median(vals_all)), 1),
            "std": round(float(np.std(vals_all)), 1),
            "cv_normal_days": round(cv_normal, 4),
            "cv_all_days": round(cv_all, 4),
            "lag1_acf": round(acf1, 4),
            "surge_days_pct": round(surge_pct, 2),
            "closure_pct": round(closure_pct, 2),
        }

    report["overall"] = {
        "mean_cv": round(float(np.mean(all_cvs)), 4),
        "target_cv": stats["median_weekly_cv"],
        "cv_in_range": abs(float(np.mean(all_cvs)) - stats["median_weekly_cv"]) < 0.10,
    }

    return report


# ══════════════════════════════════════════════════════════════════════════
# CLI Entrypoint
# ══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="IQueue — Enhanced Synthetic Ridership Data Generator"
    )
    parser.add_argument(
        "--kaggle-data",
        type=str,
        default="ml/forecasting/data/kaggle-bus-ridership.CSV",
        help="Path to Adelaide Metro bus ridership CSV for statistics extraction.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="ml/forecasting/data/raw/",
        help="Directory to write output CSV and stats JSON.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility.",
    )
    args = parser.parse_args()

    # Resolve paths: if relative, resolve from CWD (project root), not script dir
    cwd = Path.cwd()
    kaggle_path = Path(args.kaggle_data) if os.path.isabs(args.kaggle_data) else cwd / args.kaggle_data
    output_dir = Path(args.output_dir) if os.path.isabs(args.output_dir) else cwd / args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("IQueue — Enhanced Synthetic Ridership Data Generator")
    print("=" * 70)
    print(f"Kaggle data: {kaggle_path}")
    print(f"Output dir:  {output_dir}")
    print(f"Random seed: {args.seed}")
    print()

    # Step 1: Analyze real-world data
    analyzer = KaggleDataAnalyzer(str(kaggle_path))
    stats = analyzer.analyze()

    # Step 2: Generate enhanced synthetic data
    generator = SyntheticDataGenerator(stats, seed=args.seed)
    df = generator.generate()

    # Step 3: Validate
    print("\n" + "=" * 70)
    print("Statistical Validation")
    print("=" * 70)
    validation = validate_generated_data(df, stats)
    for rid in ROUTE_IDS:
        r = validation["routes"][rid]
        print(f"  {rid:25s} CV_normal={r['cv_normal_days']:.3f} CV_all={r['cv_all_days']:.3f} "
              f"ACF={r['lag1_acf']:.3f} "
              f"Surge={r['surge_days_pct']:.1f}% Closure={r['closure_pct']:.1f}%")
    print(f"  Overall mean CV (normal days): {validation['overall']['mean_cv']:.4f} "
          f"(target: {validation['overall']['target_cv']:.4f})")
    print(f"  CV in range: {validation['overall']['cv_in_range']}")

    # Step 4: Save outputs
    csv_path = output_dir / "ridership_synthetic.csv"
    df.to_csv(csv_path, index=False)
    print(f"\nSaved: {csv_path} ({csv_path.stat().st_size / 1024:.1f} KB)")

    # Save generation stats alongside
    stats_path = output_dir / "data_generation_stats.json"
    generation_config = {
        "generated_at": datetime.now().isoformat(),
        "script": "ml/forecasting/generate_training_data.py",
        "random_seed": args.seed,
        "reference_stats": stats,
        "validation": {k: v for k, v in validation.items() if k != "routes"},
        "parameters": {
            "date_range": "2022-01-01 to 2024-12-31",
            "num_routes": len(ROUTES),
            "route_ids": ROUTE_IDS,
            "surge_events": [
                {"name": e["name"], "mult_mean": e["mult_mean"], "mult_std": e["mult_std"]}
                for e in SURGE_EVENTS
            ],
            "dow_multipliers": DOW_MULTIPLIERS,
            "ar1_phi_target": stats["median_lag1_acf"],
            "cv_target": stats["median_weekly_cv"],
            "annual_growth_rate": 0.015,
            "monthly_seasonality_amplitude": 0.06,
        },
    }
    with open(stats_path, "w") as f:
        json.dump(generation_config, f, indent=2)
    print(f"Saved: {stats_path}")

    print("\nDone. Ready for Kaggle upload.")
    print(f"Upload {csv_path} as Kaggle dataset 'iqueue-forecasting/ridership_synthetic.csv'")


if __name__ == "__main__":
    main()