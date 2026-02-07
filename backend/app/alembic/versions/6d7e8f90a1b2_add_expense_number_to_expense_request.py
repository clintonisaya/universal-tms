"""add_expense_number_to_expense_request

Revision ID: 6d7e8f90a1b2
Revises: 5c5580d8ab3d
Create Date: 2026-02-03 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '6d7e8f90a1b2'
down_revision = '5c5580d8ab3d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('expense_request', sa.Column('expense_number', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.create_index(op.f('ix_expense_request_expense_number'), 'expense_request', ['expense_number'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_expense_request_expense_number'), table_name='expense_request')
    op.drop_column('expense_request', 'expense_number')
