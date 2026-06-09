"""Bus layout builder — generates seat rows from a layout configuration.

Standard Philippine inter-provincial bus layout (Mindanao):
  14 rows × 4 seats per row (2 left + aisle + 2 right)

  Row 1:  1A (window-L), 1B (aisle-L) | 1C (aisle-R), 1D (window-R)
  Row 2:  2A, 2B | 2C, 2D
  ...
  Row 14: 14A, 14B | 14C, 14D

  Column mapping:
    col 1 = A (window-left)
    col 2 = B (aisle-left)
    col 3 = C (aisle-right)
    col 4 = D (window-right)

  Accessibility seats: rows 1-2 (front, near door)
  Exit-adjacent seats: rows 1 and 14
"""

from __future__ import annotations

import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bus import Bus
from app.models.bus_layout import BusLayout
from app.models.seat import Seat, SeatType

# Column label mapping: 1→A, 2→B, 3→C, 4→D
_COL_LABELS = {1: "A", 2: "B", 3: "C", 4: "D"}
_SIDE_MAP = {1: "left", 2: "left", 3: "right", 4: "right"}
_TYPE_MAP = {1: SeatType.WINDOW, 2: SeatType.AISLE, 3: SeatType.AISLE, 4: SeatType.WINDOW}


def get_default_layout() -> dict:
    """Return the standard 14-row × 4-col Mindanao bus layout config.

    Used as the default when no custom layout_config is provided.
    """
    config: dict[str, dict] = {}
    for row in range(1, 15):
        for col in range(1, 5):
            label = f"{row}{_COL_LABELS[col]}"
            config[label] = {
                "type": _TYPE_MAP[col].value,
                "side": _SIDE_MAP[col],
                "is_near_exit": row in (1, 14),
                "is_accessibility": row <= 2,
            }
    return config


async def generate_seats_for_bus(bus: Bus, session: AsyncSession) -> list[Seat]:
    """Create and bulk-insert all Seat rows for a newly registered Bus.

    Reads layout config from bus.layout.layout_config, falling back to
    the default 14×4 layout. Called once when a Bus record is first created.

    Args:
        bus: The Bus to generate seats for.
        session: An active async database session.

    Returns:
        The list of created Seat objects (not yet committed — caller flushes).
    """
    if bus.layout and bus.layout.layout_config:
        config = bus.layout.layout_config
    else:
        config = get_default_layout()

    seats: list[Seat] = []
    for label, overrides in config.items():
        row_num = get_seat_row(label)
        col_num = get_seat_col(label)
        seat = Seat(
            bus_id=bus.id,
            seat_label=label,
            row_number=row_num,
            col_number=col_num,
            seat_type=SeatType(overrides.get("type", "aisle")),
            is_near_exit=overrides.get("is_near_exit", row_num in (1, 14)),
            is_accessibility=overrides.get("is_accessibility", row_num <= 2),
            side=overrides.get("side", "left" if col_num <= 2 else "right"),
        )
        seats.append(seat)

    session.add_all(seats)
    await session.flush()
    return seats


def get_adjacent_seat_ids(
    seat_label: str, total_rows: int, seats_per_row: int
) -> list[str]:
    """Return seat labels directly adjacent (N/S/E/W, not diagonal).

    Args:
        seat_label: e.g. "3B"
        total_rows: total rows in the bus.
        seats_per_row: seats per row (typically 4).

    Returns:
        List of adjacent seat label strings.
    """
    row = get_seat_row(seat_label)
    col_letter = _extract_col_letter(seat_label)
    col = _COL_LETTER_TO_NUM.get(col_letter, 0)

    adjacent = []
    # Left
    if col > 1:
        adjacent.append(f"{row}{_COL_LABELS[col - 1]}")
    # Right
    if col < seats_per_row:
        adjacent.append(f"{row}{_COL_LABELS[col + 1]}")
    # Front
    if row > 1:
        adjacent.append(f"{row - 1}{col_letter}")
    # Back
    if row < total_rows:
        adjacent.append(f"{row + 1}{col_letter}")

    return adjacent


def get_seat_row(seat_label: str) -> int:
    """Parse the row number from a seat label like '3B' → 3."""
    match = re.match(r"(\d+)", seat_label)
    if not match:
        raise ValueError(f"Invalid seat label: {seat_label}")
    return int(match.group(1))


def get_seat_col(seat_label: str) -> int:
    """Parse the column number from a seat label like '3B' → 2."""
    letter = _extract_col_letter(seat_label)
    return _COL_LETTER_TO_NUM.get(letter, 0)


def _extract_col_letter(seat_label: str) -> str:
    """Extract the trailing letter(s) from a seat label like '12AB' → 'AB'.

    For standard labels like '3B', returns 'B'.
    """
    match = re.search(r"[A-Z]+$", seat_label)
    if not match:
        raise ValueError(f"Invalid seat label (no column letter): {seat_label}")
    return match.group(0)


_COL_LETTER_TO_NUM = {"A": 1, "B": 2, "C": 3, "D": 4}
