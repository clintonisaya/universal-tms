"""drop side-b doc fields from border crossing

Revision ID: h7i8j9k0l1m2
Revises: g6h7i8j9k0l1
Create Date: 2026-02-20

Remove documents_submitted_side_b_at and documents_cleared_side_b_at
from tripbordercrossing table — the actual border flow only needs
5 timestamps: arrived_side_a, docs_submitted_a, docs_cleared_a,
arrived_side_b (= Crossing Side A), departed_border.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h7i8j9k0l1m2'
down_revision = 'g6h7i8j9k0l1'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column('trip_border_crossing', 'documents_submitted_side_b_at')
    op.drop_column('trip_border_crossing', 'documents_cleared_side_b_at')


def downgrade():
    op.add_column(
        'trip_border_crossing',
        sa.Column('documents_submitted_side_b_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'trip_border_crossing',
        sa.Column('documents_cleared_side_b_at', sa.DateTime(timezone=True), nullable=True)
    )
