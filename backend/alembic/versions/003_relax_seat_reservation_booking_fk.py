"""Relax seat_reservations.booking_id FK — allow NULL, drop constraint.

Revision ID: 003
Revises: 002
Create Date: 2026-06-09

The seat is assigned before the booking record is persisted, so the FK
from seat_reservations.booking_id to bookings.id must be relaxed.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop FK constraint on booking_id, allow NULL."""
    op.drop_constraint(
        "seat_reservations_booking_id_fkey",
        "seat_reservations",
        type_="foreignkey",
    )
    op.alter_column(
        "seat_reservations",
        "booking_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
        existing_comment="FK to bookings.id — nullable because seat may be assigned before booking is created",
    )


def downgrade() -> None:
    """Restore FK constraint (may fail if orphan booking_ids exist)."""
    op.alter_column(
        "seat_reservations",
        "booking_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.create_foreign_key(
        "seat_reservations_booking_id_fkey",
        "seat_reservations",
        "bookings",
        ["booking_id"],
        ["id"],
        ondelete="CASCADE",
    )
