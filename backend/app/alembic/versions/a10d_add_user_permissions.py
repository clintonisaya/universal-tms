"""add_user_permissions

Revision ID: a10d00000001
Revises: a9f1b2c3d4e5
Create Date: 2026-02-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'a10d00000001'
down_revision = 'a9f1b2c3d4e5'
branch_labels = None
depends_on = None


def _get_user_table_name() -> str:
    """Detect whether user table is 'user' or 'users' (create_all may have used model name)."""
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('user', 'users')")
    )
    names = [row[0] for row in result]
    if 'users' in names:
        return 'users'
    return 'user'


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=:t AND column_name=:c)"),
        {"t": table, "c": column}
    )
    return result.scalar()


def upgrade():
    table = _get_user_table_name()
    # Add permissions column only if it doesn't already exist
    if not _column_exists(table, 'permissions'):
        op.add_column(table, sa.Column('permissions', sa.JSON(), nullable=True))
    # Initialize existing users with empty permissions list
    op.execute(f'UPDATE "{table}" SET permissions = \'[]\' WHERE permissions IS NULL')


def downgrade():
    table = _get_user_table_name()
    op.drop_column(table, 'permissions')
