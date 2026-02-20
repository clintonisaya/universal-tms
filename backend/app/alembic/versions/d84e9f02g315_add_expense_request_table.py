"""add_expense_request_table

Revision ID: d84e9f02g315
Revises: c73d8e91f204
Create Date: 2026-01-26 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'd84e9f02g315'
down_revision = 'c73d8e91f204'
branch_labels = None
depends_on = None


def upgrade():
    # Create ExpenseStatus enum if it doesn't exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE expensestatus AS ENUM (
                'pending_manager', 'pending_finance', 'paid', 'rejected', 'returned'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create ExpenseCategory enum if it doesn't exist
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE expensecategory AS ENUM (
                'fuel', 'allowance', 'maintenance', 'office', 'border', 'other'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Create expense_request table with VARCHAR columns first (avoids SQLAlchemy ENUM auto-creation)
    op.create_table('expense_request',
        sa.Column('trip_id', sa.Uuid(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_by_id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['trip_id'], ['trip.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Alter columns to use the existing enum types
    op.execute("ALTER TABLE expense_request ALTER COLUMN category TYPE expensecategory USING category::expensecategory")
    op.execute("ALTER TABLE expense_request ALTER COLUMN status TYPE expensestatus USING status::expensestatus")
    op.create_index(op.f('ix_expense_request_trip_id'), 'expense_request', ['trip_id'], unique=False)
    op.create_index(op.f('ix_expense_request_status'), 'expense_request', ['status'], unique=False)
    op.create_index(op.f('ix_expense_request_category'), 'expense_request', ['category'], unique=False)
    op.create_index(op.f('ix_expense_request_created_by_id'), 'expense_request', ['created_by_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_expense_request_created_by_id'), table_name='expense_request')
    op.drop_index(op.f('ix_expense_request_category'), table_name='expense_request')
    op.drop_index(op.f('ix_expense_request_status'), table_name='expense_request')
    op.drop_index(op.f('ix_expense_request_trip_id'), table_name='expense_request')
    op.drop_table('expense_request')
    op.execute("DROP TYPE IF EXISTS expensestatus")
    op.execute("DROP TYPE IF EXISTS expensecategory")
