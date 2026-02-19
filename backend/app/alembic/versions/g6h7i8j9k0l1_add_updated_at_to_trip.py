"""add updated_at to trip

Revision ID: g6h7i8j9k0l1
Revises: f5g6h7i8j9k0
Create Date: 2026-02-19

Changes:
- ADD COLUMN updated_at TIMESTAMPTZ to trip table
  Back-fills existing rows with created_at so Last Updated shows a meaningful value.
"""
from alembic import op
import sqlalchemy as sa

revision = "g6h7i8j9k0l1"
down_revision = "f5g6h7i8j9k0"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "trip",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    # Back-fill: use created_at so existing rows show a sensible "Last Updated"
    op.execute("UPDATE trip SET updated_at = created_at WHERE updated_at IS NULL")


def downgrade():
    op.drop_column("trip", "updated_at")
