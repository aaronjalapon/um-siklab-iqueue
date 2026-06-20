"""Add forecast learning tables.

Revision ID: 004
Revises: 26e3374dff0b
Create Date: 2026-06-19
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, Sequence[str], None] = "26e3374dff0b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create forecast feedback and outcome tables."""

    forecast_action = sa.Enum(
        "ACCEPTED",
        "MODIFIED",
        "REJECTED",
        name="forecast_action",
    )

    op.create_table(
        "forecast_snapshots",
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("route_id", sa.UUID(), nullable=False),
        sa.Column("forecast_date", sa.Date(), nullable=False),
        sa.Column("predicted_volume", sa.Integer(), nullable=False),
        sa.Column("surge_probability", sa.Float(), nullable=False),
        sa.Column("risk_level", sa.String(length=20), nullable=False),
        sa.Column("recommended_action", sa.String(length=255), nullable=False),
        sa.Column("model_version", sa.String(length=100), nullable=True),
        sa.Column("model_source", sa.String(length=40), nullable=False),
        sa.Column("model_confidence", sa.Float(), nullable=True),
        sa.Column("confidence_lower", sa.Integer(), nullable=True),
        sa.Column("confidence_upper", sa.Integer(), nullable=True),
        sa.Column("input_features", sa.JSON(), nullable=True),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["route_id"], ["bus_routes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_forecast_snapshots_id"), "forecast_snapshots", ["id"])
    op.create_index(op.f("ix_forecast_snapshots_route_id"), "forecast_snapshots", ["route_id"])
    op.create_index(op.f("ix_forecast_snapshots_tenant_id"), "forecast_snapshots", ["tenant_id"])
    op.create_index(
        op.f("ix_forecast_snapshots_forecast_date"),
        "forecast_snapshots",
        ["forecast_date"],
    )

    op.create_table(
        "operator_overrides",
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("route_id", sa.UUID(), nullable=False),
        sa.Column("forecast_snapshot_id", sa.UUID(), nullable=False),
        sa.Column("action_taken", forecast_action, nullable=False),
        sa.Column("override_type", sa.String(length=50), nullable=True),
        sa.Column("override_reason", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("operator_id", sa.String(length=100), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("final_action", sa.String(length=255), nullable=True),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["forecast_snapshot_id"], ["forecast_snapshots.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["route_id"], ["bus_routes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_operator_overrides_id"), "operator_overrides", ["id"])
    op.create_index(op.f("ix_operator_overrides_route_id"), "operator_overrides", ["route_id"])
    op.create_index(op.f("ix_operator_overrides_tenant_id"), "operator_overrides", ["tenant_id"])
    op.create_index(
        op.f("ix_operator_overrides_forecast_snapshot_id"),
        "operator_overrides",
        ["forecast_snapshot_id"],
    )

    op.create_table(
        "operational_outcomes",
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("route_id", sa.UUID(), nullable=False),
        sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("actual_passenger_count", sa.Integer(), nullable=False),
        sa.Column("peak_queue_length", sa.Integer(), nullable=True),
        sa.Column("average_wait_time_minutes", sa.Float(), nullable=True),
        sa.Column("wait_time_p95_minutes", sa.Float(), nullable=True),
        sa.Column("extra_buses_dispatched", sa.Integer(), nullable=False),
        sa.Column("lanes_opened", sa.Integer(), nullable=False),
        sa.Column("missed_boardings", sa.Integer(), nullable=False),
        sa.Column("overcrowding_incident", sa.Boolean(), nullable=False),
        sa.Column("recorded_by", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["route_id"], ["bus_routes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "route_id", "service_date", name="uq_outcome_tenant_route_date"),
    )
    op.create_index(op.f("ix_operational_outcomes_id"), "operational_outcomes", ["id"])
    op.create_index(op.f("ix_operational_outcomes_route_id"), "operational_outcomes", ["route_id"])
    op.create_index(op.f("ix_operational_outcomes_tenant_id"), "operational_outcomes", ["tenant_id"])
    op.create_index(
        op.f("ix_operational_outcomes_service_date"),
        "operational_outcomes",
        ["service_date"],
    )


def downgrade() -> None:
    """Drop forecast feedback and outcome tables."""

    op.drop_index(op.f("ix_operational_outcomes_service_date"), table_name="operational_outcomes")
    op.drop_index(op.f("ix_operational_outcomes_tenant_id"), table_name="operational_outcomes")
    op.drop_index(op.f("ix_operational_outcomes_route_id"), table_name="operational_outcomes")
    op.drop_index(op.f("ix_operational_outcomes_id"), table_name="operational_outcomes")
    op.drop_table("operational_outcomes")
    op.drop_index(op.f("ix_operator_overrides_forecast_snapshot_id"), table_name="operator_overrides")
    op.drop_index(op.f("ix_operator_overrides_tenant_id"), table_name="operator_overrides")
    op.drop_index(op.f("ix_operator_overrides_route_id"), table_name="operator_overrides")
    op.drop_index(op.f("ix_operator_overrides_id"), table_name="operator_overrides")
    op.drop_table("operator_overrides")
    op.drop_index(op.f("ix_forecast_snapshots_forecast_date"), table_name="forecast_snapshots")
    op.drop_index(op.f("ix_forecast_snapshots_tenant_id"), table_name="forecast_snapshots")
    op.drop_index(op.f("ix_forecast_snapshots_route_id"), table_name="forecast_snapshots")
    op.drop_index(op.f("ix_forecast_snapshots_id"), table_name="forecast_snapshots")
    op.drop_table("forecast_snapshots")
    sa.Enum(name="forecast_action").drop(op.get_bind(), checkfirst=True)
