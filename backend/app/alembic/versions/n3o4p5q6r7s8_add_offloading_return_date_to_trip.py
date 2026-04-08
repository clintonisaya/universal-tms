"""add offloading_return_date to trip

Revision ID: n3o4p5q6r7s8
Revises: m2n3o4p5q6r7
Create Date: 2026-02-28

Separate the return-leg offloading event (cargo delivered at client
destination) from arrival_return_date (truck back at home yard).
Transit Days (return) = offloading_return_date - loading_return_end_date
Total Days            = arrival_return_date - dispatch_date
"""

from alembic import op
import sqlalchemy as sa


revision = "n3o4p5q6r7s8"
down_revision = "m2n3o4p5q6r7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("trip", sa.Column("offloading_return_date", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("trip", "offloading_return_date")
