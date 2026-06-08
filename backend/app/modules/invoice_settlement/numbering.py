"""Invoice number generation.

Invoice numbering:  {seq:04d}  (e.g. 0001, 0002, ...)
Uses pg_advisory_xact_lock to prevent concurrent duplicates.
"""

import logging

from sqlalchemy import text
from sqlmodel import Session, select

logger = logging.getLogger(__name__)

# Advisory lock ID for invoice number generation
_LOCK_INVOICE = 2001


def generate_next_invoice_number(session: Session) -> tuple[str, int]:
    """Suggest the next sequential invoice number. User can override it.

    Returns (display_number, seq) where display_number is zero-padded.
    Skips over any gaps caused by manually assigned numbers.
    """
    from app.models import Invoice

    session.execute(text(f"SELECT pg_advisory_xact_lock({_LOCK_INVOICE})"))

    last_seq = session.exec(
        select(Invoice.invoice_seq)
        .order_by(Invoice.invoice_seq.desc())
        .limit(1)
    ).first()
    seq = (last_seq or 0) + 1

    # Keep incrementing until we find an unused invoice number
    while check_invoice_number_exists(session, f"{seq:04d}"):
        seq += 1

    return f"{seq:04d}", seq


def check_invoice_number_exists(
    session: Session,
    number: str,
    exclude_id: object | None = None,
) -> bool:
    """Check if an invoice number already exists in the database."""
    from app.models import Invoice

    query = select(Invoice).where(Invoice.invoice_number == number)
    if exclude_id:
        query = query.where(Invoice.id != exclude_id)
    return session.exec(query).first() is not None
