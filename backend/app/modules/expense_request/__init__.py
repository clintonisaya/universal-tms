"""Expense Request workflow module.

Owns numbering, status transitions, role-based policy, trip-closed checks,
payment validation, and domain events for the Expense Request lifecycle.
"""

from app.modules.expense_request.numbering import (
    generate_expense_number,
    generate_office_expense_number,
    generate_trip_expense_number,
)
from app.modules.expense_request.workflow import (
    STATUS_TRANSITIONS,
    TRIP_RELATED_CATEGORIES,
    BatchStatusChangePlan,
    ExpenseAttachmentDeletedEvent,
    ExpenseAttachmentUploadedEvent,
    ExpenseCreatedEvent,
    ExpenseDeletedEvent,
    ExpenseError,
    ExpenseEvent,
    ExpensePaymentProcessedEvent,
    ExpenseStatusChangedEvent,
    ExpenseTaskUpdatedEvent,
    InvalidPaymentError,
    InvalidStatusTransitionError,
    PaymentPlan,
    PermissionDeniedError,
    StatusChangePlan,
    TripClosedError,
    assert_payment_valid,
    assert_trip_id_required,
    assert_trip_not_closed,
    can_delete_attachment,
    can_delete_expense,
    can_modify_expense,
    can_upload_attachment,
    can_view_expense,
    is_transition_allowed,
    is_trip_closed,
    plan_batch_status_change,
    plan_payment,
    plan_status_change,
    validate_status_transition,
)

__all__ = [
    # numbering
    "generate_expense_number",
    "generate_office_expense_number",
    "generate_trip_expense_number",
    # constants
    "STATUS_TRANSITIONS",
    "TRIP_RELATED_CATEGORIES",
    # errors
    "ExpenseError",
    "InvalidStatusTransitionError",
    "InvalidPaymentError",
    "PermissionDeniedError",
    "TripClosedError",
    # plans
    "StatusChangePlan",
    "BatchStatusChangePlan",
    "PaymentPlan",
    # events
    "ExpenseEvent",
    "ExpenseCreatedEvent",
    "ExpenseStatusChangedEvent",
    "ExpenseTaskUpdatedEvent",
    "ExpensePaymentProcessedEvent",
    "ExpenseDeletedEvent",
    "ExpenseAttachmentUploadedEvent",
    "ExpenseAttachmentDeletedEvent",
    # validation
    "validate_status_transition",
    "is_transition_allowed",
    "assert_payment_valid",
    "assert_trip_id_required",
    "assert_trip_not_closed",
    # policy
    "can_view_expense",
    "can_modify_expense",
    "can_delete_expense",
    "can_upload_attachment",
    "can_delete_attachment",
    "is_trip_closed",
    # operations
    "plan_status_change",
    "plan_batch_status_change",
    "plan_payment",
]
