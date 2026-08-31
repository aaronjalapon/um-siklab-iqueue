"""Add nullable group identifier to bookings.

Revision ID: 005
Revises: 004
Create Date: 2026-08-31
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, Sequence[str], None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("bookings", sa.Column("group_id", sa.UUID(), nullable=True))
    op.create_index(op.f("ix_bookings_group_id"), "bookings", ["group_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_bookings_group_id"), table_name="bookings")
    op.drop_column("bookings", "group_id")
