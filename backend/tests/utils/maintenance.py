"""
Utility functions for maintenance event tests.
"""
from datetime import datetime, timezone
from decimal import Decimal

from sqlmodel import Session

from app.models import (
    ExpenseCategory,
    ExpenseRequest,
    ExpenseStatus,
    MaintenanceEvent,
    Truck,
    User,
)


def create_maintenance_event(
    db: Session,
    truck: Truck,
    user: User,
    cost: Decimal = Decimal("50000.00"),
    garage_name: str = "Test Garage",
    description: str = "Brake repair",
) -> MaintenanceEvent:
    """Create a maintenance event with an associated expense request."""
    # Create the associated expense
    expense = ExpenseRequest(
        amount=cost,
        category=ExpenseCategory.maintenance,
        description=f"Maintenance for {garage_name}: {description}",
        status=ExpenseStatus.pending_manager,
        created_by_id=user.id,
    )
    db.add(expense)
    db.flush()

    # Create the maintenance event
    event = MaintenanceEvent(
        truck_id=truck.id,
        expense_id=expense.id,
        garage_name=garage_name,
        description=description,
        start_date=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
