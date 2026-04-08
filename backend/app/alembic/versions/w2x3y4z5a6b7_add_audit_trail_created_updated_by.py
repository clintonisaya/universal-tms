"""add audit trail created_by/updated_by to trip, waybill, expense

Revision ID: w2x3y4z5a6b7
Revises: v1w2x3y4z5a6
Create Date: 2026-03-07

Adds created_by_id and updated_by_id FK columns (nullable, references users.id)
to trip, waybill, and expense_request tables.
Old records will have NULL for these columns — acceptable for historical data.
"""

from alembic import op
import sqlalchemy as sa

revision: str = "w2x3y4z5a6b7"
down_revision: str = "v1w2x3y4z5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # trip
    op.add_column(
        "trip",
        sa.Column("created_by_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "trip",
        sa.Column("updated_by_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_trip_created_by_id_users",
        "trip", "users",
        ["created_by_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_trip_updated_by_id_users",
        "trip", "users",
        ["updated_by_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_trip_created_by_id", "trip", ["created_by_id"])
    op.create_index("ix_trip_updated_by_id", "trip", ["updated_by_id"])

    # waybill
    op.add_column(
        "waybill",
        sa.Column("created_by_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "waybill",
        sa.Column("updated_by_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_waybill_created_by_id_users",
        "waybill", "users",
        ["created_by_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_waybill_updated_by_id_users",
        "waybill", "users",
        ["updated_by_id"], ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_waybill_created_by_id", "waybill", ["created_by_id"])
    op.create_index("ix_waybill_updated_by_id", "waybill", ["updated_by_id"])

    # expense_request — already has created_by_id; add updated_by_id only
    op.add_column(
        "expense_request",
        sa.Column("updated_by_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_expense_request_updated_by_id_users",
        "expense_request", "users",
        ["updated_by_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_expense_request_updated_by_id_users", "expense_request", type_="foreignkey")
    op.drop_column("expense_request", "updated_by_id")

    op.drop_index("ix_waybill_updated_by_id", table_name="waybill")
    op.drop_index("ix_waybill_created_by_id", table_name="waybill")
    op.drop_constraint("fk_waybill_updated_by_id_users", "waybill", type_="foreignkey")
    op.drop_constraint("fk_waybill_created_by_id_users", "waybill", type_="foreignkey")
    op.drop_column("waybill", "updated_by_id")
    op.drop_column("waybill", "created_by_id")

    op.drop_index("ix_trip_updated_by_id", table_name="trip")
    op.drop_index("ix_trip_created_by_id", table_name="trip")
    op.drop_constraint("fk_trip_updated_by_id_users", "trip", type_="foreignkey")
    op.drop_constraint("fk_trip_created_by_id_users", "trip", type_="foreignkey")
    op.drop_column("trip", "updated_by_id")
    op.drop_column("trip", "created_by_id")
