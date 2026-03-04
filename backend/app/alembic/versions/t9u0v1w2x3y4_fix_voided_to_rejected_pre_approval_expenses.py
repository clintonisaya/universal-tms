"""fix voided expenses that were never approved — reclassify as rejected

Revision ID: t9u0v1w2x3y4
Revises: s8t9u0v1w2x3
Create Date: 2026-03-04

Problem:
  The STATUS_TRANSITIONS table previously allowed managers/admins to set an
  expense to 'Voided' directly from 'Pending Manager' (before any approval).
  This was semantically wrong:
    - Rejected = manager denies the expense before approving it
    - Voided   = expense is cancelled AFTER manager approval

Fix applied:
  Any expense with status = 'Voided' AND approved_by_id IS NULL was voided
  before the manager ever approved it.  These records are reclassified to
  'Rejected' to reflect the correct intent.

  Expenses with approved_by_id IS NOT NULL were voided after approval and
  are left unchanged.

Rollback:
  Sets those same records back to 'Voided'.
"""

from alembic import op

revision: str = "t9u0v1w2x3y4"
down_revision: str = "s8t9u0v1w2x3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        UPDATE expense_request
        SET status = 'Rejected'
        WHERE status = 'Voided'
          AND approved_by_id IS NULL
    """)


def downgrade() -> None:
    # NOTE: this rollback is lossy — we cannot distinguish which 'Rejected'
    # records were originally 'Voided' vs legitimately rejected.
    # Only use this if you are certain no real rejections exist in the data.
    op.execute("""
        UPDATE expense_request
        SET status = 'Voided'
        WHERE status = 'Rejected'
          AND approved_by_id IS NULL
    """)
