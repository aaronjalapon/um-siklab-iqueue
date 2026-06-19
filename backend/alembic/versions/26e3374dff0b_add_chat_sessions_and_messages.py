"""add_chat_sessions_and_messages

Revision ID: 26e3374dff0b
Revises: 003
Create Date: 2026-06-09 13:46:40.077330

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '26e3374dff0b'
down_revision: Union[str, Sequence[str], None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create chat_sessions and chat_messages tables."""
    op.create_table('chat_sessions',
    sa.Column('passenger_id', sa.UUID(), nullable=True),
    sa.Column('language', sa.String(length=10), nullable=False,
              comment='ISO 639-1 language code detected at session start'),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False,
              comment='Session expiry — default 24h from creation'),
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['passenger_id'], ['passengers.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chat_sessions_id'), 'chat_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_chat_sessions_passenger_id'), 'chat_sessions', ['passenger_id'], unique=False)

    op.create_table('chat_messages',
    sa.Column('session_id', sa.UUID(), nullable=False),
    sa.Column('role', sa.String(length=10), nullable=False, comment='user | bot | system'),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('intent', sa.String(length=50), nullable=True,
              comment='Classified intent for user messages'),
    sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
              comment='Extracted entities, flow state, degradation flags'),
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.ForeignKeyConstraint(['session_id'], ['chat_sessions.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chat_messages_id'), 'chat_messages', ['id'], unique=False)
    op.create_index(op.f('ix_chat_messages_session_id'), 'chat_messages', ['session_id'], unique=False)


def downgrade() -> None:
    """Drop chat_messages and chat_sessions tables."""
    op.drop_index(op.f('ix_chat_messages_session_id'), table_name='chat_messages')
    op.drop_index(op.f('ix_chat_messages_id'), table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_index(op.f('ix_chat_sessions_passenger_id'), table_name='chat_sessions')
    op.drop_index(op.f('ix_chat_sessions_id'), table_name='chat_sessions')
    op.drop_table('chat_sessions')
