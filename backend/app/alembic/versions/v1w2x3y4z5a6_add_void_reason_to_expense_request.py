"""add void_reason to expense_request

Revision ID: v1w2x3y4z5a6
Revises: u0v1w2x3y4z5
Create Date: 2026-03-04

Separates the void cancellation reason from manager_comment so that a
manager's approval remark is preserved even when the expense is later voided.
"""

from alembic import op
import sqlalchemy as sa

revision: str = "v1w2x3y4z5a6"
down_revision: str = "u0v1w2x3y4z5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "expense_request",
        sa.Column("void_reason", sa.String(length=500), nullable=True),
    )
    # Migrate existing voided expenses: copy manager_comment → void_reason,
    # then clear manager_comment so it no longer holds the void reason.
    op.execute("""
        UPDATE expense_request
        SET void_reason = manager_comment,
            manager_comment = NULL
        WHERE status = 'voided'
          AND manager_comment IS NOT NULL
    """)


def downgrade() -> None:
    # Restore manager_comment from void_reason for voided expenses
    op.execute("""
        UPDATE expense_request
        SET manager_comment = void_reason
        WHERE status = 'voided'
          AND void_reason IS NOT NULL
    """)
    op.drop_column("expense_request", "void_reason")
