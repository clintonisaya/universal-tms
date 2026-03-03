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
    # PostgreSQL 12+ supports ALTER TYPE ... ADD VALUE inside a transaction.
    # Use a DO block with IF EXISTS guard, consistent with all other migrations.
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tripstatus') THEN
                ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Breakdown';
            END IF;
        END $$;
    """)

    op.add_column(
        "trip",
        sa.Column("is_delayed", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade():
    op.drop_column("trip", "is_delayed")
    # Note: PostgreSQL does not support removing enum values — 'Breakdown' stays in the type
