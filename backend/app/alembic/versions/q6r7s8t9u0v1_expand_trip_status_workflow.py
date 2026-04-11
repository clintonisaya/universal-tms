"""expand trip status workflow: renames + new statuses + arrival_destination_return_date column

Revision ID: q6r7s8t9u0v1
Revises: p5q6r7s8t9u0
Create Date: 2026-02-28

Renames (3):
  "Waiting for Loading"         → "Arrived at Loading Point"
  "Waiting for Loading (Return)"→ "Arrived at Loading Point (Return)"
  "Returning to Yard"           → "Returning Empty"

New AUTO statuses (3):
  "Loaded"           — auto when loading_end_date set at Loading
  "Loaded (Return)"  — auto when loading_return_end_date set at Loading (Return)
  "Offloaded (Return)" — auto when offloading_return_date set at Offloading (Return)

New MANUAL statuses (2):
  "Arrived at Destination"        — goes to Offloading
  "Arrived at Destination (Return)" — goes to Offloading (Return)

New column:
  trip.arrival_destination_return_date — DateTime with timezone, nullable
"""

from alembic import op
import sqlalchemy as sa


revision = "q6r7s8t9u0v1"
down_revision = "p5q6r7s8t9u0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Add new enum values to tripstatus ────────────────────────────────
    # Guard: tripstatus enum was dropped in b2c3d4e5f6g7; trip.status is VARCHAR.
    # Only ALTER the enum if it still exists (legacy DBs that skipped that migration).
    #
    # IMPORTANT: ALTER TYPE ... ADD VALUE must be committed before the new value
    # can be used in queries. We use autocommit_block() to commit the enum
    # additions immediately so subsequent UPDATE statements can reference them.
    with op.get_context().autocommit_block():
        op.execute("""
            DO $$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tripstatus') THEN
                    ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Arrived at Loading Point';
                    ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Arrived at Loading Point (Return)';
                    ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Returning Empty';
                    ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Loaded';
                    ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Loaded (Return)';
                    ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Offloaded (Return)';
                    ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Arrived at Destination';
                    ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Arrived at Destination (Return)';
                END IF;
            END $$;
        """)

    # ── 2. Migrate existing trip.status rows (renames) ───────────────────────
    op.execute("UPDATE trip SET status = 'Arrived at Loading Point'         WHERE status = 'Waiting for Loading'")
    op.execute("UPDATE trip SET status = 'Arrived at Loading Point (Return)' WHERE status = 'Waiting for Loading (Return)'")
    op.execute("UPDATE trip SET status = 'Returning Empty'                   WHERE status = 'Returning to Yard'")

    # ── 3. Migrate truck.status and trailer.status (VARCHAR renames) ─────────
    op.execute("UPDATE truck SET status = 'Arrived at Loading Point' WHERE status = 'Waiting for Loading'")
    op.execute("UPDATE truck SET status = 'Returning Empty'          WHERE status = 'Returning to Yard'")

    op.execute("UPDATE trailer SET status = 'Arrived at Loading Point' WHERE status = 'Waiting for Loading'")
    op.execute("UPDATE trailer SET status = 'Returning Empty'          WHERE status = 'Returning to Yard'")

    # ── 4. Add new column trip.arrival_destination_return_date ───────────────
    op.add_column(
        "trip",
        sa.Column(
            "arrival_destination_return_date",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    # Remove the new column
    op.drop_column("trip", "arrival_destination_return_date")

    # Revert trip.status renames (enum values cannot be removed from PostgreSQL)
    op.execute("UPDATE trip SET status = 'Waiting for Loading'          WHERE status = 'Arrived at Loading Point'")
    op.execute("UPDATE trip SET status = 'Waiting for Loading (Return)' WHERE status = 'Arrived at Loading Point (Return)'")
    op.execute("UPDATE trip SET status = 'Returning to Yard'            WHERE status = 'Returning Empty'")

    # Revert truck.status and trailer.status
    op.execute("UPDATE truck SET status = 'Waiting for Loading' WHERE status = 'Arrived at Loading Point'")
    op.execute("UPDATE truck SET status = 'Returning to Yard'   WHERE status = 'Returning Empty'")

    op.execute("UPDATE trailer SET status = 'Waiting for Loading' WHERE status = 'Arrived at Loading Point'")
    op.execute("UPDATE trailer SET status = 'Returning to Yard'   WHERE status = 'Returning Empty'")
