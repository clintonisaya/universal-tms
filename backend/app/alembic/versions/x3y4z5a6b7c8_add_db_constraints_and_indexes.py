"""add db constraints and indexes — exchange rate unique, border crossing index, waybill border unique

Revision ID: x3y4z5a6b7c8
Revises: w2x3y4z5a6b7
Create Date: 2026-03-07

Story 6.15: Database Constraints & Indexes
- UniqueConstraint on exchange_rate(month, year)
- Compound Index on trip_border_crossing(trip_id, border_post_id, direction)
- UniqueConstraint on waybill_border(waybill_id, border_post_id)
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "x3y4z5a6b7c8"
down_revision = "w2x3y4z5a6b7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # AC-1: Unique constraint on exchange_rate(month, year)
    op.create_unique_constraint(
        "uq_exchange_rate_month_year",
        "exchange_rate",
        ["month", "year"],
    )

    # AC-2: Compound index on trip_border_crossing(trip_id, border_post_id, direction)
    op.create_index(
        "ix_trip_border_crossing_lookup",
        "trip_border_crossing",
        ["trip_id", "border_post_id", "direction"],
    )

    # AC-3: Unique constraint on waybill_border(waybill_id, border_post_id)
    op.create_unique_constraint(
        "uq_waybill_border",
        "waybill_border",
        ["waybill_id", "border_post_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_waybill_border", "waybill_border", type_="unique")
    op.drop_index("ix_trip_border_crossing_lookup", table_name="trip_border_crossing")
    op.drop_constraint("uq_exchange_rate_month_year", "exchange_rate", type_="unique")
