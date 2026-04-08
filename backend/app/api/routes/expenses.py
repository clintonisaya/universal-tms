"""
Expense Request Submission - Story 2.2
CRUD endpoints for expense management with RBAC and status workflow.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from sqlalchemy import text
from sqlmodel import func, select
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
from app.core.socket import sio
from app.core.storage import storage
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
    TripStatus,
    UserRole,
)

router = APIRouter(prefix="/expenses", tags=["expenses"])


def generate_expense_number(session: SessionDep, trip_id: uuid.UUID | None, trip: Trip | None) -> str:
    """Generate a human-readable expense number.

    Trip expenses:     E{trip_number}-{seq:03d}  (e.g. ET512EZD-2026001-001)
    Non-trip expenses: EX-{YYYY}-{seq:04d}      (e.g. EX-2026-0001)
    """
    if trip_id and trip:
        # Acquire advisory lock per-trip to prevent duplicate sequence numbers
        session.execute(text("SELECT pg_advisory_xact_lock(1003)"))
        count_stmt = select(func.count()).select_from(ExpenseRequest).where(ExpenseRequest.trip_id == trip_id)
        existing_count = session.exec(count_stmt).one()
        seq = existing_count + 1
        return f"E{trip.trip_number}-{seq:03d}"
    else:
        # Non-trip (Office): EX-YYYY-SEQ
        year = datetime.now().year
        # Acquire advisory lock to prevent concurrent office expense number collision
        session.execute(text("SELECT pg_advisory_xact_lock(1004)"))
        pattern = f"EX-{year}-%"
        last_stmt = (
            select(ExpenseRequest.expense_number)
            .where(ExpenseRequest.expense_number.like(pattern))
            .order_by(ExpenseRequest.expense_number.desc())
            .limit(1)
        )
        last_number = session.exec(last_stmt).first()
        seq = 1
        if last_number:
            try:
                last_seq = int(last_number.split("-")[-1])
                seq = last_seq + 1
            except ValueError:
                logger.error("Failed to parse last office expense number: %s", last_number)
        return f"EX-{year}-{seq:04d}"

# Valid status transitions by role
# Format: {current_status: {role: [allowed_new_statuses]}}
STATUS_TRANSITIONS = {
    # Pending Manager: manager/admin can approve, reject, or return — NOT void.
    # Voided is reserved for post-approval cancellations (Pending Finance / Paid).
    ExpenseStatus.pending_manager: {
        UserRole.manager: [ExpenseStatus.pending_finance, ExpenseStatus.rejected, ExpenseStatus.returned],
        UserRole.admin: [ExpenseStatus.pending_finance, ExpenseStatus.rejected, ExpenseStatus.returned],
    },
    ExpenseStatus.pending_finance: {
        UserRole.finance: [ExpenseStatus.paid, ExpenseStatus.returned, ExpenseStatus.voided],
        UserRole.manager: [ExpenseStatus.voided],
        UserRole.admin: [ExpenseStatus.paid, ExpenseStatus.returned, ExpenseStatus.voided],
    },
    ExpenseStatus.paid: {
        UserRole.finance: [ExpenseStatus.voided],
        UserRole.manager: [ExpenseStatus.voided],
        UserRole.admin: [ExpenseStatus.voided],
    },
    ExpenseStatus.returned: {
        UserRole.ops: [ExpenseStatus.pending_manager],  # Resubmit after correction
        UserRole.finance: [ExpenseStatus.pending_manager, ExpenseStatus.voided],  # Finance can resubmit their own returned expenses
        UserRole.manager: [ExpenseStatus.pending_manager, ExpenseStatus.voided],
        UserRole.admin: [ExpenseStatus.pending_manager, ExpenseStatus.voided],
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
    # Finance can view all expenses (full visibility for processing and tracking)
    if user.role == UserRole.finance:
        return True
    # Ops can only view their own
    return expense.created_by_id == user.id


def can_modify_expense(expense: ExpenseRequest, user: Any) -> bool:
    """Check if user can modify this expense (amount, description, category)."""
    # Creator can modify when pending manager OR when returned (for corrections)
    allowed_statuses = [ExpenseStatus.pending_manager, ExpenseStatus.returned]
    current_status = ExpenseStatus(expense.status) if isinstance(expense.status, str) else expense.status
    if current_status not in allowed_statuses:
        return False
    return expense.created_by_id == user.id or user.role == UserRole.admin


def can_delete_expense(expense: ExpenseRequest, user: Any) -> bool:
    """Check if user can delete this expense."""
    # Can only delete when pending manager
    if expense.status != ExpenseStatus.pending_manager:
        return False
    # Only creator or admin can delete
    return expense.created_by_id == user.id or user.role == UserRole.admin


def is_trip_closed(trip: Trip | None) -> bool:
    """Check if a trip is in a closed state (Completed or Cancelled).

    When a trip is closed, no expense modifications should be allowed.
    """
    if trip is None:
        return False  # Non-trip expenses (office expenses) are not affected

    trip_status = TripStatus(trip.status) if isinstance(trip.status, str) else trip.status
    closed_statuses = [TripStatus.completed, TripStatus.cancelled]
    return trip_status in closed_statuses


def check_trip_not_closed(session: SessionDep, trip_id: uuid.UUID | None) -> Trip | None:
    """Fetch trip and verify it's not closed. Raises HTTPException if closed.

    Returns the trip object if valid, or None if trip_id is None.
    """
    if trip_id is None:
        return None

    trip = session.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")

    if is_trip_closed(trip):
        trip_status = trip.status.value if hasattr(trip.status, "value") else str(trip.status)
        raise HTTPException(
            status_code=400,
            detail=f"Cannot modify expenses: Trip {trip.trip_number} is {trip_status}. "
                   f"No expense changes allowed on completed or cancelled trips."
        )

    return trip


@router.get("", response_model=ExpenseRequestsPublic)
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
        # Trip expenses: all ops users see all (shared visibility across the team)
        # Office expenses: each ops user sees only their own
        from sqlalchemy import or_
        query = query.where(
            or_(
                ExpenseRequest.trip_id.isnot(None),          # any trip expense → visible to all ops
                ExpenseRequest.created_by_id == current_user.id,  # own office expenses
            )
        )
    # Finance, Manager, Admin can see all expense records regardless of status

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
        if bulk_in.status == ExpenseStatus.voided:
            # Void reason is stored separately to preserve any manager approval remark
            if bulk_in.comment:
                expense.void_reason = bulk_in.comment
            expense.voided_by_id = current_user.id
            expense.voided_at = datetime.now(timezone.utc)
        else:
            if bulk_in.comment:
                expense.manager_comment = bulk_in.comment
            # Record approver when moving to Pending Finance (manager approval)
            if bulk_in.status == ExpenseStatus.pending_finance:
                expense.approved_by_id = current_user.id
                expense.approved_at = datetime.now(timezone.utc)
            # Story 6.24: Record when expense is returned for revision
            if bulk_in.status == ExpenseStatus.returned:
                expense.returned_at = datetime.now(timezone.utc)
        expense.updated_at = datetime.now(timezone.utc)
        expense.updated_by_id = current_user.id  # Story 6.13: audit trail
        session.add(expense)
        updated_count += 1

    commit_or_rollback(session)

    # Emit socket event
    await sio.emit("expense_updated", {"count": updated_count, "message": "Batch update processed"})

    # Story 4.2: Notify to-do list updates
    await sio.emit("task_updated", {
        "target_status": bulk_in.status.value,
        "count": updated_count,
    })

    return Message(message=f"Successfully updated {updated_count} expenses")


@router.post("", response_model=ExpenseRequestPublic)
async def create_expense(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    expense_in: ExpenseRequestCreate,
) -> Any:
    """
    Create a new expense request.

    - If trip_id is provided, validates that the trip exists and is not closed
    - Sets status to "Pending Manager"
    - Records the user who created the expense
    """
    # Validate trip exists and is not closed (Completed/Cancelled)
    trip = check_trip_not_closed(session, expense_in.trip_id)

    # Validate trip_id is required for specific categories - Story 2.2 & 2.22
    # Trip expenses must always link to a trip. Office expenses do not.
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

    # Generate expense number - Story 2.17
    expense_number = generate_expense_number(session, expense_in.trip_id, trip)

    # Create expense
    expense = ExpenseRequest(
        **expense_in.model_dump(),
        expense_number=expense_number,
        created_by_id=current_user.id,
    )
    session.add(expense)
    commit_or_rollback(session)
    session.refresh(expense)
    
    # Emit socket event - Story 2.6
    await sio.emit("expense_created", {"id": str(expense.id), "message": "New Expense Request"})

    # Story 4.2: Notify to-do list update for managers
    await sio.emit("task_created", {
        "task_type": "expense_approval",
        "target_role": "manager",
        "id": str(expense.id),
    })

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
    - Cannot modify expenses for completed/cancelled trips
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
        # Record approver when manager moves expense to Pending Finance
        if new_status == ExpenseStatus.pending_finance:
            update_dict["approved_by_id"] = str(current_user.id)
            update_dict["approved_at"] = datetime.now(timezone.utc)

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
    expense.updated_by_id = current_user.id  # Story 6.13: audit trail
    session.add(expense)
    commit_or_rollback(session)
    session.refresh(expense)
    
    # Emit socket event
    await sio.emit("expense_updated", {"id": str(expense.id), "status": expense.status})

    # Story 4.2: Notify to-do list updates
    await sio.emit("task_updated", {
        "id": str(expense.id),
        "new_status": expense.status if isinstance(expense.status, str) else expense.status.value,
    })

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
    
    # Update bank details in metadata if provided (for any payment method)
    if payment_in.bank_name or payment_in.account_name or payment_in.account_no:
        current_metadata = dict(expense.expense_metadata) if expense.expense_metadata else {}
        bank_details = current_metadata.get("bank_details", {})

        if payment_in.bank_name:
            bank_details["bank_name"] = payment_in.bank_name
        if payment_in.account_name:
            bank_details["account_name"] = payment_in.account_name
        if payment_in.account_no:
            bank_details["account_no"] = payment_in.account_no

        current_metadata["bank_details"] = bank_details
        expense.expense_metadata = current_metadata

    expense.updated_at = datetime.now(timezone.utc)

    session.add(expense)
    commit_or_rollback(session)
    session.refresh(expense)
    
    # Emit socket event
    await sio.emit("expense_updated", {"id": str(expense.id), "status": "Paid"})

    # Story 4.2: Notify to-do list - task removed from finance queue
    await sio.emit("task_updated", {
        "id": str(expense.id),
        "new_status": "Paid",
    })

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
    - Uploads to Cloudflare R2
    - Updates attachment_url in database
    """
    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Admin/Manager can amend attachments on any expense (Expense Console use case).
    # Regular users (ops, finance) can only upload when status allows modification.
    AMEND_ROLES = {UserRole.admin, UserRole.manager}
    if current_user.role not in AMEND_ROLES and not can_modify_expense(expense, current_user):
        raise HTTPException(
            status_code=403,
            detail="Can only add attachments when status is 'Pending Manager' and you are the creator"
        )
    
    # Generate unique filename: expense_id/uuid_filename (prevents overwrites)
    unique_id = uuid.uuid4().hex[:8]
    clean_filename = file.filename.replace(" ", "_") if file.filename else "attachment"
    object_name = f"expenses/{expense.id}/{unique_id}_{clean_filename}"

    # Validate file size (max 3MB)
    content = await file.read()
    max_size = 3 * 1024 * 1024  # 3MB
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File size exceeds 3MB limit")

    # Validate file type
    allowed_types = [
        "application/pdf",
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' not allowed. Supported: PDF, images, Word documents."
        )

    # Upload to R2
    uploaded_key = storage.upload_file(content, object_name, file.content_type)
    
    if not uploaded_key:
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")
        
    # Construct URL (assuming public access or using R2 dev URL)
    # For private buckets, we might want to store the key and generate presigned URLs on read.
    # Here we store the key as the URL reference or the full public URL if configured.
    # Given the requirements, I'll store the key/path.
    
    # Append to attachments list (create new list to trigger change detection)
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

    if not can_view_expense(expense, current_user):
        raise HTTPException(status_code=403, detail="Not authorized to view this expense")

    attachments = expense.attachments or []
    result = []
    for key in attachments:
        url = storage.get_presigned_url(key, expiration=3600)
        # Extract readable filename from the key
        filename = key.split("/")[-1] if "/" in key else key
        # Strip the 8-char hex prefix added during upload (e.g. "a1b2c3d4_myfile.pdf")
        if len(filename) > 9 and filename[8] == "_":
            filename = filename[9:]
        result.append({"key": key, "filename": filename, "url": url})

    return result


@router.delete("/{id}/attachment")
def delete_attachment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    key: str = Query(..., description="Object key of the attachment to delete"),
) -> Message:
    """
    Delete a specific attachment from an expense.
    Removes from R2 storage and updates the database.
    """
    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    AMEND_ROLES = {UserRole.admin, UserRole.manager}
    if current_user.role not in AMEND_ROLES and not can_modify_expense(expense, current_user):
        raise HTTPException(
            status_code=403,
            detail="Can only remove attachments when status is 'Pending Manager' and you are the creator"
        )

    current_attachments = list(expense.attachments) if expense.attachments else []
    if key not in current_attachments:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Delete from R2
    storage.delete_file(key)

    # Remove from database
    current_attachments.remove(key)
    expense.attachments = current_attachments
    expense.updated_at = datetime.now(timezone.utc)
    session.add(expense)
    commit_or_rollback(session)

    return Message(message="Attachment deleted successfully")


@router.delete("/{id}")
def delete_expense(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Message:
    """Delete an expense. Only allowed when status is 'Pending Manager' and trip is not closed."""
    expense = session.get(ExpenseRequest, id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Check if associated trip is closed (Completed/Cancelled)
    if expense.trip_id:
        check_trip_not_closed(session, expense.trip_id)

    if not can_delete_expense(expense, current_user):
        raise HTTPException(
            status_code=403,
            detail="Can only delete expenses with 'Pending Manager' status"
        )

    session.delete(expense)
    commit_or_rollback(session)
    return Message(message="Expense deleted successfully")
