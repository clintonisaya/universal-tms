"""Add category to office_expense_type

Revision ID: c1a2b3d4e5f6
Revises: f365f4ebae82
Create Date: 2026-02-13 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'c1a2b3d4e5f6'
down_revision = 'f365f4ebae82'
branch_labels = None
depends_on = None


def upgrade():
    # Add category column as nullable first (existing rows have no value)
    op.add_column('office_expense_type',
        sa.Column('category', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True)
    )
    # Backfill existing rows with 'Office' as default category
    op.execute("UPDATE office_expense_type SET category = 'Office' WHERE category IS NULL")
    # Now make it NOT NULL
    op.alter_column('office_expense_type', 'category', nullable=False)
    # Add index on category
    op.create_index(op.f('ix_office_expense_type_category'), 'office_expense_type', ['category'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_office_expense_type_category'), table_name='office_expense_type')
    op.drop_column('office_expense_type', 'category')
