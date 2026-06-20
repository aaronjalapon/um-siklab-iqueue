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
from app.models.forecast_learning import ForecastSnapshot
from app.models.forecast_learning import OperationalOutcome
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


def _risk_action_from_probability(surge_probability: float) -> tuple[str, str]:
    """Translate surge probability into an operator-facing action."""

    if surge_probability >= 0.85:
        return (
            "critical",
            "Prepare standby bus and activate crowd-control plan",
        )
    if surge_probability >= 0.70:
        return "high", "Open extra boarding lane and notify dispatcher"
    if surge_probability >= 0.40:
        return "moderate", "Stage extra staff and monitor queue growth"
    return "low", "Continue normal boarding operations"


def _confidence_from_interval(prediction: SurgePrediction) -> float | None:
    """Estimate confidence from interval width when bounds are available."""

    if prediction.confidence_lower is None or prediction.confidence_upper is None:
        return None
    if prediction.predicted_volume <= 0:
        return 0.5
    interval_width = prediction.confidence_upper - prediction.confidence_lower
    relative_width = interval_width / max(prediction.predicted_volume, 1)
    return round(max(0.05, min(0.95, 1.0 - relative_width / 2.0)), 4)


async def _persist_forecast_snapshots(
    db: AsyncSession,
    route: BusRoute,
    predictions: list[SurgePrediction],
    *,
    model_source: str,
    model_version: str | None,
) -> list[SurgePrediction]:
    """Persist forecast snapshots and attach their IDs to response rows."""

    enriched: list[SurgePrediction] = []
    for prediction in predictions:
        risk_level, recommended_action = _risk_action_from_probability(
            prediction.surge_probability
        )
        prediction.risk_level = risk_level
        prediction.recommended_action = recommended_action
        prediction.model_confidence = _confidence_from_interval(prediction)

        snapshot = ForecastSnapshot(
            tenant_id=route.tenant_id,
            route_id=route.id,
            forecast_date=prediction.forecast_date,
            predicted_volume=prediction.predicted_volume,
            surge_probability=prediction.surge_probability,
            risk_level=risk_level,
            recommended_action=recommended_action,
            model_version=model_version,
            model_source=model_source,
            model_confidence=prediction.model_confidence,
            confidence_lower=prediction.confidence_lower,
            confidence_upper=prediction.confidence_upper,
            input_features={
                "is_holiday": prediction.is_holiday,
                "holiday_name": prediction.holiday_name,
            },
        )
        db.add(snapshot)
        await db.flush()
        prediction.forecast_snapshot_id = snapshot.id
        enriched.append(prediction)

    return enriched


async def _recent_route_history(
    db: AsyncSession,
    route_id: UUID,
    days: int = 14,
) -> list[tuple[date, float]]:
    """Load recent actual outcomes and booking counts for model features."""

    outcomes = list(
        (
            await db.scalars(
                select(OperationalOutcome)
                .where(OperationalOutcome.route_id == route_id)
                .order_by(OperationalOutcome.service_date.desc())
                .limit(days)
            )
        ).all()
    )
    history = {
        outcome.service_date: float(outcome.actual_passenger_count)
        for outcome in outcomes
    }

    booking_dates = (
        await db.scalars(
            select(Booking.departure_date)
            .join(Bus, Booking.bus_id == Bus.id)
            .where(
                Bus.route_id == route_id,
                Booking.status.in_(
                    [BookingStatus.CONFIRMED, BookingStatus.BOARDED]
                ),
            )
            .order_by(Booking.departure_date.desc())
            .limit(days * 100)
        )
    ).all()
    booking_counts: dict[date, int] = {}
    for departure in booking_dates:
        departure_day = departure.date()
        booking_counts[departure_day] = booking_counts.get(departure_day, 0) + 1
    for service_date, count in booking_counts.items():
        history.setdefault(service_date, float(count))

    return sorted(history.items(), key=lambda item: item[0])[-days:]


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

    predictions: list[SurgePrediction] | None = None
    model_source = "heuristic"
    model_version: str | None = "heuristic-v1"
    metrics_summary: dict | None = None

    # Try to use the warmed ML forecasting singleton first.
    try:
        from app.core.startup import get_forecasting_service

        service = get_forecasting_service()
        if service is not None and service.has_route_bundle(route_id):
            recent_history = await _recent_route_history(db, route_id)
            predictions = service.predict(
                route_id,
                horizon_days=7,
                recent_history=recent_history,
            )
            model_source = "ml_bundle"
            model_version = service.artifact_version or "v1-hackathon"
            metrics_summary = service.metrics_summary
            logger.info(
                "Forecast for route %s: ML bundle %s with %d history rows",
                route_id,
                model_version,
                len(recent_history),
            )
    except (ImportError, FileNotFoundError) as e:
        logger.warning("ML forecast unavailable for route %s: %s — using heuristic", route_id, e)

    # Fallback: deterministic heuristic from real booking data
    # Count total bookings on this route (all-time, for baseline)
    if predictions is None:
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

    predictions = await _persist_forecast_snapshots(
        db,
        route,
        predictions,
        model_source=model_source,
        model_version=model_version,
    )

    return {
        "route_id": route_id,
        "route_origin": route.origin,
        "route_destination": route.destination,
        "generated_at": date.today(),
        "model_source": model_source,
        "model_version": model_version,
        "metrics_summary": metrics_summary,
        "predictions": predictions,
    }
