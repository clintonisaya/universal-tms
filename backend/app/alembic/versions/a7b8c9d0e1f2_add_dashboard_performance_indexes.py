"""add dashboard performance indexes — trip and expense status+created_at composites

Revision ID: a7b8c9d0e1f2
Revises: z6a7b8c9d0e1
Create Date: 2026-06-11

Optimises the heavy aggregate queries used by:
- GET /dashboard/stats (status counts, profit trend, approval queues)
- GET /reports/trip-profitability (expense aggregation, status filters)
- GET /tasks/my-tasks (role-based status filtering)

The composite (status, created_at) index lets PostgreSQL satisfy
WHERE status = ... ORDER BY created_at DESC without a sequential scan.
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "a7b8c9d0e1f2"
down_revision = "z6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_trip_status_created_at",
        "trip",
        ["status", "created_at"],
    )
    op.create_index(
        "ix_expense_request_status_created_at",
        "expense_request",
        ["status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_expense_request_status_created_at", table_name="expense_request")
    op.drop_index("ix_trip_status_created_at", table_name="trip")
