"""Allow nullable phone numbers for passengers (e.g. children in group bookings).

Revision ID: 006
Revises: 005
Create Date: 2026-09-13
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006"
down_revision: Union[str, Sequence[str], None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("passengers", "phone", nullable=True)


def downgrade() -> None:
    op.alter_column("passengers", "phone", nullable=False)
