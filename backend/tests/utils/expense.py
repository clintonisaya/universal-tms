"""
Utility functions for expense tests.
"""
from decimal import Decimal

from sqlmodel import Session

from app.models import (
    ExpenseCategory,
    ExpenseRequest,
    ExpenseRequestCreate,
    ExpenseStatus,
    Trip,
    User,
)
from tests.utils.trip import create_random_trip


def create_random_expense(
    db: Session,
    user: User,
    trip: Trip | None = None,
    status: ExpenseStatus = ExpenseStatus.pending_manager,
) -> ExpenseRequest:
    """Create a random expense in the database."""
    if trip is None:
        trip = create_random_trip(db)

    expense_in = ExpenseRequestCreate(
        trip_id=trip.id,
        amount=Decimal("50000.00"),
        category=ExpenseCategory.fuel,
        description="Test fuel expense",
    )
    expense = ExpenseRequest(
        **expense_in.model_dump(),
        created_by_id=user.id,
        status=status,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


def create_office_expense(db: Session, user: User) -> ExpenseRequest:
    """Create an office expense (no trip_id)."""
    expense_in = ExpenseRequestCreate(
        trip_id=None,
        amount=Decimal("10000.00"),
        category=ExpenseCategory.office,
        description="Office supplies",
    )
    expense = ExpenseRequest(
        **expense_in.model_dump(),
        created_by_id=user.id,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense
