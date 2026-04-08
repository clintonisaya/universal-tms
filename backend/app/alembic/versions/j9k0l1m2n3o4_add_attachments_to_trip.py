"""add attachments column to trip table

Revision ID: j9k0l1m2n3o4
Revises: i8j9k0l1m2n3
Create Date: 2026-02-22

Adds a JSON column 'attachments' to the 'trip' table for storing
R2 object keys of uploaded trip-level documents (contracts, permits, etc.).
Defaults to an empty JSON array so existing rows are unaffected.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "j9k0l1m2n3o4"
down_revision = "i8j9k0l1m2n3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trip",
        sa.Column("attachments", sa.JSON(), nullable=True, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("trip", "attachments")
