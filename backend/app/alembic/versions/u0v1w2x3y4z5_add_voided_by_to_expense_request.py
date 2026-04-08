"""add voided_by_id and voided_at to expense_request

Revision ID: u0v1w2x3y4z5
Revises: t9u0v1w2x3y4
Create Date: 2026-03-04

Adds two audit fields so the Tracking tab can show who voided an expense
and when, rather than reusing the manager_comment field on the wrong step.
"""

from alembic import op
import sqlalchemy as sa

revision: str = "u0v1w2x3y4z5"
down_revision: str = "t9u0v1w2x3y4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "expense_request",
        sa.Column("voided_by_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
    )
    op.add_column(
        "expense_request",
        sa.Column("voided_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("expense_request", "voided_at")
    op.drop_column("expense_request", "voided_by_id")
