"""Invoice Settlement workflow module.

Owns invoice numbering, lifecycle transitions (draft → issued → paid → voided),
totals computation, payment validation, display-number fallback, and domain
events.  Route adapters call these functions and translate the returned events
into HTTP responses and waybill updates.
"""

from app.modules.invoice_settlement.numbering import (
    check_invoice_number_exists,
    generate_next_invoice_number,
)
from app.modules.invoice_settlement.workflow import (
    DuplicateInvoiceNumberError,
    InvalidInvoiceStatusError,
    InvoiceCreatedEvent,
    InvoiceError,
    InvoiceEvent,
    InvoiceGenerationError,
    InvoiceIssuedEvent,
    InvoiceNotFoundError,
    InvoicePaymentRecordedEvent,
    InvoiceReissuedEvent,
    InvoiceVoidedEvent,
    IssuePlan,
    PaymentAmountError,
    PaymentPlan,
    ReissueBlockedError,
    VoidPlan,
    apply_payment,
    assert_draft,
    assert_issuable,
    assert_payable,
    assert_reissuable,
    assert_voidable,
    compute_totals,
    get_display_number,
    plan_issue,
    plan_payment,
    plan_void,
    validate_payment,
)

__all__ = [
    # numbering
    "generate_next_invoice_number",
    "check_invoice_number_exists",
    # errors
    "InvoiceError",
    "InvoiceNotFoundError",
    "InvalidInvoiceStatusError",
    "DuplicateInvoiceNumberError",
    "PaymentAmountError",
    "ReissueBlockedError",
    "InvoiceGenerationError",
    # plans
    "IssuePlan",
    "VoidPlan",
    "PaymentPlan",
    # events
    "InvoiceEvent",
    "InvoiceCreatedEvent",
    "InvoiceIssuedEvent",
    "InvoiceVoidedEvent",
    "InvoiceReissuedEvent",
    "InvoicePaymentRecordedEvent",
    # validation
    "assert_draft",
    "assert_issuable",
    "assert_voidable",
    "assert_payable",
    "assert_reissuable",
    "validate_payment",
    "apply_payment",
    # computation
    "compute_totals",
    "get_display_number",
    # operations
    "plan_issue",
    "plan_void",
    "plan_payment",
]
