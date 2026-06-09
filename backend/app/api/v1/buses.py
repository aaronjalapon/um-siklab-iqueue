"""Bus route handlers — list buses, get seat maps."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.bus_route import BusRoute
from app.schemas.bus import BusResponse, BusListResponse, SeatInfo, SeatMapResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "",
    response_model=BusListResponse,
    summary="Search buses by route",
)
async def list_buses(
    origin: str = Query(..., min_length=1, description="Origin city"),
    destination: str = Query(..., min_length=1, description="Destination city"),
    travel_date: str = Query(..., description="Travel date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List available buses for a route on a given date.

    Returns buses with available seat counts and surge probability badges.
    """
    # Find matching route
    result = await db.execute(
        select(BusRoute).where(
            BusRoute.origin.ilike(f"%{origin}%"),
            BusRoute.destination.ilike(f"%{destination}%"),
        )
    )
    route = result.scalars().first()

    if not route:
        return {
            "buses": [],
            "total": 0,
            "route_origin": origin,
            "route_destination": destination,
        }

    # Find buses on this route
    buses_result = await db.execute(
        select(Bus).where(Bus.route_id == route.id)
    )
    buses = buses_result.scalars().all()

    bus_responses = []
    for bus in buses:
        # Count confirmed bookings for this bus on this date
        from datetime import date, timedelta
        try:
            parsed_date = date.fromisoformat(travel_date)
            start_dt = parsed_date
            end_dt = parsed_date + timedelta(days=1)
        except ValueError:
            continue

        bookings_count = (
            await db.scalar(
                select(func.count(Booking.id)).where(
                    Booking.bus_id == bus.id,
                    Booking.departure_date >= start_dt,
                    Booking.departure_date < end_dt,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
                )
            )
        ) or 0

        bus_responses.append({
            "id": bus.id,
            "tenant_id": bus.tenant_id,
            "route_id": bus.route_id,
            "capacity": bus.capacity,
            "plate_number": bus.plate_number,
            "origin": route.origin,
            "destination": route.destination,
            "available_seats": max(0, bus.capacity - bookings_count),
            "surge_probability": None,  # Populated below from forecast service
        })

    # Populate surge probabilities from the forecasting service
    if bus_responses and route:
        try:
            from app.services.forecasting.predictor import ForecastingService
            service = ForecastingService()
            predictions = service.predict(route.id, horizon_days=7)
            if predictions:
                # Use tomorrow's surge (index 0 = tomorrow) as the badge value
                # — more actionable than a 7-day average
                tomorrow_surge = predictions[0].surge_probability
                # Also compute 3-day peak for operator awareness
                near_term = [p.surge_probability for p in predictions[:3]]
                peak_3day = max(near_term)

                for br in bus_responses:
                    br["surge_probability"] = round(tomorrow_surge, 4)
                    # Attach per-day values for the first 3 days
                    br["surge_3day"] = [
                        {"date": str(p.forecast_date), "surge": p.surge_probability}
                        for p in predictions[:3]
                    ]
        except Exception as e:
            logger.warning("Surge forecast unavailable for route %s: %s", route.id, e)
            # Try heuristic fallback
            try:
                from app.api.v1.forecasts import _heuristic_forecast
                cap_result = await db.execute(
                    select(func.sum(Bus.capacity)).where(Bus.route_id == route.id)
                )
                route_cap = cap_result.scalar() or 50
                # Count total bookings on this route for baseline
                route_booking_count = (
                    await db.scalar(
                        select(func.count(Booking.id)).where(
                            Booking.bus_id.in_(
                                select(Bus.id).where(Bus.route_id == route.id)
                            ),
                            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.BOARDED]),
                        )
                    )
                ) or 0
                avg_daily = route_booking_count / max(90, 1)
                preds = _heuristic_forecast(route, avg_daily, route_cap)
                if preds:
                    for br in bus_responses:
                        br["surge_probability"] = preds[0].surge_probability
            except Exception as e2:
                logger.warning("Heuristic forecast also failed for route %s: %s", route.id, e2)

    return {
        "buses": bus_responses,
        "total": len(bus_responses),
        "route_origin": route.origin,
        "route_destination": route.destination,
    }


@router.get(
    "/{bus_id}/seats",
    response_model=SeatMapResponse,
    summary="Get bus seat map",
)
async def get_seat_map(
    bus_id: UUID,
    travel_date: str = Query(..., description="Travel date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get the complete seat map for a bus showing availability."""
    from datetime import date, timedelta

    bus = await db.get(Bus, bus_id)
    if not bus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bus {bus_id} not found",
        )

    try:
        parsed_date = date.fromisoformat(travel_date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {travel_date}. Use YYYY-MM-DD.",
        )

    # Get booked seats for this bus on this date
    bookings_result = await db.execute(
        select(Booking).where(
            Booking.bus_id == bus_id,
            Booking.departure_date >= parsed_date,
            Booking.departure_date < parsed_date + timedelta(days=1),
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
        )
    )
    bookings = bookings_result.scalars().all()

    booked_seats = {b.seat_number for b in bookings}

    # Build seat map
    seats = []
    for seat_num in range(1, bus.capacity + 1):
        seat_str = str(seat_num)
        seats.append(SeatInfo(
            seat_number=seat_str,
            is_available=seat_str not in booked_seats,
            passenger_name=None,
        ))

    return {
        "bus_id": bus.id,
        "capacity": bus.capacity,
        "seats": seats,
        "booked_count": len(booked_seats),
        "available_count": bus.capacity - len(booked_seats),
    }
