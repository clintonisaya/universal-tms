"""add return_remarks to trip

Revision ID: m2n3o4p5q6r7
Revises: l1m2n3o4p5q6
Create Date: 2026-02-28

Add a separate remarks column for the return leg so the go-leg remark
can be frozen at offloading while the return leg has its own independent
free-text field.
"""

from alembic import op
import sqlalchemy as sa


revision = "m2n3o4p5q6r7"
down_revision = "l1m2n3o4p5q6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("trip", sa.Column("return_remarks", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("trip", "return_remarks")
