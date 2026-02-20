"""Initial schema: create transcription_sessions table

Revision ID: 0001_initial
Revises:
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "transcription_sessions",
        sa.Column("id", sa.String(36), primary_key=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("transcript", sa.Text, nullable=False, server_default=""),
        sa.Column("transcript_preview", sa.String(200), nullable=False, server_default=""),
        sa.Column("word_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("duration_sec", sa.Float, nullable=False, server_default="0.0"),
    )

    # Index for fast list queries (newest-first)
    op.create_index(
        "ix_transcription_sessions_created_at",
        "transcription_sessions",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_transcription_sessions_created_at", table_name="transcription_sessions")
    op.drop_table("transcription_sessions")
