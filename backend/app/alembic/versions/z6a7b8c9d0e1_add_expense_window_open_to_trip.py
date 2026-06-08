"""add expense_window_open to trip table

Revision ID: z6a7b8c9d0e1
Revises: z5a6b7c8d9e0
Create Date: 2026-05-21

Add expense_window_open boolean column to trip table to allow
manual opening of expense entry on completed/cancelled trips.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'z6a7b8c9d0e1'
down_revision = 'a6b7c8d9e0f1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'trip',
        sa.Column('expense_window_open', sa.Boolean(), nullable=True)
    )
    # Set default value for existing rows
    op.execute("UPDATE trip SET expense_window_open = false")
    # Make non-nullable after populating
    op.alter_column('trip', 'expense_window_open', existing_type=sa.Boolean(), nullable=False)


def downgrade():
    op.drop_column('trip', 'expense_window_open')
