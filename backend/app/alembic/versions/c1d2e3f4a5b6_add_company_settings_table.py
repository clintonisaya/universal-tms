"""add company_settings table

Revision ID: c1d2e3f4a5b6
Revises: a0b1c2d3e0f1
Create Date: 2026-04-08 12:00:00.000000

Add company_settings table to store bank details for invoices.
Seeds with current hardcoded values from invoices.py.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# revision identifiers, used by Alembic.
revision = "c1d2e3f4a5b6"
down_revision = "a0b1c2d3e0f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "company_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("bank_name_tzs", sa.String(255), nullable=False, server_default="CRDB BANK - AZIKIWE BRANCH"),
        sa.Column("bank_account_tzs", sa.String(100), nullable=False, server_default="015C001CVAW00"),
        sa.Column("bank_account_name", sa.String(255), nullable=False, server_default="NABLAFLEET COMPANY LIMITED"),
        sa.Column("bank_currency_tzs", sa.String(50), nullable=False, server_default="Tanzanian Shilling"),
        sa.Column("bank_name_usd", sa.String(255), nullable=False, server_default="CRDB BANK - AZIKIWE BRANCH"),
        sa.Column("bank_account_usd", sa.String(100), nullable=False, server_default="025C001CVAW00"),
        sa.Column("bank_currency_usd", sa.String(50), nullable=False, server_default="USD"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )

    # Seed with current hardcoded bank details
    op.execute(
        """
        INSERT INTO company_settings (id, bank_name_tzs, bank_account_tzs, bank_account_name, bank_currency_tzs, bank_name_usd, bank_account_usd, bank_currency_usd)
        VALUES (
            'a0000000-0000-0000-0000-000000000001',
            'CRDB BANK - AZIKIWE BRANCH',
            '015C001CVAW00',
            'NABLAFLEET COMPANY LIMITED',
            'Tanzanian Shilling',
            'CRDB BANK - AZIKIWE BRANCH',
            '025C001CVAW00',
            'USD'
        )
        """
    )


def downgrade() -> None:
    op.drop_table("company_settings")
