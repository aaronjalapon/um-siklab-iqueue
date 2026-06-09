"""Forecast route handlers — surge predictions for bus routes."""

from __future__ import annotations

import logging
from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.bus_route import BusRoute
from app.schemas.forecast import ForecastResponse, SurgePrediction

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Deterministic heuristic fallback — used when ML model artifacts are absent.
# Based on real booking data + ASEAN holiday calendar + day-of-week patterns.
# ---------------------------------------------------------------------------

def _heuristic_forecast(
    route: BusRoute,
    avg_bookings_per_day: float,
    total_capacity: int,
) -> list[SurgePrediction]:
    """Build a 7-day surge forecast from booking counts and calendar heuristics.

    No randomness. Based on:
      - Average daily bookings on this route (real data from DB)
      - Day of week (Friday/Saturday/Sunday → higher demand)
      - ASEAN holiday calendar (holidays → +50% surge)
    """
    today = date.today()

    # Try to load the ASEAN holiday calendar
    try:
        from data.pipeline.holidays import HolidaysASEAN  # type: ignore
        _has_holidays = True
    except ImportError:
        _has_holidays = False

    # Baseline load factor from real booking data.
    # Floor at 0.15 so routes with few bookings still show meaningful surge.
    raw_load = avg_bookings_per_day / max(total_capacity, 1)
    baseline_load = max(0.15, raw_load)
    baseline_volume = max(30, avg_bookings_per_day)

    predictions: list[SurgePrediction] = []
    for i in range(7):
        d = today + timedelta(days=i + 1)
        dow = d.weekday()  # 0=Mon, 6=Sun

        # Day-of-week multiplier: weekends and Fridays are busier
        if dow == 6:  # Sunday
            dow_mult = 1.25
        elif dow in (4, 5):  # Friday, Saturday
            dow_mult = 1.35
        elif dow == 0:  # Monday
            dow_mult = 1.10
        else:
            dow_mult = 0.85

        # Holiday check
        is_holiday = False
        holiday_name = None
        holiday_mult = 1.0
        if _has_holidays:
            try:
                if HolidaysASEAN.is_holiday(d, country=None):
                    is_holiday = True
                    # Find the matching holiday name
                    for country in ("PH", "ID", "VN", "MY"):
                        name = HolidaysASEAN.get_holiday_name(d, country)
                        if name:
                            holiday_name = name
                            holiday_mult = HolidaysASEAN.get_surge_multiplier(d, country)
                            break
            except Exception:
                pass  # holiday lookup is best-effort; skip if it fails

        # Compute surge probability from load factor × day-of-week × holiday
        surge = min(0.95, baseline_load * dow_mult * holiday_mult)
        volume = int(baseline_volume * dow_mult * holiday_mult)

        # Confidence interval: ±20% of predicted volume
        margin = max(10, int(volume * 0.2))

        predictions.append(SurgePrediction(
            forecast_date=d,
            surge_probability=round(surge, 4),
            predicted_volume=max(0, volume),
            confidence_lower=max(0, volume - margin),
            confidence_upper=volume + margin,
            is_holiday=is_holiday,
            holiday_name=holiday_name,
        ))

    return predictions


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/{route_id}",
    response_model=ForecastResponse,
    summary="Get 7-day surge forecast for a route",
)
async def get_forecast(
    route_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the 7-day surge probability forecast for a bus route.

    Uses the Prophet + LSTM hybrid model when available; falls back to a
    deterministic heuristic based on real booking counts, day-of-week
    patterns, and the ASEAN holiday calendar.
    """
    # Validate route exists
    route = await db.get(BusRoute, route_id)
    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route {route_id} not found",
        )

    # Try to use the ML forecasting service first
    try:
        from app.services.forecasting.predictor import ForecastingService
        service = ForecastingService()
        predictions = service.predict(route_id, horizon_days=7)

        # If ML model returns all-zero surge (untrained / cold start), fall back
        max_surge = max((p.surge_probability for p in predictions), default=0)
        if max_surge > 0.01:
            logger.info("Forecast for route %s: using ML model (max surge=%.2f)", route_id, max_surge)
            return {
                "route_id": route_id,
                "route_origin": route.origin,
                "route_destination": route.destination,
                "generated_at": predictions[0].forecast_date if predictions else None,
                "predictions": predictions,
            }
        logger.info("Forecast for route %s: ML model returned flat surges — using heuristic", route_id)
    except (ImportError, FileNotFoundError) as e:
        logger.warning("ML forecast unavailable for route %s: %s — using heuristic", route_id, e)

    # Fallback: deterministic heuristic from real booking data
    # Count total bookings on this route (all-time, for baseline)
    booking_count_result = await db.execute(
        select(func.count(Booking.id))
        .join(Bus, Booking.bus_id == Bus.id)
        .where(
            Bus.route_id == route_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.BOARDED]),
        )
    )
    total_bookings = booking_count_result.scalar() or 0

    # Get total capacity across all buses on this route
    capacity_result = await db.execute(
        select(func.sum(Bus.capacity))
        .where(Bus.route_id == route_id)
    )
    total_capacity = capacity_result.scalar() or 50

    # Estimate average daily bookings (assume bookings span ~90 days)
    avg_daily = total_bookings / max(90, 1)

    predictions = _heuristic_forecast(route, avg_daily, total_capacity)
    logger.info(
        "Forecast for route %s: heuristic (total_bookings=%d, avg_daily=%.1f, capacity=%d)",
        route_id, total_bookings, avg_daily, total_capacity,
    )

    return {
        "route_id": route_id,
        "route_origin": route.origin,
        "route_destination": route.destination,
        "generated_at": date.today(),
        "predictions": predictions,
    }
