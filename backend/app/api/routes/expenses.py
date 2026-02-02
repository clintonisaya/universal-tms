"""
Expense Request Submission - Story 2.2
CRUD endpoints for expense management with RBAC and status workflow.
"""
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.core.socket import sio
from app.models import (
    ExpenseCategory,
    ExpensePayment,
    ExpenseRequest,
    ExpenseRequestCreate,
    ExpenseRequestPublic,
    ExpenseRequestPublicDetailed,
    ExpenseRequestsPublic,
    ExpenseRequestUpdate,
    ExpenseBulkUpdate,
    ExpenseStatus,
    Message,
    PaymentMethod,
    Trip,
    UserRole,
)

router = APIRouter(prefix="/expenses", tags=["expenses"])

# Valid status transitions by role
# Format: {current_status: {role: [allowed_new_statuses]}}
STATUS_TRANSITIONS = {
    ExpenseStatus.pending_manager: {
        UserRole.manager: [ExpenseStatus.pending_finance, ExpenseStatus.rejected, ExpenseStatus.returned],
        UserRole.admin: [ExpenseStatus.pending_finance, ExpenseStatus.rejected, ExpenseStatus.returned],
    },
    ExpenseStatus.pending_finance: {
        UserRole.finance: [ExpenseStatus.paid, ExpenseStatus.returned],
        UserRole.admin: [ExpenseStatus.paid, ExpenseStatus.returned],
    },
    ExpenseStatus.returned: {
        UserRole.ops: [ExpenseStatus.pending_manager],  # Resubmit after correction
        UserRole.manager: [ExpenseStatus.pending_manager],
        UserRole.admin: [ExpenseStatus.pending_manager],
    },
}


def validate_status_transition(
    current_status: ExpenseStatus,
    new_status: ExpenseStatus,
    user_role: UserRole,
) -> bool:
    """Check if the status transition is valid for the user's role."""
    if current_status == new_status:
        return True  # No change

    allowed_transitions = STATUS_TRANSITIONS.get(current_status, {})
    allowed_statuses = allowed_transitions.get(user_role, [])
    return new_status in allowed_statuses


def can_view_expense(expense: ExpenseRequest, user: Any) -> bool:
    """Check if user can view this expense."""
    # Admins and managers can view all
    if user.role in [UserRole.admin, UserRole.manager]:
        return True
    # Finance can view expenses pending their approval or already paid
    if user.role == UserRole.finance:
        return expense.status in [ExpenseStatus.pending_finance, ExpenseStatus.paid]
    # Ops can only view their own
    return expense.created_by_id == user.id


def can_modify_expense(expense: ExpenseRequest, user: Any) -> bool:
    """Check if user can modify this expense (amount, description, category)."""
    # Only creator can modify, and only when pending manager
    if expense.status != ExpenseStatus.pending_manager:
        return False
    return expense.created_by_id == user.id or user.role == UserRole.admin


def can_delete_expense(expense: ExpenseRequest, user: Any) -> bool:
    """Check if user can delete this expense."""
    # Can only delete when pending manager
    if expense.status != ExpenseStatus.pending_manager:
        return False
    # Only creator or admin can delete
    return expense.created_by_id == user.id or user.role == UserRole.admin


@router.get("/", response_model=ExpenseRequestsPublic)
def read_expenses(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    trip_id: uuid.UUID | None = Query(default=None, description="Filter by trip ID"),
    status: str | None = Query(default=None, description="Filter by status"),
    category: str | None = Query(default=None, description="Filter by category"),
) -> Any:
    """
    Retrieve expenses with optional filtering.

    Access control:
    - Admin/Manager: Can see all expenses
    - Finance: Can see expenses in Pending Finance or Paid status
    - Ops: Can only see their own expenses
    """
    # Validate enum filters
    if status:
        valid_statuses = [s.value for s in ExpenseStatus]
        if status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

    if category:
        valid_categories = [c.value for c in ExpenseCategory]
        if category not in valid_categories:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}"
            )

    # Build query with filters
    query = select(ExpenseRequest)

    if trip_id:
        query = query.where(ExpenseRequest.trip_id == trip_id)
    if status:
        query = query.where(ExpenseRequest.status == status)
    if category:
        query = query.where(ExpenseRequest.category == category)

    # Apply role-based filtering
    if current_user.role == UserRole.ops:
        # Ops can only see their own expenses
        query = query.where(ExpenseRequest.created_by_id == current_user.id)
    elif current_user.role == UserRole.finance:
        # Finance can see expenses pending their approval or paid
        query = query.where(
            ExpenseRequest.status.in_([
                ExpenseStatus.pending_finance.value,
                ExpenseStatus.paid.value,
            ])
        )
    # Admin and Manager can see all (no additional filter)

    # Count total matching records
    count_query = select(func.count()).select_from(query.subquery())
    count = session.exec(count_query).one()

    # Apply pagination and ordering
    query = (
        query.order_by(ExpenseRequest.created_at.desc())
        .offset(skip)
        .limit(limit)
        .options(selectinload(ExpenseRequest.created_by), selectinload(ExpenseRequest.trip))
    )
    expenses = session.exec(query).all()

    return ExpenseRequestsPublic(data=expenses, count=count)


@router.get("/{id}", response_model=ExpenseRequestPublicDetailed)
def read_expense(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Get expense by ID with detailed information."""
    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if not can_view_expense(expense, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to view this expense")

    return expense


@router.patch("/batch", response_model=Message)
async def batch_update_expenses(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    bulk_in: ExpenseBulkUpdate,
) -> Message:
    """
    Batch update expense status.
    Checks permissions for each transition.
    """
    # 1. Fetch all expenses
    expenses = session.exec(
        select(ExpenseRequest).where(ExpenseRequest.id.in_(bulk_in.ids))
    ).all()

    if len(expenses) != len(bulk_in.ids):
        found_ids = {e.id for e in expenses}
        missing_ids = set(bulk_in.ids) - found_ids
        raise HTTPException(
            status_code=404, 
            detail=f"Expenses not found: {', '.join(str(id) for id in missing_ids)}"
        )

    updated_count = 0
    
    for expense in expenses:
        # Check transition permission
        current_status = ExpenseStatus(expense.status) if isinstance(expense.status, str) else expense.status
        
        # Skip if already in target status
        if current_status == bulk_in.status:
            continue
            
        if not validate_status_transition(current_status, bulk_in.status, current_user.role):
            # For batch operations, we might want to fail all or skip. 
            # Strict approach: Fail all if one is invalid
            raise HTTPException(
                status_code=403,
                detail=f"Not authorized to change status of expense {expense.id} from '{current_status.value}' to '{bulk_in.status.value}'"
            )

        # Update
        expense.status = bulk_in.status
        if bulk_in.comment:
            expense.manager_comment = bulk_in.comment
        expense.updated_at = datetime.now(timezone.utc)
        session.add(expense)
        updated_count += 1

    session.commit()
    
    # Emit socket event
    await sio.emit("expense_updated", {"count": updated_count, "message": "Batch update processed"})
    
    return Message(message=f"Successfully updated {updated_count} expenses")


@router.post("/", response_model=ExpenseRequestPublic)
async def create_expense(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    expense_in: ExpenseRequestCreate,
) -> Any:
    """
    Create a new expense request.

    - If trip_id is provided, validates that the trip exists
    - Sets status to "Pending Manager"
    - Records the user who created the expense
    """
    # Validate trip exists if provided
    if expense_in.trip_id:
        trip = session.get(Trip, expense_in.trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")

    # Validate trip_id is required for specific categories - Story 2.2
    trip_related_categories = [
        ExpenseCategory.fuel,
        ExpenseCategory.allowance,
        ExpenseCategory.maintenance,
        ExpenseCategory.border
    ]
    if expense_in.category in trip_related_categories and not expense_in.trip_id:
        raise HTTPException(
            status_code=422,
            detail=f"Trip Number is required for {expense_in.category.value} expenses"
        )

    # Create expense
    expense = ExpenseRequest(
        **expense_in.model_dump(),
        created_by_id=current_user.id,
    )
    session.add(expense)
    session.commit()
    session.refresh(expense)
    
    # Emit socket event - Story 2.6
    await sio.emit("expense_created", {"id": str(expense.id), "message": "New Expense Request"})
    
    return expense


@router.patch("/{id}", response_model=ExpenseRequestPublic)
async def update_expense(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    expense_in: ExpenseRequestUpdate,
) -> Any:
    """
    Update an expense.

    - Status changes follow workflow rules based on user role
    - Other fields can only be modified by creator when pending
    """
    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_dict = expense_in.model_dump(exclude_unset=True)

    # Handle status transition separately
    if "status" in update_dict:
        new_status_str = update_dict["status"]
        # Convert string to enum if needed
        if isinstance(new_status_str, str):
            try:
                new_status = ExpenseStatus(new_status_str)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid status value")
        else:
            new_status = new_status_str

        current_status = ExpenseStatus(expense.status) if isinstance(expense.status, str) else expense.status

        if not validate_status_transition(current_status, new_status, current_user.role):
            raise HTTPException(
                status_code=403,
                detail=f"Not authorized to change status from '{current_status.value}' to '{new_status.value}'"
            )
        update_dict["status"] = new_status.value

    # For non-status updates, check modify permission
    non_status_updates = {k: v for k, v in update_dict.items() if k != "status"}
    if non_status_updates:
        if not can_modify_expense(expense, current_user):
            raise HTTPException(
                status_code=403,
                detail="Can only modify expense details when status is 'Pending Manager' and you are the creator"
            )

    # Update the expense
    expense.sqlmodel_update(update_dict)
    expense.updated_at = datetime.now(timezone.utc)
    session.add(expense)
    session.commit()
    session.refresh(expense)
    
    # Emit socket event
    await sio.emit("expense_updated", {"id": str(expense.id), "status": expense.status})
    
    return expense


@router.patch("/{id}/payment", response_model=ExpenseRequestPublic)
async def process_payment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    payment_in: ExpensePayment,
) -> Any:
    """
    Process payment for an expense request - Story 2.4.

    - Only Finance and Admin roles can process payments
    - Expense must be in "Pending Finance" status
    - Transfer method requires a reference number
    - Records payment_method, payment_reference, payment_date, paid_by_id
    """
    # Check role
    if current_user.role not in [UserRole.finance, UserRole.admin]:
        raise HTTPException(
            status_code=403,
            detail="Only Finance officers can process payments",
        )

    # Validate transfer requires reference
    if payment_in.method == PaymentMethod.transfer and not payment_in.reference:
        raise HTTPException(
            status_code=422,
            detail="Reference Number is required for transfers",
        )

    # Fetch expense
    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Validate status
    current_status = ExpenseStatus(expense.status) if isinstance(expense.status, str) else expense.status
    if current_status != ExpenseStatus.pending_finance:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot process payment: expense status is '{current_status.value}', expected 'Pending Finance'",
        )

    # Process payment
    expense.status = ExpenseStatus.paid
    expense.payment_method = payment_in.method
    expense.payment_reference = payment_in.reference
    expense.payment_date = datetime.now(timezone.utc)
    expense.paid_by_id = current_user.id
    expense.updated_at = datetime.now(timezone.utc)

    session.add(expense)
    session.commit()
    session.refresh(expense)
    
    # Emit socket event
    await sio.emit("expense_updated", {"id": str(expense.id), "status": "Paid"})
    
    return expense


@router.delete("/{id}")
def delete_expense(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Message:
    """Delete an expense. Only allowed when status is 'Pending Manager'."""
    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if not can_delete_expense(expense, current_user):
        raise HTTPException(
            status_code=403,
            detail="Can only delete expenses with 'Pending Manager' status"
        )

    session.delete(expense)
    session.commit()
    return Message(message="Expense deleted successfully")
