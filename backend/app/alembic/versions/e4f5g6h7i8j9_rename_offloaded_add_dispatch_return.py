"""rename offloaded to offloading, add dispatch_return_date, add new return statuses

Revision ID: e4f5g6h7i8j9
Revises: d3e4f5g6h7i8
Create Date: 2026-02-18

Changes:
- Data migration: UPDATE trip SET status = 'Offloading' WHERE status = 'Offloaded'
- Add dispatch_return_date column (TIMESTAMPTZ, nullable)
- No enum DDL changes needed — status column is already VARCHAR(50)
"""
from alembic import op
import sqlalchemy as sa

revision = 'e4f5g6h7i8j9'
down_revision = 'd3e4f5g6h7i8'
branch_labels = None
depends_on = None


def upgrade():
    # Rename existing status value in data
    op.execute("UPDATE trip SET status = 'Offloading' WHERE status = 'Offloaded'")

    # Add dispatch_return_date column
    op.add_column(
        'trip',
        sa.Column('dispatch_return_date', sa.DateTime(timezone=True), nullable=True)
    )


def downgrade():
    op.drop_column('trip', 'dispatch_return_date')
    op.execute("UPDATE trip SET status = 'Offloaded' WHERE status = 'Offloading'")
