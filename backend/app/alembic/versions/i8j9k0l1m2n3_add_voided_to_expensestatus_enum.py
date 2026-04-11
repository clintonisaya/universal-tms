"""add Voided to expensestatus enum

Revision ID: i8j9k0l1m2n3
Revises: h7i8j9k0l1m2
Create Date: 2026-02-22

Add 'Voided' value to the PostgreSQL expensestatus enum type.
ALTER TYPE ... ADD VALUE cannot be rolled back in PostgreSQL once committed,
so the downgrade is a no-op (the value becomes unused but the type is unchanged).
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "i8j9k0l1m2n3"
down_revision = "h7i8j9k0l1m2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The DB stores enum names (snake_case), matching the Python Enum member names.
    # Existing values: pending_manager, pending_finance, paid, rejected, returned
    # New member: voided = "Voided"  →  DB name = 'voided'
    #
    # IMPORTANT: ALTER TYPE ... ADD VALUE must be committed before the new value
    # can be used in queries. Alembic wraps migrations in a transaction by default,
    # which causes "unsafe use of new value" errors in subsequent migrations.
    # We use autocommit_block to commit this statement immediately.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE expensestatus ADD VALUE IF NOT EXISTS 'voided'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values.
    # The 'Voided' label remains in the type but is simply unused after rollback.
    pass
