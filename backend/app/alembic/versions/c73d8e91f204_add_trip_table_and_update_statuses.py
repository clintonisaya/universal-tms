"""add_trip_table_and_update_statuses

Revision ID: c73d8e91f204
Revises: b62df7a91c03
Create Date: 2026-01-26 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'c73d8e91f204'
down_revision = 'b62df7a91c03'
branch_labels = None
depends_on = None


def upgrade():
    # Create new enum types for updated statuses
    # TruckStatus - add new values
    op.execute("ALTER TYPE truckstatus ADD VALUE IF NOT EXISTS 'loading'")
    op.execute("ALTER TYPE truckstatus ADD VALUE IF NOT EXISTS 'at_border'")
    op.execute("ALTER TYPE truckstatus ADD VALUE IF NOT EXISTS 'offloaded'")
    op.execute("ALTER TYPE truckstatus ADD VALUE IF NOT EXISTS 'returned'")
    op.execute("ALTER TYPE truckstatus ADD VALUE IF NOT EXISTS 'waiting_for_pods'")

    # TrailerStatus - add new values
    op.execute("ALTER TYPE trailerstatus ADD VALUE IF NOT EXISTS 'loading'")
    op.execute("ALTER TYPE trailerstatus ADD VALUE IF NOT EXISTS 'at_border'")
    op.execute("ALTER TYPE trailerstatus ADD VALUE IF NOT EXISTS 'offloaded'")
    op.execute("ALTER TYPE trailerstatus ADD VALUE IF NOT EXISTS 'returned'")
    op.execute("ALTER TYPE trailerstatus ADD VALUE IF NOT EXISTS 'waiting_for_pods'")

    # DriverStatus - add 'assigned' value
    op.execute("ALTER TYPE driverstatus ADD VALUE IF NOT EXISTS 'assigned'")

    # Create TripStatus enum
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE tripstatus AS ENUM (
                'loading', 'in_transit', 'at_border', 'offloaded',
                'returned', 'waiting_for_pods', 'completed', 'cancelled'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create trip table - use existing enum type, don't recreate
    tripstatus_enum = sa.Enum('loading', 'in_transit', 'at_border', 'offloaded', 'returned', 'waiting_for_pods', 'completed', 'cancelled', name='tripstatus', create_type=False)
    op.create_table('trip',
        sa.Column('truck_id', sa.Uuid(), nullable=False),
        sa.Column('trailer_id', sa.Uuid(), nullable=False),
        sa.Column('driver_id', sa.Uuid(), nullable=False),
        sa.Column('route_name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('status', tripstatus_enum, nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('pod_documents', sa.JSON(), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['driver_id'], ['driver.id'], ),
        sa.ForeignKeyConstraint(['trailer_id'], ['trailer.id'], ),
        sa.ForeignKeyConstraint(['truck_id'], ['truck.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_trip_truck_id'), 'trip', ['truck_id'], unique=False)
    op.create_index(op.f('ix_trip_trailer_id'), 'trip', ['trailer_id'], unique=False)
    op.create_index(op.f('ix_trip_driver_id'), 'trip', ['driver_id'], unique=False)
    op.create_index(op.f('ix_trip_status'), 'trip', ['status'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_trip_status'), table_name='trip')
    op.drop_index(op.f('ix_trip_driver_id'), table_name='trip')
    op.drop_index(op.f('ix_trip_trailer_id'), table_name='trip')
    op.drop_index(op.f('ix_trip_truck_id'), table_name='trip')
    op.drop_table('trip')
    op.execute("DROP TYPE IF EXISTS tripstatus")
    # Note: Cannot easily remove values from existing enums in PostgreSQL
    # The added enum values for truck/trailer/driver status will remain
