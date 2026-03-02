"""add pods_confirmed_date to trip

Revision ID: r7s8t9u0v1w2
Revises: q6r7s8t9u0v1
Create Date: 2026-02-28

New column:
  trip.pods_confirmed_date — DateTime with timezone, nullable
  Auto-advances trip to Completed when filled at Waiting for PODs status.
"""

from alembic import op
import sqlalchemy as sa


revision = "r7s8t9u0v1w2"
down_revision = "q6r7s8t9u0v1"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "trip",
        sa.Column("pods_confirmed_date", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column("trip", "pods_confirmed_date")
