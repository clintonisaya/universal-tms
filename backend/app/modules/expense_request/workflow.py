"""Expense Request workflow rules.

Owns status transitions, role-based policy, trip-closed checks, and domain
events.  Route adapters call these functions and translate the returned events
into Socket.IO emissions and HTTP responses.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.models import (
    ExpenseCategory,
    ExpenseRequest,
    ExpenseStatus,
    PaymentMethod,
    Trip,
    TripStatus,
    UserRole,
)

# ---------------------------------------------------------------------------
# Error types
# ---------------------------------------------------------------------------

class ExpenseError(ValueError):
    """Base error for expense workflow violations."""
    detail: str

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class InvalidStatusTransitionError(ExpenseError):
    """Raised when a status transition is not allowed for the user's role."""


class PermissionDeniedError(ExpenseError):
    """Raised when the user lacks permission for the requested action."""


class TripClosedError(ExpenseError):
    """Raised when an expense modification targets a closed trip."""


class InvalidPaymentError(ExpenseError):
    """Raised when a payment request is invalid (e.g. missing reference)."""


class ExpenseNotFoundError(ExpenseError):
    """Raised when the expense does not exist."""


# ---------------------------------------------------------------------------
# Status transitions
# ---------------------------------------------------------------------------

# {current_status: {role: [allowed_new_statuses]}}
STATUS_TRANSITIONS: dict[ExpenseStatus, dict[UserRole, list[ExpenseStatus]]] = {
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
        UserRole.ops: [ExpenseStatus.pending_manager],
        UserRole.finance: [ExpenseStatus.pending_manager, ExpenseStatus.voided],
        UserRole.manager: [ExpenseStatus.pending_finance, ExpenseStatus.voided],
        UserRole.admin: [ExpenseStatus.pending_manager, ExpenseStatus.voided],
    },
}


def validate_status_transition(
    current_status: ExpenseStatus,
    new_status: ExpenseStatus,
    user_role: UserRole,
) -> None:
    """Raise InvalidStatusTransitionError if the transition is not allowed.

    Returns silently when the transition is valid (including no-op).
    """
    if current_status == new_status:
        return  # No change — always allowed

    allowed_map = STATUS_TRANSITIONS.get(current_status, {})
    allowed_statuses = allowed_map.get(user_role, [])
    if new_status not in allowed_statuses:
        raise InvalidStatusTransitionError(
            f"Not authorized to change status from '{current_status.value}' "
            f"to '{new_status.value}' as {user_role.value}"
        )


def is_transition_allowed(
    current_status: ExpenseStatus,
    new_status: ExpenseStatus,
    user_role: UserRole,
) -> bool:
    """Check without raising — returns True/False."""
    try:
        validate_status_transition(current_status, new_status, user_role)
        return True
    except InvalidStatusTransitionError:
        return False


# ---------------------------------------------------------------------------
# Role-based policy
# ---------------------------------------------------------------------------

def can_view_expense(expense: ExpenseRequest, user_role: UserRole, user_id: Any) -> bool:
    """Determine whether the user may view this expense."""
    if user_role in (UserRole.admin, UserRole.manager, UserRole.finance):
        return True
    # Ops can only view their own
    return expense.created_by_id == user_id


def can_modify_expense(expense: ExpenseRequest, user_role: UserRole, user_id: Any) -> bool:
    """Determine whether the user may modify expense details (amount, desc, category).

    Allowed when status is pending_manager or returned AND the user is the creator
    or an admin.
    """
    current_status = _coerce_status(expense.status)
    if current_status not in (ExpenseStatus.pending_manager, ExpenseStatus.returned):
        return False
    return expense.created_by_id == user_id or user_role == UserRole.admin


def can_delete_expense(expense: ExpenseRequest, user_role: UserRole, user_id: Any) -> bool:
    """Determine whether the user may delete this expense."""
    if expense.status != ExpenseStatus.pending_manager:
        return False
    return expense.created_by_id == user_id or user_role == UserRole.admin


def can_upload_attachment(expense: ExpenseRequest, user_role: UserRole, user_id: Any) -> bool:
    """Determine whether the user may upload an attachment.

    Admin/finance with EXPENSES_AMEND_ATTACHMENT can always upload.
    Otherwise follow can_modify rules.
    """
    if user_role in (UserRole.admin, UserRole.finance):
        return True
    return can_modify_expense(expense, user_role, user_id)


def can_delete_attachment(expense: ExpenseRequest, user_role: UserRole, user_id: Any) -> bool:
    """Same rules as upload."""
    return can_upload_attachment(expense, user_role, user_id)


# ---------------------------------------------------------------------------
# Trip-closed checks
# ---------------------------------------------------------------------------

_TRIP_CLOSED_STATUSES = {TripStatus.completed, TripStatus.cancelled}


def is_trip_closed(trip: Trip | None) -> bool:
    """True when the trip is completed or cancelled."""
    if trip is None:
        return False
    trip_status = _coerce_trip_status(trip.status)
    return trip_status in _TRIP_CLOSED_STATUSES


def assert_trip_not_closed(trip: Trip | None) -> None:
    """Raise TripClosedError if the trip is closed and the expense window is shut.

    Returns silently when trip is None (office expense) or open.
    """
    if trip is None:
        return
    if is_trip_closed(trip) and not trip.expense_window_open:
        trip_status = trip.status.value if hasattr(trip.status, "value") else str(trip.status)
        raise TripClosedError(
            f"Cannot modify expenses: Trip {trip.trip_number} is {trip_status}. "
            f"No expense changes allowed on completed or cancelled trips."
        )


# ---------------------------------------------------------------------------
# Trip-expense category validation
# ---------------------------------------------------------------------------

TRIP_RELATED_CATEGORIES = frozenset({
    ExpenseCategory.fuel,
    ExpenseCategory.allowance,
    ExpenseCategory.maintenance,
    ExpenseCategory.border,
})


def assert_trip_id_required(category: ExpenseCategory, trip_id: Any | None) -> None:
    """Raise if a trip-related category is submitted without a trip_id."""
    if category in TRIP_RELATED_CATEGORIES and not trip_id:
        raise ExpenseError(
            f"Trip Number is required for {category.value} expenses"
        )


# ---------------------------------------------------------------------------
# Payment validation
# ---------------------------------------------------------------------------

def assert_payment_valid(method: PaymentMethod, reference: str | None) -> None:
    """Raise InvalidPaymentError when a transfer has no reference."""
    if method == PaymentMethod.transfer and not reference:
        raise InvalidPaymentError("Reference Number is required for transfers")


# ---------------------------------------------------------------------------
# Domain events
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ExpenseCreatedEvent:
    expense_id: str
    task_type: str = "expense_approval"
    target_role: str = "manager"


@dataclass(frozen=True)
class ExpenseStatusChangedEvent:
    expense_id: str
    new_status: str
    count: int = 1
    is_batch: bool = False


@dataclass(frozen=True)
class ExpenseTaskUpdatedEvent:
    expense_id: str
    new_status: str


@dataclass(frozen=True)
class ExpensePaymentProcessedEvent:
    expense_id: str


@dataclass(frozen=True)
class ExpenseDeletedEvent:
    expense_id: str


@dataclass(frozen=True)
class ExpenseAttachmentUploadedEvent:
    expense_id: str


@dataclass(frozen=True)
class ExpenseAttachmentDeletedEvent:
    expense_id: str


# Union type for all expense events
ExpenseEvent = (
    ExpenseCreatedEvent
    | ExpenseStatusChangedEvent
    | ExpenseTaskUpdatedEvent
    | ExpensePaymentProcessedEvent
    | ExpenseDeletedEvent
    | ExpenseAttachmentUploadedEvent
    | ExpenseAttachmentDeletedEvent
)


# ---------------------------------------------------------------------------
# Workflow operations — return events, side effects happen in the adapter
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class StatusChangePlan:
    """Result of planning a single expense status change."""
    expense: ExpenseRequest
    new_status: ExpenseStatus
    events: list[ExpenseEvent] = field(default_factory=list)


def plan_status_change(
    expense: ExpenseRequest,
    new_status: ExpenseStatus,
    user_role: UserRole,
    user_id: Any,
    comment: str | None = None,
    now: datetime | None = None,
) -> StatusChangePlan:
    """Validate and apply a status transition to an expense.

    Returns a StatusChangePlan with the mutated expense and domain events.
    Raises InvalidStatusTransitionError on bad transitions.
    """
    current_status = _coerce_status(expense.status)
    validate_status_transition(current_status, new_status, user_role)

    ts = now or datetime.now(timezone.utc)
    events: list[ExpenseEvent] = []

    expense.status = new_status

    if new_status == ExpenseStatus.voided:
        if comment:
            expense.void_reason = comment
        expense.voided_by_id = user_id
        expense.voided_at = ts
    else:
        if comment:
            expense.manager_comment = comment
        if new_status == ExpenseStatus.pending_finance:
            expense.approved_by_id = user_id
            expense.approved_at = ts
        if new_status == ExpenseStatus.returned:
            expense.returned_at = ts

    expense.updated_at = ts
    expense.updated_by_id = user_id

    events.append(ExpenseStatusChangedEvent(
        expense_id=str(expense.id),
        new_status=new_status.value,
    ))
    events.append(ExpenseTaskUpdatedEvent(
        expense_id=str(expense.id),
        new_status=new_status.value,
    ))

    return StatusChangePlan(expense=expense, new_status=new_status, events=events)


@dataclass(frozen=True)
class BatchStatusChangePlan:
    """Result of planning a batch status change."""
    updated_count: int
    events: list[ExpenseEvent] = field(default_factory=list)


def plan_batch_status_change(
    expenses: list[ExpenseRequest],
    new_status: ExpenseStatus,
    user_role: UserRole,
    user_id: Any,
    comment: str | None = None,
    now: datetime | None = None,
) -> BatchStatusChangePlan:
    """Validate and apply a batch status transition.

    Raises InvalidStatusTransitionError if any expense cannot transition.
    """
    ts = now or datetime.now(timezone.utc)
    updated_count = 0

    for expense in expenses:
        current_status = _coerce_status(expense.status)
        if current_status == new_status:
            continue
        validate_status_transition(current_status, new_status, user_role)

        plan_status_change(expense, new_status, user_role, user_id, comment, ts)
        updated_count += 1

    events: list[ExpenseEvent] = []
    if updated_count > 0:
        events.append(ExpenseStatusChangedEvent(
            expense_id="batch",
            new_status=new_status.value,
            count=updated_count,
            is_batch=True,
        ))
        events.append(ExpenseTaskUpdatedEvent(
            expense_id="batch",
            new_status=new_status.value,
        ))

    return BatchStatusChangePlan(updated_count=updated_count, events=events)


@dataclass(frozen=True)
class PaymentPlan:
    """Result of planning a payment."""
    expense: ExpenseRequest
    events: list[ExpenseEvent] = field(default_factory=list)


def plan_payment(
    expense: ExpenseRequest,
    method: PaymentMethod,
    reference: str | None,
    user_id: Any,
    bank_name: str | None = None,
    account_name: str | None = None,
    account_no: str | None = None,
    now: datetime | None = None,
) -> PaymentPlan:
    """Validate and apply payment to an expense.

    Raises InvalidPaymentError or InvalidStatusTransitionError.
    """
    assert_payment_valid(method, reference)

    current_status = _coerce_status(expense.status)
    if current_status != ExpenseStatus.pending_finance:
        raise InvalidStatusTransitionError(
            f"Cannot process payment: expense status is '{current_status.value}', "
            f"expected 'Pending Finance'"
        )

    ts = now or datetime.now(timezone.utc)

    expense.status = ExpenseStatus.paid
    expense.payment_method = method
    expense.payment_reference = reference
    expense.payment_date = ts
    expense.paid_by_id = user_id
    expense.updated_at = ts

    # Store bank details in metadata
    if bank_name or account_name or account_no:
        current_metadata = dict(expense.expense_metadata) if expense.expense_metadata else {}
        bank_details = current_metadata.get("bank_details", {})
        if bank_name:
            bank_details["bank_name"] = bank_name
        if account_name:
            bank_details["account_name"] = account_name
        if account_no:
            bank_details["account_no"] = account_no
        current_metadata["bank_details"] = bank_details
        expense.expense_metadata = current_metadata

    events = [
        ExpensePaymentProcessedEvent(expense_id=str(expense.id)),
        ExpenseTaskUpdatedEvent(expense_id=str(expense.id), new_status="Paid"),
    ]

    return PaymentPlan(expense=expense, events=events)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _coerce_status(status: ExpenseStatus | str) -> ExpenseStatus:
    if isinstance(status, ExpenseStatus):
        return status
    return ExpenseStatus(status)


def _coerce_trip_status(status: TripStatus | str) -> TripStatus:
    if isinstance(status, TripStatus):
        return status
    return TripStatus(status)
