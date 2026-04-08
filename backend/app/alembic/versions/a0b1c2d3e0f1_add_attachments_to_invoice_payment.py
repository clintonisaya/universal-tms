"""add attachments column to invoice_payment

Revision ID: a0b1c2d3e0f1
Revises: w2x3y4z5a6b7
Create Date: 2026-04-06

Add a JSON column to store POP attachment storage keys.
"""
from alembic import op
import sqlalchemy as sa

revision = "a0b1c2d3e0f1"
down_revision = "b0c1d2e3f4a5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "invoice_payment",
        sa.Column("attachments", sa.JSON(), nullable=True, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("invoice_payment", "attachments")
