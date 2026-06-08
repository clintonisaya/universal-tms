"""
Expense Request Submission - Story 2.2
CRUD endpoints for expense management with RBAC and status workflow.

Routes are HTTP adapters.  Business rules live in app.modules.expense_request.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import selectinload
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep, assert_user_has_permission
from app.core.db import commit_or_rollback
from app.core.socket import sio
from app.core.storage import storage
from app.modules.documents import (
    EXPENSE_ATTACHMENT_POLICY,
    DocumentError,
    enrich_attachment_urls,
    generate_storage_key,
    validate_attachment,
)
from app.models import (
    ExpenseBulkUpdate,
    ExpenseCategory,
    ExpensePayment,
    ExpenseRequest,
    ExpenseRequestCreate,
    ExpenseRequestPublic,
    ExpenseRequestPublicDetailed,
    ExpenseRequestsPublic,
    ExpenseRequestUpdate,
    ExpenseStatus,
    Message,
    Trip,
    UserRole,
)
from app.modules.expense_request import (
    ExpenseCreatedEvent,
    ExpenseError,
    ExpensePaymentProcessedEvent,
    ExpenseStatusChangedEvent,
    ExpenseTaskUpdatedEvent,
    InvalidPaymentError,
    InvalidStatusTransitionError,
    TripClosedError,
    assert_trip_id_required,
    assert_trip_not_closed,
    can_delete_attachment,
    can_delete_expense,
    can_modify_expense,
    can_upload_attachment,
    can_view_expense,
    generate_expense_number,
    plan_batch_status_change,
    plan_payment,
    plan_status_change,
)
from app.modules.permissions import Permission, has_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/expenses", tags=["expenses"])


# ---------------------------------------------------------------------------
# Event emission adapter
# ---------------------------------------------------------------------------

async def _emit_events(events: list) -> None:
    """Translate domain events into Socket.IO emissions."""
    for event in events:
        if isinstance(event, ExpenseCreatedEvent):
            await sio.emit("expense_created", {"id": event.expense_id, "message": "New Expense Request"})
            await sio.emit("task_created", {
                "task_type": event.task_type,
                "target_role": event.target_role,
                "id": event.expense_id,
            })
        elif isinstance(event, ExpenseStatusChangedEvent):
            if event.is_batch:
                await sio.emit("expense_updated", {"count": event.count, "message": "Batch update processed"})
            else:
                await sio.emit("expense_updated", {"id": event.expense_id, "status": event.new_status})
        elif isinstance(event, ExpenseTaskUpdatedEvent):
            await sio.emit("task_updated", {
                "id": event.expense_id,
                "new_status": event.new_status,
            })
        elif isinstance(event, ExpensePaymentProcessedEvent):
            await sio.emit("expense_updated", {"id": event.expense_id, "status": "Paid"})
            await sio.emit("task_updated", {"id": event.expense_id, "new_status": "Paid"})


# ---------------------------------------------------------------------------
# Error mapping
# ---------------------------------------------------------------------------

def _map_error(err: ExpenseError) -> HTTPException:
    """Convert domain errors to HTTP exceptions."""
    if isinstance(err, TripClosedError):
        return HTTPException(status_code=400, detail=err.detail)
    if isinstance(err, InvalidStatusTransitionError):
        return HTTPException(status_code=403, detail=err.detail)
    if isinstance(err, InvalidPaymentError):
        return HTTPException(status_code=422, detail=err.detail)
    return HTTPException(status_code=400, detail=err.detail)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=ExpenseRequestsPublic)
def read_expenses(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
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
        from sqlalchemy import or_
        query = query.where(
            or_(
                ExpenseRequest.trip_id.isnot(None),
                ExpenseRequest.created_by_id == current_user.id,
            )
        )

    # Count total matching records
    count_query = select(func.count()).select_from(query.subquery())
    count = session.exec(count_query).one()

    # Apply pagination and ordering
    query = (
        query.order_by(ExpenseRequest.created_at.desc())
        .offset(skip)
        .limit(limit)
        .options(
            selectinload(ExpenseRequest.created_by),
            selectinload(ExpenseRequest.trip),
            selectinload(ExpenseRequest.paid_by),
            selectinload(ExpenseRequest.approved_by),
            selectinload(ExpenseRequest.voided_by),
        )
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

    if not can_view_expense(expense, current_user.role, current_user.id):
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
    Delegates transition validation to the Expense Request module.
    """
    # Fetch all expenses
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

    try:
        plan = plan_batch_status_change(
            expenses=expenses,
            new_status=bulk_in.status,
            user_role=current_user.role,
            user_id=current_user.id,
            comment=bulk_in.comment,
        )
    except InvalidStatusTransitionError as exc:
        raise _map_error(exc)

    commit_or_rollback(session)
    await _emit_events(plan.events)

    return Message(message=f"Successfully updated {plan.updated_count} expenses")


@router.post("", response_model=ExpenseRequestPublic)
async def create_expense(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    expense_in: ExpenseRequestCreate,
) -> Any:
    """
    Create a new expense request.

    - Validates trip exists and is not closed
    - Validates trip_id is required for trip-related categories
    - Generates expense number
    - Sets status to Pending Manager
    """
    # Validate trip
    trip = None
    if expense_in.trip_id:
        trip = session.get(Trip, expense_in.trip_id)
        if trip is None:
            raise HTTPException(status_code=404, detail="Trip not found")
        try:
            assert_trip_not_closed(trip)
        except TripClosedError as exc:
            raise _map_error(exc)

    # Validate category requires trip
    try:
        assert_trip_id_required(expense_in.category, expense_in.trip_id)
    except ExpenseError as exc:
        raise HTTPException(status_code=422, detail=exc.detail)

    # Generate expense number
    trip_number = trip.trip_number if trip else None
    expense_number = generate_expense_number(session, expense_in.trip_id, trip_number)

    # Create expense
    expense = ExpenseRequest(
        **expense_in.model_dump(),
        expense_number=expense_number,
        created_by_id=current_user.id,
    )
    session.add(expense)
    commit_or_rollback(session)
    session.refresh(expense)

    # Emit domain events
    await _emit_events([ExpenseCreatedEvent(expense_id=str(expense.id))])

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

    - Status changes delegate to the module's plan_status_change
    - Non-status fields checked via can_modify_expense
    - Cannot modify expenses for completed/cancelled trips
    """
    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_dict = expense_in.model_dump(exclude_unset=True)

    # Handle status transition
    if "status" in update_dict:
        new_status_str = update_dict.pop("status")
        if isinstance(new_status_str, str):
            try:
                new_status = ExpenseStatus(new_status_str)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid status value")
        else:
            new_status = new_status_str

        try:
            plan = plan_status_change(
                expense=expense,
                new_status=new_status,
                user_role=current_user.role,
                user_id=current_user.id,
            )
        except InvalidStatusTransitionError as exc:
            raise _map_error(exc)

        # Apply remaining non-status field updates
        if update_dict:
            if not can_modify_expense(expense, current_user.role, current_user.id):
                raise HTTPException(
                    status_code=403,
                    detail="Can only modify expense details when status is 'Pending Manager' and you are the creator"
                )
            expense.sqlmodel_update(update_dict)
            expense.updated_at = datetime.now(timezone.utc)
            expense.updated_by_id = current_user.id

        session.add(expense)
        commit_or_rollback(session)
        session.refresh(expense)
        await _emit_events(plan.events)
        return expense

    # Non-status updates only
    if update_dict:
        if not can_modify_expense(expense, current_user.role, current_user.id):
            raise HTTPException(
                status_code=403,
                detail="Can only modify expense details when status is 'Pending Manager' and you are the creator"
            )

    expense.sqlmodel_update(update_dict)
    expense.updated_at = datetime.now(timezone.utc)
    expense.updated_by_id = current_user.id
    session.add(expense)
    commit_or_rollback(session)
    session.refresh(expense)

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

    Delegates validation and state mutation to the module.
    """
    assert_user_has_permission(
        current_user,
        Permission.EXPENSES_PAY,
        detail="Only Finance officers can process payments",
    )

    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    try:
        plan = plan_payment(
            expense=expense,
            method=payment_in.method,
            reference=payment_in.reference,
            user_id=current_user.id,
            bank_name=payment_in.bank_name,
            account_name=payment_in.account_name,
            account_no=payment_in.account_no,
        )
    except (InvalidPaymentError, InvalidStatusTransitionError) as exc:
        raise _map_error(exc)

    session.add(expense)
    commit_or_rollback(session)
    session.refresh(expense)
    await _emit_events(plan.events)

    return expense


@router.post("/{id}/attachment", response_model=ExpenseRequestPublic)
async def upload_attachment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    file: UploadFile = File(...),
) -> Any:
    """
    Upload an attachment for an expense request.

    - Validates expense exists and user can modify it
    - Generates unique filename to prevent overwrites
    - Uploads to storage
    - Updates attachments list in database
    """
    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if not has_permission(current_user, Permission.EXPENSES_AMEND_ATTACHMENT) \
            and not can_upload_attachment(expense, current_user.role, current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Can only add attachments when status is 'Pending Manager' and you are the creator"
        )

    # Validate file type and size against expense policy
    content = await file.read()
    try:
        validate_attachment(file.content_type, len(content), EXPENSE_ATTACHMENT_POLICY)
    except DocumentError as e:
        raise HTTPException(status_code=400, detail=e.detail)

    # Generate unique storage key and upload
    object_name = generate_storage_key("expenses", expense.id, file.filename)
    uploaded_key = storage.upload_file(content, object_name, file.content_type)
    if not uploaded_key:
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    # Append to attachments list
    current_attachments = list(expense.attachments) if expense.attachments else []
    current_attachments.append(uploaded_key)
    expense.attachments = current_attachments
    expense.updated_at = datetime.now(timezone.utc)

    session.add(expense)
    commit_or_rollback(session)
    session.refresh(expense)

    return expense


@router.get("/{id}/attachments")
def get_attachment_urls(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """
    Get presigned URLs for all attachments of an expense.
    Returns a list of objects with key, filename, and url.
    """
    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if not can_view_expense(expense, current_user.role, current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view this expense")

    return enrich_attachment_urls(expense.attachments or [], storage)


@router.delete("/{id}/attachment", status_code=204)
def delete_attachment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    key: str = Query(..., description="Object key of the attachment to delete"),
) -> None:
    """
    Delete a specific attachment from an expense.
    Removes from storage and updates the database.
    """
    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if not has_permission(current_user, Permission.EXPENSES_AMEND_ATTACHMENT) \
            and not can_delete_attachment(expense, current_user.role, current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Can only remove attachments when status is 'Pending Manager' and you are the creator"
        )

    current_attachments = list(expense.attachments) if expense.attachments else []
    if key not in current_attachments:
        raise HTTPException(status_code=404, detail="Attachment not found")

    storage.delete_file(key)
    current_attachments.remove(key)
    expense.attachments = current_attachments
    expense.updated_at = datetime.now(timezone.utc)
    session.add(expense)
    commit_or_rollback(session)


@router.delete("/{id}", status_code=204)
def delete_expense(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> None:
    """Delete an expense. Only allowed when status is 'Pending Manager' and trip is not closed."""
    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Check trip closed
    if expense.trip_id:
        trip = session.get(Trip, expense.trip_id)
        try:
            assert_trip_not_closed(trip)
        except TripClosedError as exc:
            raise _map_error(exc)

    if not can_delete_expense(expense, current_user.role, current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Can only delete expenses with 'Pending Manager' status"
        )

    session.delete(expense)
    commit_or_rollback(session)
