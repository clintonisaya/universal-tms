"""add invoice table

Revision ID: z5a6b7c8d9e0
Revises: y4z5a6b7c8d9
Create Date: 2026-03-26

New table: invoice — stores commercial invoices generated from waybills.
One invoice per waybill (unique constraint on waybill_id).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "z5a6b7c8d9e0"
down_revision = "y4z5a6b7c8d9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "invoice",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("invoice_number", sa.String(), nullable=False),
        sa.Column("invoice_seq", sa.Integer(), nullable=False),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("due_date", sa.String(length=10), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        # Company
        sa.Column("company_name", sa.String(length=255), nullable=False, server_default="NABLAFLEET COMPANY LIMITED"),
        sa.Column("company_address", sa.String(length=500), nullable=False, server_default="P.O.Box 999, Dar es Salaam, Tanzania"),
        sa.Column("company_tin", sa.String(length=50), nullable=False, server_default="168883285"),
        sa.Column("company_phone", sa.String(length=50), nullable=False, server_default="+255 718 478 666"),
        sa.Column("company_email", sa.String(length=255), nullable=False, server_default="info@nablafleetcompany.com"),
        # Customer
        sa.Column("customer_name", sa.String(length=255), nullable=False),
        sa.Column("customer_tin", sa.String(length=50), nullable=False, server_default=""),
        sa.Column("client_id", sa.Uuid(), nullable=True),
        sa.Column("regarding", sa.String(length=255), nullable=False, server_default="TRANSPORTATION"),
        # Financial
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
        sa.Column("vat_rate", sa.Numeric(precision=5, scale=2), nullable=False, server_default="0"),
        sa.Column("exchange_rate", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("subtotal", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("vat_amount", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("total_usd", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("total_tzs", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("amount_paid", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        sa.Column("amount_outstanding", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0"),
        # JSON columns
        sa.Column("items", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("bank_details_tzs", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("bank_details_usd", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default="{}"),
        # References
        sa.Column("waybill_id", sa.Uuid(), nullable=True),
        sa.Column("trip_id", sa.Uuid(), nullable=True),
        # Audit
        sa.Column("created_by_id", sa.Uuid(), nullable=True),
        sa.Column("updated_by_id", sa.Uuid(), nullable=True),
        sa.Column("issued_by_id", sa.Uuid(), nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        # Constraints
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["client_id"], ["client.id"]),
        sa.ForeignKeyConstraint(["waybill_id"], ["waybill.id"]),
        sa.ForeignKeyConstraint(["trip_id"], ["trip.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["issued_by_id"], ["users.id"]),
        sa.UniqueConstraint("waybill_id", name="uq_invoice_waybill"),
    )
    op.create_index("ix_invoice_invoice_number", "invoice", ["invoice_number"], unique=True)
    op.create_index("ix_invoice_status", "invoice", ["status"])
    op.create_index("ix_invoice_client_id", "invoice", ["client_id"])
    op.create_index("ix_invoice_created_by_id", "invoice", ["created_by_id"])
    op.create_index("ix_invoice_updated_by_id", "invoice", ["updated_by_id"])
    op.create_index("ix_invoice_issued_by_id", "invoice", ["issued_by_id"])


def downgrade() -> None:
    op.drop_index("ix_invoice_issued_by_id", table_name="invoice")
    op.drop_index("ix_invoice_updated_by_id", table_name="invoice")
    op.drop_index("ix_invoice_created_by_id", table_name="invoice")
    op.drop_index("ix_invoice_client_id", table_name="invoice")
    op.drop_index("ix_invoice_status", table_name="invoice")
    op.drop_index("ix_invoice_invoice_number", table_name="invoice")
    op.drop_table("invoice")
