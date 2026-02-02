"""change_expense_amount_to_decimal

Revision ID: 2ded3840f140
Revises: d84e9f02g315
Create Date: 2026-01-27 10:40:24.851439

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2ded3840f140'
down_revision = 'd84e9f02g315'
branch_labels = None
depends_on = None


def upgrade():
    # Change amount from DOUBLE_PRECISION to NUMERIC(12,2) for financial precision
    op.alter_column('expense_request', 'amount',
               existing_type=sa.DOUBLE_PRECISION(precision=53),
               type_=sa.Numeric(precision=12, scale=2),
               existing_nullable=False)


def downgrade():
    op.alter_column('expense_request', 'amount',
               existing_type=sa.Numeric(precision=12, scale=2),
               type_=sa.DOUBLE_PRECISION(precision=53),
               existing_nullable=False)
