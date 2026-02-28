"""add Offloaded, On Way Return, Waiting (Return) to tripstatus enum

Revision ID: l1m2n3o4p5q6
Revises: k0l1m2n3o4p5
Create Date: 2026-02-28

Add three new values to the PostgreSQL tripstatus enum type.
ALTER TYPE ... ADD VALUE cannot be rolled back in PostgreSQL once committed,
so the downgrade is a no-op (values become unused but the type is unchanged).
"""

from alembic import op


revision = "l1m2n3o4p5q6"
down_revision = "k0l1m2n3o4p5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Guard: on a fresh database the enum is created by create_all() from the
    # SQLModel model definitions (which already include these values), so the
    # ALTER is only needed on existing databases where the enum already exists.
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tripstatus') THEN
                ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Offloaded';
                ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'On Way Return';
                ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Waiting (Return)';
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # PostgreSQL does not support removing enum values.
    pass
