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
    op.execute("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Offloaded'")
    op.execute("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'On Way Return'")
    op.execute("ALTER TYPE tripstatus ADD VALUE IF NOT EXISTS 'Waiting (Return)'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values.
    pass
