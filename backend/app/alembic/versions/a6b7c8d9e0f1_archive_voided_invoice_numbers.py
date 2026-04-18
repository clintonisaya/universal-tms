"""archive voided invoice numbers

Revision ID: a6b7c8d9e0f1
Revises: c1d2e3f4a5b6
Create Date: 2026-04-18 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a6b7c8d9e0f1"
down_revision = "c1d2e3f4a5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "invoice",
        sa.Column("archived_invoice_number", sa.String(length=50), nullable=True),
    )
    op.alter_column(
        "invoice",
        "invoice_number",
        existing_type=sa.String(),
        nullable=True,
    )
    op.execute(
        """
        UPDATE invoice
        SET archived_invoice_number = invoice_number,
            invoice_number = NULL
        WHERE status = 'voided'
          AND invoice_number IS NOT NULL
          AND archived_invoice_number IS NULL
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE invoice
        SET invoice_number = COALESCE(invoice_number, archived_invoice_number, 'ARCHIVED-' || id::text)
        WHERE invoice_number IS NULL
        """
    )
    op.alter_column(
        "invoice",
        "invoice_number",
        existing_type=sa.String(),
        nullable=False,
    )
    op.drop_column("invoice", "archived_invoice_number")
