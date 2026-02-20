"""add_trip_tracking_date_fields_and_new_statuses

Revision ID: a9f1b2c3d4e5
Revises: 8ca6b658a5c2
Create Date: 2026-02-10 23:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'a9f1b2c3d4e5'
down_revision = '8ca6b658a5c2'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Convert trip status column from native PostgreSQL enum to VARCHAR
    #    (consistent with truck and trailer status columns which are already VARCHAR).
    #    This ensures new status values like "Waiting" and "Dispatch" work without enum constraints.
    #    If the column is already VARCHAR, this is a safe no-op via the exception handler.
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE trip ALTER COLUMN status TYPE VARCHAR(50) USING status::TEXT;
        EXCEPTION
            WHEN others THEN NULL;
        END $$;
    """)

    # Update existing trip status values from lowercase enum to display values
    # (only needed if they were stored as lowercase PostgreSQL enum values)
    op.execute("UPDATE trip SET status = 'Loading' WHERE status = 'loading'")
    op.execute("UPDATE trip SET status = 'In Transit' WHERE status = 'in_transit'")
    op.execute("UPDATE trip SET status = 'At Border' WHERE status = 'at_border'")
    op.execute("UPDATE trip SET status = 'Offloaded' WHERE status = 'offloaded'")
    op.execute("UPDATE trip SET status = 'Returned' WHERE status = 'returned'")
    op.execute("UPDATE trip SET status = 'Waiting for PODs' WHERE status = 'waiting_for_pods'")
    op.execute("UPDATE trip SET status = 'Completed' WHERE status = 'completed'")
    op.execute("UPDATE trip SET status = 'Cancelled' WHERE status = 'cancelled'")

    # Drop the old tripstatus enum type if it exists (no longer needed)
    op.execute("DROP TYPE IF EXISTS tripstatus")

    # 2. Add new tracking date columns to trip table
    op.add_column('trip', sa.Column('dispatch_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('trip', sa.Column('arrival_loading_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('trip', sa.Column('loading_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('trip', sa.Column('arrival_offloading_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('trip', sa.Column('offloading_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('trip', sa.Column('arrival_return_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('trip', sa.Column('trip_duration_days', sa.Integer(), nullable=True))


def downgrade():
    # Remove the new columns
    op.drop_column('trip', 'trip_duration_days')
    op.drop_column('trip', 'arrival_return_date')
    op.drop_column('trip', 'offloading_date')
    op.drop_column('trip', 'arrival_offloading_date')
    op.drop_column('trip', 'loading_date')
    op.drop_column('trip', 'arrival_loading_date')
    op.drop_column('trip', 'dispatch_date')
    # Note: Column type and enum restoration would need manual intervention
