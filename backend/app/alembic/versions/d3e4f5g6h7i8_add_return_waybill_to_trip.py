"""Add return waybill support to trip (Story 2.25)

Adds:
- return_waybill_id: nullable FK to waybill.id (the return leg commercial waybill)
- arrival_loading_return_date: when truck arrives at return loading point
- loading_return_start_date: when return cargo loading starts
- loading_return_end_date: when return cargo loading ends

Note: TripStatus enum column is already VARCHAR(50) (converted in b2c3d4e5f6g7).
New return-leg status string values are handled purely at the Python/ORM layer.
No DDL enum changes required.

Revision ID: d3e4f5g6h7i8
Revises: c2d3e4f5g6h8
Create Date: 2026-02-18 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd3e4f5g6h7i8'
down_revision = 'c2d3e4f5g6h8'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add return_waybill_id FK (nullable — no return waybill by default)
    op.add_column(
        'trip',
        sa.Column('return_waybill_id', sa.UUID(), nullable=True)
    )
    op.create_foreign_key(
        'fk_trip_return_waybill_id_waybill',
        'trip', 'waybill',
        ['return_waybill_id'], ['id']
    )

    # 2. Add return leg tracking date fields
    op.add_column(
        'trip',
        sa.Column('arrival_loading_return_date', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'trip',
        sa.Column('loading_return_start_date', sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        'trip',
        sa.Column('loading_return_end_date', sa.DateTime(timezone=True), nullable=True)
    )


def downgrade():
    op.drop_constraint('fk_trip_return_waybill_id_waybill', 'trip', type_='foreignkey')
    op.drop_column('trip', 'return_waybill_id')
    op.drop_column('trip', 'arrival_loading_return_date')
    op.drop_column('trip', 'loading_return_start_date')
    op.drop_column('trip', 'loading_return_end_date')
