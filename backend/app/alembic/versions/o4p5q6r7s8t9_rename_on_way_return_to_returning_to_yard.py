"""rename On Way Return to Returning to Yard in tripstatus enum

Revision ID: o4p5q6r7s8t9
Revises: n3o4p5q6r7s8
Create Date: 2026-02-28

PostgreSQL does not support renaming enum values directly.
Strategy: add the new value, migrate existing rows, leave old value unused.
"""

from alembic import op


revision = "o4p5q6r7s8t9"
down_revision = "n3o4p5q6r7s8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new enum value
    op.execute("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Returning to Yard'")
    # Migrate any existing rows that used the old value
    op.execute("UPDATE trip SET status = 'Returning to Yard' WHERE status = 'On Way Return'")


def downgrade() -> None:
    # Revert data (enum value itself cannot be removed in PostgreSQL)
    op.execute("UPDATE trip SET status = 'On Way Return' WHERE status = 'Returning to Yard'")
