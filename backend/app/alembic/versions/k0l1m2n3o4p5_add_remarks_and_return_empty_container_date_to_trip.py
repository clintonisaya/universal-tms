"""add remarks and return_empty_container_date to trip table

Revision ID: k0l1m2n3o4p5
Revises: j9k0l1m2n3o4
Create Date: 2026-02-23

Adds two new nullable columns to the 'trip' table for the client export report:
- return_empty_container_date: datetime when the empty container was returned
- remarks: free-text notes field for client-facing reports
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "k0l1m2n3o4p5"
down_revision = "j9k0l1m2n3o4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trip",
        sa.Column("return_empty_container_date", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "trip",
        sa.Column("remarks", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("trip", "return_empty_container_date")
    op.drop_column("trip", "remarks")
