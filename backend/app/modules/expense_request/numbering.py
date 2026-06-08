"""Expense number generation.

Trip expenses:     E{trip_number}-{seq:03d}  (e.g. ET512EZD-2026001-001)
Non-trip expenses: EX-{YYYY}-{seq:04d}      (e.g. EX-2026-0001)
"""

import logging
from datetime import datetime

from sqlalchemy import text
from sqlmodel import Session, select

logger = logging.getLogger(__name__)

# Advisory lock IDs for expense number generation
_LOCK_TRIP_EXPENSE = 1003
_LOCK_OFFICE_EXPENSE = 1004


def _next_sequence(session: Session, pattern: str) -> int:
    """Find the next sequence number for expenses matching *pattern*.

    Expects the last segment after the final '-' to be a zero-padded integer.
    Returns 1 when no prior number exists or parsing fails.
    """
    from app.models import ExpenseRequest

    last_stmt = (
        select(ExpenseRequest.expense_number)
        .where(ExpenseRequest.expense_number.like(pattern))
        .order_by(ExpenseRequest.expense_number.desc())
        .limit(1)
    )
    last_number = session.exec(last_stmt).first()
    if last_number:
        try:
            return int(last_number.split("-")[-1]) + 1
        except ValueError:
            logger.error("Failed to parse expense number: %s", last_number)
    return 1


def generate_trip_expense_number(session: Session, trip_number: str) -> str:
    """Generate a trip-scoped expense number: E{trip_number}-{seq:03d}."""
    session.execute(text(f"SELECT pg_advisory_xact_lock({_LOCK_TRIP_EXPENSE})"))
    pattern = f"E{trip_number}-%"
    seq = _next_sequence(session, pattern)
    return f"E{trip_number}-{seq:03d}"


def generate_office_expense_number(session: Session) -> str:
    """Generate a year-scoped office expense number: EX-{YYYY}-{seq:04d}."""
    session.execute(text(f"SELECT pg_advisory_xact_lock({_LOCK_OFFICE_EXPENSE})"))
    year = datetime.now().year
    pattern = f"EX-{year}-%"
    seq = _next_sequence(session, pattern)
    return f"EX-{year}-{seq:04d}"


def generate_expense_number(
    session: Session,
    trip_id: str | None,
    trip_number: str | None,
) -> str:
    """Top-level dispatcher: pick trip or office numbering based on trip_id."""
    if trip_id and trip_number:
        return generate_trip_expense_number(session, trip_number)
    return generate_office_expense_number(session)
