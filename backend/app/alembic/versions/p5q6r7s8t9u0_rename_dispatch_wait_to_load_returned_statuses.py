"""rename Dispatch→Dispatched, Wait to Load→Waiting for Loading, Returned→Arrived at Yard

Revision ID: p5q6r7s8t9u0
Revises: o4p5q6r7s8t9
Create Date: 2026-02-28

PostgreSQL does not support renaming enum values directly.
Strategy: add the new values, migrate existing rows, leave old values unused.
Applies to tripstatus enum (used in trip.status).
TruckStatus and TrailerStatus are stored as plain VARCHAR — rows updated directly.
"""

from alembic import op


revision = "p5q6r7s8t9u0"
down_revision = "o4p5q6r7s8t9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── tripstatus enum (trip.status) ────────────────────────────────────────
    # Add the 5 new enum values (IF NOT EXISTS is safe on repeated runs)
    op.execute("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Dispatched'")
    op.execute("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Waiting for Loading'")
    op.execute("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Dispatched (Return)'")
    op.execute("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Waiting for Loading (Return)'")
    op.execute("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Arrived at Yard'")

    # Migrate existing trip rows
    op.execute("UPDATE trip SET status = 'Dispatched'                    WHERE status = 'Dispatch'")
    op.execute("UPDATE trip SET status = 'Waiting for Loading'           WHERE status = 'Wait to Load'")
    op.execute("UPDATE trip SET status = 'Dispatched (Return)'           WHERE status = 'Dispatch (Return)'")
    op.execute("UPDATE trip SET status = 'Waiting for Loading (Return)'  WHERE status = 'Wait to Load (Return)'")
    op.execute("UPDATE trip SET status = 'Arrived at Yard'               WHERE status = 'Returned'")

    # ── truck.status (VARCHAR) ────────────────────────────────────────────────
    op.execute("UPDATE truck SET status = 'Dispatched'         WHERE status = 'Dispatch'")
    op.execute("UPDATE truck SET status = 'Waiting for Loading' WHERE status = 'Wait to Load'")
    op.execute("UPDATE truck SET status = 'Arrived at Yard'    WHERE status = 'Returned'")

    # ── trailer.status (VARCHAR) ──────────────────────────────────────────────
    op.execute("UPDATE trailer SET status = 'Dispatched'         WHERE status = 'Dispatch'")
    op.execute("UPDATE trailer SET status = 'Waiting for Loading' WHERE status = 'Wait to Load'")
    op.execute("UPDATE trailer SET status = 'Arrived at Yard'    WHERE status = 'Returned'")


def downgrade() -> None:
    # Revert trip rows (enum values themselves cannot be removed in PostgreSQL)
    op.execute("UPDATE trip SET status = 'Dispatch'           WHERE status = 'Dispatched'")
    op.execute("UPDATE trip SET status = 'Wait to Load'       WHERE status = 'Waiting for Loading'")
    op.execute("UPDATE trip SET status = 'Dispatch (Return)'  WHERE status = 'Dispatched (Return)'")
    op.execute("UPDATE trip SET status = 'Wait to Load (Return)' WHERE status = 'Waiting for Loading (Return)'")
    op.execute("UPDATE trip SET status = 'Returned'           WHERE status = 'Arrived at Yard'")

    # Revert truck rows
    op.execute("UPDATE truck SET status = 'Dispatch'    WHERE status = 'Dispatched'")
    op.execute("UPDATE truck SET status = 'Wait to Load' WHERE status = 'Waiting for Loading'")
    op.execute("UPDATE truck SET status = 'Returned'    WHERE status = 'Arrived at Yard'")

    # Revert trailer rows
    op.execute("UPDATE trailer SET status = 'Dispatch'    WHERE status = 'Dispatched'")
    op.execute("UPDATE trailer SET status = 'Wait to Load' WHERE status = 'Waiting for Loading'")
    op.execute("UPDATE trailer SET status = 'Returned'    WHERE status = 'Arrived at Yard'")
