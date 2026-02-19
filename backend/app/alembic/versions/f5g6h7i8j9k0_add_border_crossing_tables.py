"""add border crossing tables

Revision ID: f5g6h7i8j9k0
Revises: e4f5g6h7i8j9
Create Date: 2026-02-18

Changes:
- CREATE TABLE border_post (border post master data)
- CREATE TABLE waybill_border (ordered junction: waybill <-> border posts)
- CREATE TABLE trip_border_crossing (per-trip crossing event with 7 progressive date stamps)
"""
from alembic import op
import sqlalchemy as sa

revision = 'f5g6h7i8j9k0'
down_revision = 'e4f5g6h7i8j9'
branch_labels = None
depends_on = None


def upgrade():
    # Border post master data
    op.create_table(
        'border_post',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('display_name', sa.String(255), nullable=False),
        sa.Column('side_a_name', sa.String(255), nullable=False),
        sa.Column('side_b_name', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # Waybill <-> border ordered junction
    op.create_table(
        'waybill_border',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('waybill_id', sa.UUID(), nullable=False),
        sa.Column('border_post_id', sa.UUID(), nullable=False),
        sa.Column('sequence', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['waybill_id'], ['waybill.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['border_post_id'], ['border_post.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('waybill_id', 'sequence', name='uq_waybill_border_sequence'),
        sa.UniqueConstraint('waybill_id', 'border_post_id', name='uq_waybill_border_post'),
    )

    # Trip border crossing events with 7 progressive date stamps
    op.create_table(
        'trip_border_crossing',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('trip_id', sa.UUID(), nullable=False),
        sa.Column('border_post_id', sa.UUID(), nullable=False),
        sa.Column('direction', sa.String(10), nullable=False),
        sa.Column('arrived_side_a_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('documents_submitted_side_a_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('documents_cleared_side_a_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('arrived_side_b_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('documents_submitted_side_b_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('documents_cleared_side_b_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('departed_border_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['trip_id'], ['trip.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['border_post_id'], ['border_post.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('trip_id', 'border_post_id', 'direction', name='uq_trip_border_direction'),
        sa.CheckConstraint("direction IN ('go', 'return')", name='ck_crossing_direction'),
    )


def downgrade():
    op.drop_table('trip_border_crossing')
    op.drop_table('waybill_border')
    op.drop_table('border_post')
