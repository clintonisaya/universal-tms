"""
Task Aggregation API - Story 4.2: Universal Dashboard To-Do Center
Aggregates pending tasks across all modules for the current user's role.
"""
from typing import Any

from fastapi import APIRouter, Query
from sqlmodel import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ExpenseRequest,
    ExpenseStatus,
    Trip,
    TripStatus,
    UserRole,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


def is_expense_trip_closed(exp: ExpenseRequest) -> bool:
    """Check if the expense's linked trip is in a closed state (Completed/Cancelled)."""
    if not exp.trip:
        return False  # Non-trip expenses are not affected

    trip_status = TripStatus(exp.trip.status) if isinstance(exp.trip.status, str) else exp.trip.status
    return trip_status in [TripStatus.completed, TripStatus.cancelled]


@router.get("/my-tasks")
def get_my_tasks(
    session: SessionDep,
    current_user: CurrentUser,
    task_type: str | None = Query(default=None, description="Filter by task type"),
    sort_by: str | None = Query(default=None, description="Sort field: date, amount"),
    sort_order: str | None = Query(default="desc", description="Sort order: asc, desc"),
) -> dict[str, Any]:
    """
    Aggregate all pending tasks for the current user based on their role.

    - Manager/Admin: Expenses with status 'Pending Manager'
    - Finance: Expenses with status 'Pending Finance' + 'Returned from finance level' (tracking) + own returned expenses (correction)
    - Ops/Finance: Their own expenses with status 'Returned' (for correction/resubmission)
    """
    tasks: list[dict[str, Any]] = []

    role = current_user.role

    # Build queries based on role
    if role in (UserRole.manager, UserRole.admin):
        # Manager sees expenses pending their approval
        query = (
            select(ExpenseRequest)
            .where(ExpenseRequest.status == ExpenseStatus.pending_manager)
            .options(
                selectinload(ExpenseRequest.created_by),
                selectinload(ExpenseRequest.trip),
            )
        )
        if task_type and task_type != "expense_approval":
            # If filtering by a different type, skip this query
            pass
        else:
            expenses = session.exec(query).all()
            for exp in expenses:
                # Skip expenses for closed trips
                if is_expense_trip_closed(exp):
                    continue
                tasks.append(_expense_to_task(exp, "expense_approval", ["approve", "reject", "return"]))

    if role in (UserRole.finance, UserRole.admin):
        # Finance sees expenses pending payment
        query = (
            select(ExpenseRequest)
            .where(ExpenseRequest.status == ExpenseStatus.pending_finance)
            .options(
                selectinload(ExpenseRequest.created_by),
                selectinload(ExpenseRequest.trip),
            )
        )
        if task_type and task_type != "payment_processing":
            pass
        else:
            expenses = session.exec(query).all()
            for exp in expenses:
                # Skip expenses for closed trips
                if is_expense_trip_closed(exp):
                    continue
                tasks.append(_expense_to_task(exp, "payment_processing", ["pay", "return"]))

    if role == UserRole.finance:
        # Finance tracks returned expenses that previously reached finance level.
        # approved_by_id is only set when manager approves (pending_manager → pending_finance),
        # so approved_by_id IS NOT NULL means the expense was returned BY finance, not by manager.
        returned_query = (
            select(ExpenseRequest)
            .where(ExpenseRequest.status == ExpenseStatus.returned)
            .where(ExpenseRequest.approved_by_id.isnot(None))
            .options(
                selectinload(ExpenseRequest.created_by),
                selectinload(ExpenseRequest.trip),
            )
        )
        if not task_type or task_type == "payment_processing":
            returned_expenses = session.exec(returned_query).all()
            for exp in returned_expenses:
                if is_expense_trip_closed(exp):
                    continue
                tasks.append(_expense_to_task(exp, "payment_processing", []))

    if role in (UserRole.ops, UserRole.finance, UserRole.admin):
        # Ops/Finance see returned expenses they created so they can correct and resubmit
        query = (
            select(ExpenseRequest)
            .where(
                ExpenseRequest.created_by_id == current_user.id,
                ExpenseRequest.status == ExpenseStatus.returned.value,
            )
            .options(
                selectinload(ExpenseRequest.created_by),
                selectinload(ExpenseRequest.trip),
            )
        )
        if task_type and task_type != "expense_correction":
            pass
        else:
            expenses = session.exec(query).all()
            for exp in expenses:
                # Skip expenses for closed trips
                if is_expense_trip_closed(exp):
                    continue
                tasks.append(_expense_to_task(exp, "expense_correction", ["submit", "reject"]))

    # Apply task_type filter (already handled above via skip logic)
    if task_type:
        tasks = [t for t in tasks if t["task_type"] == task_type]

    # Sorting
    if sort_by == "amount":
        tasks.sort(
            key=lambda t: t.get("amount", 0) or 0,
            reverse=(sort_order != "asc"),
        )
    else:
        # Default sort by date (newest first)
        tasks.sort(
            key=lambda t: t.get("created_at", "") or "",
            reverse=(sort_order != "asc"),
        )

    return {
        "total": len(tasks),
        "tasks": tasks,
    }


def _expense_to_task(
    exp: ExpenseRequest,
    task_type: str,
    actions: list[str],
) -> dict[str, Any]:
    """Convert an ExpenseRequest to a unified task dict."""
    requester_name = ""
    if exp.created_by:
        requester_name = exp.created_by.full_name or exp.created_by.username

    trip_number = ""
    if exp.trip:
        trip_number = exp.trip.trip_number

    return {
        "id": str(exp.id),
        "task_type": task_type,
        "entity_type": "expense",
        "requester": requester_name,
        "amount": float(exp.amount) if exp.amount else 0,
        "currency": exp.currency or "TZS",
        "expense_type": exp.category if isinstance(exp.category, str) else (exp.category.value if exp.category else ""),
        "description": exp.description or "",
        "status": exp.status if isinstance(exp.status, str) else (exp.status.value if exp.status else ""),
        "trip_number": trip_number,
        "expense_number": exp.expense_number or "",
        "manager_comment": exp.manager_comment or "",
        "created_at": exp.created_at.isoformat() if exp.created_at else "",
        "actions": actions,
    }
