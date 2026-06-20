"""Date-aware seat availability helpers for passenger booking flows.

These helpers treat occupancy as a per-departure concern derived from
bookings on a specific service day, instead of using the global seat
status flag on the physical bus.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking, BookingStatus
from app.models.bus import Bus
from app.models.seat import Seat, SeatStatus
from app.services.seat_assignment.bus_layout import generate_seats_for_bus
from app.services.seat_assignment.engine import (
    BusNotFoundError,
    SeatAllocator,
    SeatUnavailableError,
)
from app.services.seat_assignment.scorer import (
    PassengerContext,
    score_seat_breakdown,
)

ACTIVE_BOOKING_STATUSES = (
    BookingStatus.CONFIRMED,
    BookingStatus.PENDING,
    BookingStatus.BOARDED,
)


def _day_bounds(travel_date: date | datetime) -> tuple[datetime, datetime]:
    """Return UTC day bounds for a travel date or departure datetime."""
    day = travel_date.date() if isinstance(travel_date, datetime) else travel_date
    start = datetime.combine(day, time.min, tzinfo=timezone.utc)
    return start, start + timedelta(days=1)


def _boarding_window(
    row_number: int,
    *,
    departure_datetime: datetime | None,
    service_day: date,
) -> str:
    """Build a simple row-based boarding window string."""
    if departure_datetime is not None:
        base = departure_datetime
    else:
        base = datetime.combine(service_day, time(6, 0), tzinfo=timezone.utc)
    window_start = base + timedelta(minutes=row_number * 3)
    window_end = window_start + timedelta(minutes=15)
    return f"{window_start.strftime('%H:%M')}–{window_end.strftime('%H:%M')}"


async def _load_bus_and_seats(
    session: AsyncSession,
    bus_id: str | UUID,
) -> tuple[Bus, list[Seat]]:
    """Load a bus and ensure its seat layout rows exist."""
    bus_uuid = UUID(str(bus_id))
    bus_result = await session.execute(
        select(Bus)
        .options(selectinload(Bus.layout))
        .where(Bus.id == bus_uuid)
    )
    bus = bus_result.scalars().first()
    if bus is None:
        raise BusNotFoundError(f"Bus {bus_uuid} not found")

    seats_result = await session.execute(
        select(Seat)
        .where(Seat.bus_id == bus_uuid)
        .order_by(Seat.row_number, Seat.col_number)
    )
    seats = list(seats_result.scalars().all())
    if not seats:
        seats = await generate_seats_for_bus(bus, session)
    return bus, seats


async def _bookings_for_service_day(
    session: AsyncSession,
    bus_id: str | UUID,
    travel_date: date | datetime,
) -> list[Booking]:
    """Load active bookings for a bus on a specific service day."""
    bus_uuid = UUID(str(bus_id))
    start, end = _day_bounds(travel_date)
    result = await session.execute(
        select(Booking)
        .options(selectinload(Booking.passenger))
        .where(
            Booking.bus_id == bus_uuid,
            Booking.departure_date >= start,
            Booking.departure_date < end,
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
        )
    )
    return list(result.scalars().all())


async def get_travel_date_seat_map(
    session: AsyncSession,
    bus_id: str | UUID,
    travel_date: date | datetime,
) -> list[dict]:
    """Return a seat map whose occupancy is scoped to one service day."""
    _, seats = await _load_bus_and_seats(session, bus_id)
    bookings = await _bookings_for_service_day(session, bus_id, travel_date)
    bookings_by_label = {booking.seat_number: booking for booking in bookings}

    seat_map: list[dict] = []
    for seat in seats:
        booking = bookings_by_label.get(seat.seat_label)
        if seat.status == SeatStatus.BLOCKED:
            status = SeatStatus.BLOCKED.value
        elif booking is not None:
            status = SeatStatus.OCCUPIED.value
        else:
            status = SeatStatus.AVAILABLE.value

        seat_map.append(
            {
                "seat_id": str(seat.id),
                "seat_label": seat.seat_label,
                "row_number": seat.row_number,
                "col_number": seat.col_number,
                "seat_type": seat.seat_type.value,
                "side": seat.side,
                "is_near_exit": seat.is_near_exit,
                "is_accessibility": seat.is_accessibility,
                "status": status,
                "passenger_name": booking.passenger.name
                if booking is not None and booking.passenger is not None
                else None,
                "group_id": None,
                "language_preference": None,
                "travel_habit": None,
                "lifestyle_interest": None,
                "needs_accessibility": None,
                "preferred_seat_type": None,
                "affinity_score": None,
                "boarding_window": None,
            }
        )

    return seat_map


async def assign_for_travel_date(
    session: AsyncSession,
    bus_id: str | UUID,
    passenger: PassengerContext,
    travel_date: date | datetime,
    *,
    seat_label: str | None = None,
    departure_datetime: datetime | None = None,
) -> dict:
    """Preview or validate an assignment using service-day availability."""
    bus, seats = await _load_bus_and_seats(session, bus_id)
    bookings = await _bookings_for_service_day(session, bus_id, travel_date)
    booked_labels = {booking.seat_number for booking in bookings}

    available_seats = [
        seat
        for seat in seats
        if seat.status != SeatStatus.BLOCKED and seat.seat_label not in booked_labels
    ]

    if seat_label is not None:
        available_seats = [
            seat for seat in available_seats if seat.seat_label == seat_label
        ]

    if (
        not passenger.needs_accessibility
        and any(not seat.is_accessibility for seat in available_seats)
    ):
        available_seats = [
            seat for seat in available_seats if not seat.is_accessibility
        ]

    if seat_label is not None and passenger.needs_accessibility:
        available_seats = [
            seat for seat in available_seats if seat.is_accessibility
        ]

    if not available_seats:
        raise SeatUnavailableError(f"No available seats on bus {bus.id}")

    total_rows = bus.layout.total_rows if bus.layout else SeatAllocator.DEFAULT_ROWS
    seats_per_row = (
        bus.layout.seats_per_row if bus.layout else SeatAllocator.DEFAULT_COLS
    )
    candidates: list[tuple[Seat, float, dict[str, float], list[str]]] = []
    for seat in available_seats:
        breakdown = score_seat_breakdown(
            candidate_seat=seat,
            passenger=passenger,
            existing_reservations=[],
            total_rows=total_rows,
            seats_per_row=seats_per_row,
        )
        if breakdown.total > -100:
            candidates.append(
                (
                    seat,
                    breakdown.total,
                    breakdown.components,
                    breakdown.reasons,
                )
            )

    if not candidates:
        raise SeatUnavailableError(f"No available seats on bus {bus.id}")

    candidates.sort(key=lambda item: (-item[1], item[0].row_number, item[0].col_number))
    winner, score, components, reasons = candidates[0]
    service_day = (
        travel_date.date() if isinstance(travel_date, datetime) else travel_date
    )
    return {
        "seat_id": str(winner.id),
        "seat_label": winner.seat_label,
        "seat_type": winner.seat_type.value,
        "side": winner.side,
        "row_number": winner.row_number,
        "is_accessibility": winner.is_accessibility,
        "affinity_score": score,
        "score_breakdown": components,
        "assignment_reasons": reasons,
        "boarding_window": _boarding_window(
            winner.row_number,
            departure_datetime=departure_datetime,
            service_day=service_day,
        ),
    }
