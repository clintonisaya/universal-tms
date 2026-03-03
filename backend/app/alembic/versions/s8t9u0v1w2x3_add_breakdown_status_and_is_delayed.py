"""add breakdown status and is_delayed to trip

Revision ID: s8t9u0v1w2x3
Revises: r7s8t9u0v1w2
Create Date: 2026-03-03

Changes:
  - Add 'Breakdown' value to tripstatus enum (recoverable standalone status)
  - trip.is_delayed — Boolean, NOT NULL, default false (modifier flag)
"""

from alembic import op
import sqlalchemy as sa


revision = "s8t9u0v1w2x3"
down_revision = "r7s8t9u0v1w2"
branch_labels = None
depends_on = None


def upgrade():
    # Enum values cannot be added inside a transaction in PostgreSQL
    op.execute("COMMIT")
    op.execute("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Breakdown'")
    op.execute("BEGIN")

    op.add_column(
        "trip",
        sa.Column("is_delayed", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade():
    op.drop_column("trip", "is_delayed")
    # Note: PostgreSQL does not support removing enum values — 'Breakdown' stays in the type
