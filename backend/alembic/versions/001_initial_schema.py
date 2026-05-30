"""Initial schema — all core IQueue tables.

Revision ID: 001
Revises: None
Create Date: 2026-05-30

Creates: tenants, bus_routes, buses, passengers, bookings, surge_forecasts
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables for the initial IQueue schema."""

    # --- Tenants ---
    op.create_table(
        "tenants",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            index=True,
        ),
        sa.Column("name", sa.String(255), nullable=False, index=True),
        sa.Column(
            "country",
            sa.String(2),
            nullable=False,
            comment="ISO 3166-1 alpha-2 country code",
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

    # --- Bus Routes ---
    op.create_table(
        "bus_routes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            index=True,
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("origin", sa.String(100), nullable=False, index=True),
        sa.Column("destination", sa.String(100), nullable=False, index=True),
        sa.Column("distance_km", sa.Float, nullable=False),
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

    # --- Buses ---
    op.create_table(
        "buses",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            index=True,
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "route_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bus_routes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("capacity", sa.Integer, nullable=False, server_default="50"),
        sa.Column("plate_number", sa.String(20), nullable=False, unique=True),
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

    # --- Passengers ---
    op.create_table(
        "passengers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            index=True,
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False, index=True),
        sa.Column(
            "language_pref",
            sa.String(10),
            nullable=False,
            server_default="en",
            comment="ISO 639-1 language code",
        ),
        sa.Column(
            "travel_habits",
            sa.String(50),
            nullable=True,
            comment="e.g. business, leisure, student, family",
        ),
        sa.Column(
            "lifestyle_interests",
            sa.Text,
            nullable=True,
            comment="Comma-separated interests for affinity matching",
        ),
        sa.Column(
            "accessibility_needs",
            sa.Boolean,
            nullable=False,
            server_default="false",
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

    # --- Booking Status Enum ---
    booking_status_enum = sa.Enum(
        "pending",
        "confirmed",
        "boarded",
        "missed",
        "cancelled",
        name="booking_status",
    )
    booking_status_enum.create(op.get_bind(), checkfirst=True)

    # --- Bookings ---
    op.create_table(
        "bookings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            index=True,
        ),
        sa.Column(
            "passenger_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("passengers.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "bus_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("buses.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "seat_number",
            sa.String(10),
            nullable=False,
            comment="e.g. '12A', '3B'",
        ),
        sa.Column(
            "boarding_window_start",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "boarding_window_end",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "status",
            booking_status_enum,
            nullable=False,
            server_default="confirmed",
        ),
        sa.Column(
            "qr_token",
            sa.Text,
            nullable=True,
            comment="HMAC-SHA256 signed boarding pass token",
        ),
        sa.Column(
            "departure_date",
            sa.DateTime(timezone=True),
            nullable=False,
            index=True,
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

    # --- Surge Forecasts ---
    op.create_table(
        "surge_forecasts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            index=True,
        ),
        sa.Column(
            "route_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bus_routes.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "forecast_date",
            sa.Date,
            nullable=False,
            index=True,
            comment="The date being forecasted",
        ),
        sa.Column(
            "surge_probability",
            sa.Float,
            nullable=False,
            comment="Probability (0-1) of a surge event on this date",
        ),
        sa.Column(
            "predicted_volume",
            sa.Integer,
            nullable=False,
            comment="Predicted passenger count",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # --- Indexes for common query patterns ---
    op.create_index(
        "ix_bookings_bus_departure",
        "bookings",
        ["bus_id", "departure_date"],
    )
    op.create_index(
        "ix_surge_forecasts_route_date",
        "surge_forecasts",
        ["route_id", "forecast_date"],
        unique=True,
    )


def downgrade() -> None:
    """Drop all tables in reverse dependency order."""
    op.drop_index("ix_surge_forecasts_route_date", table_name="surge_forecasts")
    op.drop_index("ix_bookings_bus_departure", table_name="bookings")
    op.drop_table("surge_forecasts")
    op.drop_table("bookings")
    op.execute("DROP TYPE IF EXISTS booking_status")
    op.drop_table("passengers")
    op.drop_table("buses")
    op.drop_table("bus_routes")
    op.drop_table("tenants")
