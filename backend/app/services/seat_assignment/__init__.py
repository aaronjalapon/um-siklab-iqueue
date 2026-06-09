"""Seat assignment engine — layout builder, scorer, and allocator."""

from app.services.seat_assignment.bus_layout import (
    generate_seats_for_bus,
    get_adjacent_seat_ids,
    get_default_layout,
    get_seat_col,
    get_seat_row,
)
from app.services.seat_assignment.engine import (
    BusNotFoundError,
    SeatAllocator,
    SeatUnavailableError,
)
from app.services.seat_assignment.scorer import SCORE_WEIGHTS, score_seat

__all__ = [
    "SeatAllocator",
    "SeatUnavailableError",
    "BusNotFoundError",
    "generate_seats_for_bus",
    "get_default_layout",
    "get_seat_row",
    "get_seat_col",
    "get_adjacent_seat_ids",
    "SCORE_WEIGHTS",
    "score_seat",
]
