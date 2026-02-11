"""rename_user_table_to_users

Revision ID: 24dcd2d3f5e7
Revises: a10d00000001
Create Date: 2026-02-11 19:18:20.448045

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '24dcd2d3f5e7'
down_revision = 'a10d00000001'
branch_labels = None
depends_on = None


def _table_exists(name: str) -> bool:
    """Check if a table exists in the current database."""
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=:t)"),
        {"t": name}
    )
    return result.scalar()


def _constraint_exists(table: str, constraint: str) -> bool:
    """Check if a constraint exists on a table."""
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name=:t AND constraint_name=:c)"),
        {"t": table, "c": constraint}
    )
    return result.scalar()


def _index_exists(name: str) -> bool:
    """Check if an index exists."""
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname=:n)"),
        {"n": name}
    )
    return result.scalar()


def upgrade():
    # Create tables only if they don't already exist (SQLModel.metadata.create_all may have run first)
    if not _table_exists('country'):
        op.create_table('country',
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('code', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=True),
        sa.Column('sorting', sa.Integer(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
        )
    if not _index_exists('ix_country_name'):
        op.create_index(op.f('ix_country_name'), 'country', ['name'], unique=True)

    if not _table_exists('office_expense_type'):
        op.create_table('office_expense_type',
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
        )
    if not _index_exists('ix_office_expense_type_name'):
        op.create_index(op.f('ix_office_expense_type_name'), 'office_expense_type', ['name'], unique=True)

    # Rename user -> users only if 'user' table still exists (create_all may have made 'users' directly)
    if _table_exists('user') and not _table_exists('users'):
        op.rename_table('user', 'users')
        if _index_exists('ix_user_username'):
            op.execute('ALTER INDEX ix_user_username RENAME TO ix_users_username')
        if _constraint_exists('users', 'user_pkey'):
            op.execute('ALTER TABLE users RENAME CONSTRAINT user_pkey TO users_pkey')
    elif _table_exists('user') and _table_exists('users'):
        # Both exist (create_all made 'users', old 'user' still around) - drop the empty one
        op.drop_table('user')

    if not _table_exists('city'):
        op.create_table('city',
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('country_id', sa.Uuid(), nullable=False),
        sa.Column('sorting', sa.Integer(), nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['country_id'], ['country.id'], ),
        sa.PrimaryKeyConstraint('id')
        )
    if not _index_exists('ix_city_name'):
        op.create_index(op.f('ix_city_name'), 'city', ['name'], unique=False)

    # Update foreign keys to point to 'users' table (only if old constraints exist)
    if _constraint_exists('expense_request', 'expense_request_approved_by_id_fkey'):
        op.drop_constraint('expense_request_approved_by_id_fkey', 'expense_request', type_='foreignkey')
    if _constraint_exists('expense_request', 'fk_expense_request_paid_by_id'):
        op.drop_constraint('fk_expense_request_paid_by_id', 'expense_request', type_='foreignkey')
    if _constraint_exists('expense_request', 'expense_request_created_by_id_fkey'):
        op.drop_constraint('expense_request_created_by_id_fkey', 'expense_request', type_='foreignkey')
    op.create_foreign_key('expense_request_paid_by_id_fkey', 'expense_request', 'users', ['paid_by_id'], ['id'])
    op.create_foreign_key('expense_request_approved_by_id_fkey', 'expense_request', 'users', ['approved_by_id'], ['id'])
    op.create_foreign_key('expense_request_created_by_id_fkey', 'expense_request', 'users', ['created_by_id'], ['id'])
    if _constraint_exists('item', 'item_owner_id_fkey'):
        op.drop_constraint('item_owner_id_fkey', 'item', type_='foreignkey')
    op.create_foreign_key('item_owner_id_fkey', 'item', 'users', ['owner_id'], ['id'], ondelete='CASCADE')

    # Manually added Enum creation
    tripstatus = sa.Enum('Waiting', 'Dispatch', 'Loading', 'In Transit', 'At Border', 'Offloaded', 'Returned', 'Waiting for PODs', 'Completed', 'Cancelled', name='tripstatus')
    tripstatus.create(op.get_bind(), checkfirst=True)

    op.alter_column('trip', 'status',
               existing_type=sa.VARCHAR(length=50),
               type_=tripstatus,
               existing_nullable=False,
               postgresql_using='status::tripstatus')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('trip', 'status',
               existing_type=sa.Enum('Waiting', 'Dispatch', 'Loading', 'In Transit', 'At Border', 'Offloaded', 'Returned', 'Waiting for PODs', 'Completed', 'Cancelled', name='tripstatus'),
               type_=sa.VARCHAR(length=50),
               existing_nullable=False)
    op.drop_constraint(None, 'item', type_='foreignkey')
    op.create_foreign_key('item_owner_id_fkey', 'item', 'user', ['owner_id'], ['id'], ondelete='CASCADE')
    op.drop_constraint(None, 'expense_request', type_='foreignkey')
    op.drop_constraint(None, 'expense_request', type_='foreignkey')
    op.drop_constraint(None, 'expense_request', type_='foreignkey')
    op.create_foreign_key('expense_request_created_by_id_fkey', 'expense_request', 'user', ['created_by_id'], ['id'])
    op.create_foreign_key('fk_expense_request_paid_by_id', 'expense_request', 'user', ['paid_by_id'], ['id'])
    op.create_foreign_key('expense_request_approved_by_id_fkey', 'expense_request', 'user', ['approved_by_id'], ['id'])
    
    op.rename_table('users', 'user')
    op.execute('ALTER INDEX ix_users_username RENAME TO ix_user_username')
    op.execute('ALTER TABLE "user" RENAME CONSTRAINT users_pkey TO user_pkey')
    
    op.drop_index(op.f('ix_city_name'), table_name='city')
    op.drop_table('city')
    op.drop_index(op.f('ix_office_expense_type_name'), table_name='office_expense_type')
    op.drop_table('office_expense_type')
    op.drop_index(op.f('ix_country_name'), table_name='country')
    op.drop_table('country')
    # ### end Alembic commands ###
