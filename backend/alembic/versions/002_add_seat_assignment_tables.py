"""Add seat assignment tables — bus_layouts, seats, seat_reservations.

Revision ID: 002
Revises: 001
Create Date: 2026-06-09

Creates: bus_layouts, seats, seat_reservations
Modifies: buses (add layout_id FK)
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create seat assignment tables and add layout_id to buses."""

    # --- Enum types ---
    seat_type_enum = sa.Enum("WINDOW", "AISLE", "MIDDLE", name="seat_type")
    seat_type_enum.create(op.get_bind(), checkfirst=True)

    seat_status_enum = sa.Enum(
        "AVAILABLE", "OCCUPIED", "RESERVED", "BLOCKED", name="seat_status"
    )
    seat_status_enum.create(op.get_bind(), checkfirst=True)

    # --- Bus Layouts ---
    op.create_table(
        "bus_layouts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            index=True,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("total_rows", sa.Integer(), nullable=False),
        sa.Column("seats_per_row", sa.Integer(), nullable=False),
        sa.Column("aisle_after_col", sa.Integer(), server_default="2"),
        sa.Column("total_capacity", sa.Integer(), nullable=False),
        sa.Column("layout_config", postgresql.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )

    # --- Add layout_id to buses ---
    op.add_column(
        "buses",
        sa.Column(
            "layout_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bus_layouts.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )

    # --- Seats ---
    op.create_table(
        "seats",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            index=True,
        ),
        sa.Column(
            "bus_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("buses.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("seat_label", sa.String(10), nullable=False, comment="e.g. '3B'"),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("col_number", sa.Integer(), nullable=False),
        sa.Column(
            "seat_type",
            seat_type_enum,
            nullable=False,
        ),
        sa.Column("is_near_exit", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("is_accessibility", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("side", sa.String(10), nullable=False),
        sa.Column(
            "status",
            seat_status_enum,
            nullable=False,
            server_default="AVAILABLE",
        ),
        sa.Column("affinity_score", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )

    # --- Seat Reservations ---
    op.create_table(
        "seat_reservations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            index=True,
        ),
        sa.Column(
            "seat_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("seats.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column(
            "booking_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bookings.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("passenger_name", sa.String(255), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("language_preference", sa.String(10), nullable=True),
        sa.Column(
            "travel_habit",
            sa.String(50),
            nullable=True,
            comment="business, leisure, student, family",
        ),
        sa.Column(
            "lifestyle_interest",
            sa.String(255),
            nullable=True,
            comment="Comma-separated interests",
        ),
        sa.Column("needs_accessibility", sa.Boolean(), server_default=sa.text("false")),
        sa.Column(
            "preferred_seat_type",
            sa.String(10),
            nullable=True,
            comment="window, aisle, or None",
        ),
        sa.Column(
            "preferred_side",
            sa.String(10),
            nullable=True,
            comment="left, right, or None",
        ),
        sa.Column("computed_affinity_score", sa.Float(), server_default="0.0"),
        sa.Column(
            "boarding_window",
            sa.String(20),
            nullable=True,
            comment="HH:MM-HH:MM format",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove seat assignment tables and layout_id from buses."""
    op.drop_table("seat_reservations")
    op.drop_table("seats")
    op.drop_column("buses", "layout_id")
    op.drop_table("bus_layouts")

    # Drop enum types
    sa.Enum(name="seat_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="seat_type").drop(op.get_bind(), checkfirst=True)
