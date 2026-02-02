"""Replace email with username and add role

Revision ID: a1b2c3d4e5f6
Revises: fe56fa70289e
Create Date: 2026-01-25 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'fe56fa70289e'
branch_labels = None
depends_on = None


def upgrade():
    # Drop old email index and column
    op.drop_index('ix_user_email', table_name='user')
    op.drop_column('user', 'email')

    # Add username column
    op.add_column('user', sa.Column('username', sa.String(length=50), nullable=False, server_default='temp_user'))
    op.create_index('ix_user_username', 'user', ['username'], unique=True)

    # Add role column
    op.add_column('user', sa.Column('role', sa.String(length=20), nullable=False, server_default='ops'))


def downgrade():
    # Remove role column
    op.drop_column('user', 'role')

    # Remove username
    op.drop_index('ix_user_username', table_name='user')
    op.drop_column('user', 'username')

    # Restore email column
    op.add_column('user', sa.Column('email', sa.String(length=255), nullable=False, server_default='temp@example.com'))
    op.create_index('ix_user_email', 'user', ['email'], unique=True)
