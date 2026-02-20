"""Fix trip start_date to use dispatch_date instead of created_at

Revision ID: c2d3e4f5g6h8
Revises: b2c3d4e5f6g7
Create Date: 2026-02-16 14:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'c2d3e4f5g6h8'
down_revision = 'b2c3d4e5f6g7'
branch_labels = None
depends_on = None


def upgrade():
    # Set start_date = dispatch_date for all trips that have been dispatched.
    # Previously start_date was auto-set to created_at on trip creation;
    # it should reflect the actual dispatch date instead.
    op.execute(
        "UPDATE trip SET start_date = dispatch_date WHERE dispatch_date IS NOT NULL"
    )


def downgrade():
    # Revert start_date back to created_at
    op.execute(
        "UPDATE trip SET start_date = created_at WHERE dispatch_date IS NOT NULL"
    )
