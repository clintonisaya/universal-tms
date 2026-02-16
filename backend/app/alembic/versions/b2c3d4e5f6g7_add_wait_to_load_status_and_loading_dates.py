"""Add Wait to Load status and split loading dates

Revision ID: b2c3d4e5f6g7
Revises: c1a2b3d4e5f6
Create Date: 2026-02-16 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6g7'
down_revision = 'c1a2b3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Convert trip.status from PostgreSQL enum to VARCHAR
    #    The column may be enum or varchar depending on migration history.
    op.execute(
        "ALTER TABLE trip ALTER COLUMN status TYPE VARCHAR(50) USING status::TEXT"
    )
    op.execute("DROP TYPE IF EXISTS tripstatus")

    # Also convert truck.status and trailer.status if they are still enums
    op.execute(
        "ALTER TABLE truck ALTER COLUMN status TYPE VARCHAR(50) USING status::TEXT"
    )
    op.execute("DROP TYPE IF EXISTS truckstatus")

    op.execute(
        "ALTER TABLE trailer ALTER COLUMN status TYPE VARCHAR(50) USING status::TEXT"
    )
    op.execute("DROP TYPE IF EXISTS trailerstatus")

    # 2. Rename loading_date -> loading_end_date
    op.alter_column('trip', 'loading_date', new_column_name='loading_end_date')

    # 3. Add loading_start_date column
    op.add_column('trip', sa.Column('loading_start_date', sa.DateTime(timezone=True), nullable=True))

    # 4. Data migration: Move trips currently in "Loading" to "Wait to Load"
    #    - All data (arrival_loading_date, etc.) is preserved — no deletions
    #    - Trips go back to "Wait to Load" so they can re-enter Loading with
    #      the new start_date / end_date fields
    #    - Also sync truck and trailer statuses for those trips
    op.execute("""
        UPDATE truck SET status = 'Wait to Load'
        WHERE id IN (
            SELECT truck_id FROM trip WHERE status = 'Loading'
        )
    """)
    op.execute("""
        UPDATE trailer SET status = 'Wait to Load'
        WHERE id IN (
            SELECT trailer_id FROM trip WHERE status = 'Loading'
        )
    """)
    op.execute("UPDATE trip SET status = 'Wait to Load' WHERE status = 'Loading'")


def downgrade():
    # Remove loading_start_date
    op.drop_column('trip', 'loading_start_date')

    # Rename loading_end_date back to loading_date
    op.alter_column('trip', 'loading_end_date', new_column_name='loading_date')
