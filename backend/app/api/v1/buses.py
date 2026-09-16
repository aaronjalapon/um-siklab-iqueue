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
from app.models.seat import Seat, SeatStatus
from app.schemas.bus import BusListResponse, SeatInfo, SeatMapResponse

logger = logging.getLogger(__name__)
router = APIRouter()

ROUTE_BASE_FARES = {
    ("davao city", "cagayan de oro"): 670,
    ("cagayan de oro", "davao city"): 670,
    ("davao city", "general santos"): 540,
    ("general santos", "davao city"): 540,
    ("davao city", "cotabato city"): 500,
    ("cotabato city", "davao city"): 500,
    ("cagayan de oro", "iligan city"): 400,
    ("iligan city", "cagayan de oro"): 400,
    ("davao city", "butuan city"): 620,
    ("butuan city", "davao city"): 620,
    ("cotabato city", "zamboanga city"): 750,
    ("zamboanga city", "cotabato city"): 750,
}


def get_route_base_fare(origin: str, destination: str) -> int:
    orig = origin.lower().strip()
    dest = destination.lower().strip()

    for (o, d), fare in ROUTE_BASE_FARES.items():
        if (o in orig or orig in o) and (d in dest or dest in d):
            return fare

    if ("davao" in orig and "cagayan" in dest) or ("cagayan" in orig and "davao" in dest):
        return 670
    if ("davao" in orig and ("gensan" in dest or "general santos" in dest)) or (
        ("gensan" in orig or "general santos" in orig) and "davao" in dest
    ):
        return 540
    if ("davao" in orig and "cotabato" in dest) or ("cotabato" in orig and "davao" in dest):
        return 500
    if ("cagayan" in orig and "iligan" in dest) or ("iligan" in orig and "cagayan" in dest):
        return 400
    if ("davao" in orig and "butuan" in dest) or ("butuan" in orig and "davao" in dest):
        return 620
    if ("cotabato" in orig and "zamboanga" in dest) or (
        "zamboanga" in orig and "cotabato" in dest
    ):
        return 750

    return 500


def calculate_bus_fare(base_fare: int, capacity: int) -> int:
    """Calculate the passenger fare based on route base fare and bus capacity tier."""
    if capacity >= 45:
        # Standard high-capacity coach (49 seats)
        return base_fare
    # Small bus (28 seats): ~10% lower fare, rounded to nearest 10
    return round((base_fare * 0.90) / 10) * 10


BIG_BUS_SEATS_BOOKED = [
    # 4 accessibility seats (rows 1-2) — leave 1C and 1D available as an adjacent pair for accessibility demo
    "1A", "1B", "2A", "2C",
    # 28 standard seats (rows 3-13)
    "3A", "3C", "3D", "4B", "4C", "5A", "5B", "5D", "6A", "6C", "7B", "7C", "7D",
    "8A", "8B", "8C", "9A", "9D", "10A", "10B", "10C", "11B", "11C", "11D", "12A", "12B", "12D", "12E",
]

SMALL_BUS_SEATS_BOOKED = [
    # 4 accessibility seats (rows 1-2) — leave 1C and 1D available as an adjacent pair for accessibility demo
    "1A", "1B", "2A", "2B",
    # 15 standard seats (rows 3-7)
    "3A", "3B", "3D", "4A", "4C", "4D", "5A", "5B", "5C", "6A", "6B", "6D", "7A", "7C", "7D",
]

DEMO_PASSENGER_NAMES = [
    ("Maria Santos", "student"),
    ("Juan Dela Cruz", "regular"),
    ("Christian Reyes", "senior"),
    ("Ana Ramos", "pwd"),
    ("Mark Bautista", "regular"),
    ("Grace Tan", "business"),
    ("Dennis Garcia", "regular"),
    ("Jasmine Lim", "student"),
    ("Paolo Cruz", "regular"),
    ("Rhea Gomez", "business"),
    ("Kenneth Torres", "regular"),
    ("Patricia Flores", "student"),
    ("Michael Villanueva", "regular"),
    ("Angela Mercado", "pwd"),
    ("Joshua Aquino", "senior"),
    ("Camille Castillo", "regular"),
    ("Daniel Morales", "student"),
    ("Stephanie Diaz", "regular"),
    ("Ryan Navarro", "business"),
    ("Kaye Mendoza", "regular"),
    ("Arvin Soriano", "regular"),
    ("Bianca Ramos", "student"),
    ("Jerome Castro", "regular"),
    ("Hannah Valdez", "regular"),
    ("Gerald Salazar", "regular"),
    ("Joy Pascual", "student"),
    ("Francis Pineda", "regular"),
    ("Katrina David", "regular"),
    ("Dexter Ocampo", "business"),
    ("Michelle Corpuz", "regular"),
    ("Neil Santiago", "student"),
    ("Rowena Miranda", "regular"),
    ("Lester Dizon", "regular"),
    ("Sheryl Aguilar", "regular"),
]


async def _get_or_create_demo_passengers(
    db: AsyncSession, tenant_id: UUID
) -> list[UUID]:
    from app.models.passenger import Passenger
    import uuid

    result = await db.execute(
        select(Passenger.id).where(Passenger.tenant_id == tenant_id).limit(35)
    )
    pids = list(result.scalars().all())
    if len(pids) >= 10:
        return pids

    new_pids = []
    for name, habit in DEMO_PASSENGER_NAMES:
        pid = uuid.uuid5(uuid.NAMESPACE_DNS, f"iqueue.demo.{tenant_id}.{name}")
        existing = await db.get(Passenger, pid)
        if not existing:
            p = Passenger(
                id=pid,
                tenant_id=tenant_id,
                name=name,
                phone=f"+63917{abs(hash(name)) % 9000000 + 1000000}",
                language_pref="fil",
                travel_habits=habit,
                accessibility_needs=(habit in ("senior", "pwd")),
            )
            db.add(p)
        new_pids.append(pid)
    await db.flush()
    return pids + new_pids


async def _ensure_demo_bookings_for_bus_date(
    db: AsyncSession,
    bus: Bus,
    travel_date: date,
) -> int:
    from datetime import datetime, time, timezone, timedelta
    import uuid

    start_dt = datetime.combine(travel_date, time(0, 0), tzinfo=timezone.utc)
    end_dt = start_dt + timedelta(days=1)

    existing_count = (
        await db.scalar(
            select(func.count(Booking.id)).where(
                Booking.bus_id == bus.id,
                Booking.departure_date >= start_dt,
                Booking.departure_date < end_dt,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
            )
        )
    ) or 0
    if existing_count > 0:
        return existing_count

    pids = await _get_or_create_demo_passengers(db, bus.tenant_id)
    if not pids:
        return 0

    seats_to_book = (
        BIG_BUS_SEATS_BOOKED if bus.capacity >= 45 else SMALL_BUS_SEATS_BOOKED
    )
    bookings = []
    for idx, seat_label in enumerate(seats_to_book):
        pid = pids[idx % len(pids)]
        row_num = int("".join(filter(str.isdigit, seat_label)) or "1")
        w_start = start_dt.replace(hour=6) + timedelta(minutes=row_num * 3)
        w_end = w_start + timedelta(minutes=15)
        booking = Booking(
            id=uuid.uuid4(),
            passenger_id=pid,
            bus_id=bus.id,
            seat_number=seat_label,
            boarding_window_start=w_start,
            boarding_window_end=w_end,
            status=BookingStatus.CONFIRMED,
            departure_date=start_dt,
        )
        bookings.append(booking)

    db.add_all(bookings)
    await db.commit()
    return len(bookings)


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
    base_fare = get_route_base_fare(route.origin, route.destination)

    for bus in buses:
        # Count confirmed bookings for this bus on this date
        from datetime import date, datetime, time, timezone, timedelta
        try:
            parsed_date = date.fromisoformat(travel_date)
            start_dt = datetime.combine(parsed_date, time(0, 0), tzinfo=timezone.utc)
            end_dt = start_dt + timedelta(days=1)
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

        # Auto-seed realistic demo bookings if this bus is empty on this service date
        if bookings_count == 0:
            bookings_count = await _ensure_demo_bookings_for_bus_date(
                db, bus, parsed_date
            )

        accessibility_total = (
            await db.scalar(
                select(func.count(Seat.id)).where(
                    Seat.bus_id == bus.id,
                    Seat.is_accessibility.is_(True),
                )
            )
        ) or min(bus.capacity, 8)

        accessibility_booked = (
            await db.scalar(
                select(func.count(Booking.id))
                .join(
                    Seat,
                    (Booking.bus_id == Seat.bus_id)
                    & (Booking.seat_number == Seat.seat_label),
                )
                .where(
                    Booking.bus_id == bus.id,
                    Booking.departure_date >= start_dt,
                    Booking.departure_date < end_dt,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
                    Seat.is_accessibility.is_(True),
                )
            )
        ) or 0
        accessibility_available = max(0, accessibility_total - accessibility_booked)

        fare = calculate_bus_fare(base_fare, bus.capacity)

        bus_responses.append({
            "id": bus.id,
            "tenant_id": bus.tenant_id,
            "route_id": bus.route_id,
            "capacity": bus.capacity,
            "plate_number": bus.plate_number,
            "origin": route.origin,
            "destination": route.destination,
            "available_seats": max(0, bus.capacity - bookings_count),
            "accessibility_seat_count": accessibility_total,
            "accessibility_available_count": accessibility_available,
            "surge_probability": None,  # Populated below from forecast service
            "fare": fare,
        })

    # Populate surge probabilities from the forecasting service
    if bus_responses and route:
        predictions = []
        try:
            from app.core.startup import get_forecasting_service

            service = get_forecasting_service()
            if service is not None and service.has_route_bundle(route.id):
                predictions = service.predict(route.id, horizon_days=7)
        except Exception as e:
            logger.warning("Surge forecast unavailable for route %s: %s", route.id, e)

        # Fallback to heuristic forecast if ML bundle is absent or returned no predictions
        if not predictions:
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
                predictions = _heuristic_forecast(route, avg_daily, route_cap)
            except Exception as e2:
                logger.warning("Heuristic forecast also failed for route %s: %s", route.id, e2)

        if predictions:
            tomorrow_surge = predictions[0].surge_probability
            for br in bus_responses:
                # Add micro-variance based on capacity tier so surge sorting demonstrates differentiation
                mult = 1.15 if br["capacity"] < 45 else 0.95
                bus_surge = round(min(0.99, max(0.05, tomorrow_surge * mult)), 3)
                br["surge_probability"] = bus_surge
                # Attach per-day values for the first 3 days
                br["surge_3day"] = [
                    {"date": str(p.forecast_date), "surge": round(min(0.99, p.surge_probability * mult), 3)}
                    for p in predictions[:3]
                ]

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

    if not bookings:
        await _ensure_demo_bookings_for_bus_date(db, bus, parsed_date)
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

    seat_rows_result = await db.execute(
        select(Seat)
        .where(Seat.bus_id == bus_id)
        .order_by(Seat.row_number, Seat.col_number)
    )
    seat_rows = seat_rows_result.scalars().all()

    # Build seat map
    seats = []
    if seat_rows:
        for seat in seat_rows:
            seats.append(SeatInfo(
                seat_number=seat.seat_label,
                is_available=seat.seat_label not in booked_seats,
                is_accessibility=seat.is_accessibility,
                is_near_exit=seat.is_near_exit,
                passenger_name=None,
            ))
    else:
        if bus.capacity == 49:
            for r in range(1, 12):
                for col_letter in ("A", "B", "C", "D"):
                    seat_str = f"{r}{col_letter}"
                    seats.append(SeatInfo(
                        seat_number=seat_str,
                        is_available=seat_str not in booked_seats,
                        is_accessibility=r <= 2,
                        is_near_exit=r == 1,
                        passenger_name=None,
                    ))
            for col_letter in ("A", "B", "C", "D", "E"):
                seat_str = f"12{col_letter}"
                seats.append(SeatInfo(
                    seat_number=seat_str,
                    is_available=seat_str not in booked_seats,
                    is_accessibility=False,
                    is_near_exit=True,
                    passenger_name=None,
                ))
        else:
            columns = ("A", "B", "C", "D")
            for seat_num in range(1, bus.capacity + 1):
                row = (seat_num - 1) // len(columns) + 1
                col = columns[(seat_num - 1) % len(columns)]
                seat_str = f"{row}{col}"
                seats.append(SeatInfo(
                    seat_number=seat_str,
                    is_available=seat_str not in booked_seats,
                    is_accessibility=row <= 2,
                    is_near_exit=row == 1,
                    passenger_name=None,
                ))

    accessibility_seats = [seat for seat in seats if seat.is_accessibility]

    return {
        "bus_id": bus.id,
        "capacity": bus.capacity,
        "seats": seats,
        "booked_count": len(booked_seats),
        "available_count": bus.capacity - len(booked_seats),
        "accessibility_seat_count": len(accessibility_seats),
        "accessibility_available_count": sum(
            1 for seat in accessibility_seats if seat.is_available
        ),
    }
