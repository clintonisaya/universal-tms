"""Invoice Settlement workflow rules.

Owns invoice lifecycle: generation from waybill, totals computation, issue,
void, reissue, payment recording, and display-number fallback.  Route adapters
call these functions and translate the returned events into HTTP responses.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

# ---------------------------------------------------------------------------
# Error types
# ---------------------------------------------------------------------------

class InvoiceError(ValueError):
    """Base error for invoice workflow violations."""
    detail: str

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class InvoiceNotFoundError(InvoiceError):
    """Raised when the invoice does not exist."""


class InvalidInvoiceStatusError(InvoiceError):
    """Raised when an operation targets an invoice in an incompatible status."""


class DuplicateInvoiceNumberError(InvoiceError):
    """Raised when the invoice number collides with an existing one."""


class PaymentAmountError(InvoiceError):
    """Raised when a payment amount is invalid (exceeds balance, wrong type)."""


class ReissueBlockedError(InvoiceError):
    """Raised when reissue is blocked (payments exist, missing waybill, etc.)."""


class InvoiceGenerationError(InvoiceError):
    """Raised when invoice generation from waybill fails."""


# ---------------------------------------------------------------------------
# Status transition helpers
# ---------------------------------------------------------------------------

# Allowed statuses that can receive payments
_PAYABLE_STATUSES: frozenset[str] = frozenset({
    "issued", "partially_paid",
})

# Allowed statuses that can be reissued (after voiding)
_REISSUABLE_STATUSES: frozenset[str] = frozenset({
    "issued", "partially_paid",
})


def assert_draft(invoice: Any) -> None:
    """Raise if invoice is not in draft status."""
    status = _status_str(invoice)
    if status != "draft":
        raise InvalidInvoiceStatusError(
            f"Only draft invoices can be edited, current status: {status}"
        )


def assert_issuable(invoice: Any) -> None:
    """Raise if invoice cannot be issued."""
    status = _status_str(invoice)
    if status != "draft":
        raise InvalidInvoiceStatusError(
            f"Only draft invoices can be issued, current status: {status}"
        )
    if not invoice.invoice_number or not str(invoice.invoice_number).strip():
        raise InvalidInvoiceStatusError("Enter an invoice number before issuing")
    # Must have at least one item with a rate > 0
    items = invoice.items or []
    total_rate = sum(
        Decimal(str(item.get("qty", 1))) * Decimal(str(item.get("unit_price", 0)))
        for item in items
    )
    if total_rate <= 0:
        raise InvalidInvoiceStatusError(
            "Cannot issue invoice with zero rate. Enter a unit price first."
        )


def assert_voidable(invoice: Any) -> None:
    """Raise if invoice is already voided."""
    status = _status_str(invoice)
    if status == "voided":
        raise InvalidInvoiceStatusError("Invoice is already voided")


def assert_payable(invoice: Any) -> None:
    """Raise if invoice cannot receive a payment."""
    status = _status_str(invoice)
    if status == "draft":
        raise InvalidInvoiceStatusError("Cannot record payment on a draft invoice")
    if status == "voided":
        raise InvalidInvoiceStatusError("Cannot record payment on a voided invoice")
    if status == "fully_paid":
        raise InvalidInvoiceStatusError("Invoice is already fully paid")


def assert_reissuable(invoice: Any, payment_count: int) -> None:
    """Raise if invoice cannot be reissued."""
    status = _status_str(invoice)
    if status == "draft":
        raise ReissueBlockedError(
            "Cannot reissue a draft invoice — edit it instead"
        )
    if status == "fully_paid":
        raise ReissueBlockedError("Cannot reissue a fully paid invoice")
    if payment_count > 0:
        raise ReissueBlockedError(
            "Cannot reissue invoice with recorded payments. Void payments first."
        )
    if not invoice.waybill_id:
        raise ReissueBlockedError("Invoice has no linked waybill")


# ---------------------------------------------------------------------------
# Totals computation
# ---------------------------------------------------------------------------

def compute_totals(invoice: Any) -> None:
    """Recompute subtotal, vat, totals from line items.

    Mutates the invoice object in-place.
    """
    items = invoice.items or []
    subtotal = sum(
        Decimal(str(item.get("qty", 1))) * Decimal(str(item.get("unit_price", 0)))
        for item in items
    )
    vat_amount = subtotal * (invoice.vat_rate / Decimal("100"))
    total_usd = subtotal + vat_amount
    total_tzs = total_usd * invoice.exchange_rate

    invoice.subtotal = subtotal
    invoice.vat_amount = vat_amount
    invoice.total_usd = total_usd
    invoice.total_tzs = total_tzs
    invoice.amount_outstanding = total_usd - invoice.amount_paid


# ---------------------------------------------------------------------------
# Display number
# ---------------------------------------------------------------------------

def get_display_number(invoice: Any) -> str | None:
    """Prefer the active number; fall back to the archived snapshot for voided records."""
    return invoice.invoice_number or invoice.archived_invoice_number


# ---------------------------------------------------------------------------
# Payment validation
# ---------------------------------------------------------------------------

def validate_payment(invoice: Any, amount: Decimal, payment_type: str) -> str:
    """Validate a payment against the invoice state.

    Returns the resolved payment_type (may differ from input for 'full' auto-correction).
    Raises PaymentAmountError on violations.
    """
    status = _status_str(invoice)
    assert_payable(invoice)

    # Validate amount doesn't exceed outstanding balance
    outstanding_after = invoice.amount_outstanding - amount
    if outstanding_after < 0:
        raise PaymentAmountError(
            f"Payment amount ({amount}) exceeds outstanding balance ({invoice.amount_outstanding})"
        )

    # Validate payment_type matches invoice state
    if status == "issued" and payment_type == "balance":
        raise PaymentAmountError(
            "Cannot record balance payment when no advance has been recorded"
        )
    if status == "partially_paid" and payment_type == "advance":
        raise PaymentAmountError(
            "Advance payment already recorded, please record the balance"
        )

    # Auto-correct 'full' if amount != total
    if payment_type == "full" and amount != invoice.total_usd:
        if status == "issued" and amount < invoice.total_usd:
            payment_type = "advance"

    return payment_type


def apply_payment(invoice: Any, amount: Decimal, payment_type: str) -> str:
    """Apply a validated payment to the invoice.

    Returns the final status after payment.
    Mutates the invoice in-place.
    """
    invoice.amount_paid += amount
    invoice.amount_outstanding = invoice.amount_outstanding - amount

    if invoice.amount_outstanding <= 0:
        invoice.status = "fully_paid"
    elif invoice.amount_paid > 0:
        invoice.status = "partially_paid"

    return _status_str(invoice)


# ---------------------------------------------------------------------------
# Domain events
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class InvoiceCreatedEvent:
    """An invoice was generated from a waybill."""
    invoice_id: str
    waybill_id: str | None


@dataclass(frozen=True)
class InvoiceIssuedEvent:
    """A draft invoice was issued."""
    invoice_id: str
    waybill_id: str | None
    total_rate: Decimal
    currency: str


@dataclass(frozen=True)
class InvoiceVoidedEvent:
    """An invoice was voided."""
    invoice_id: str


@dataclass(frozen=True)
class InvoiceReissuedEvent:
    """An invoice was voided and a new draft created from the same waybill."""
    old_invoice_id: str
    new_invoice_id: str
    waybill_id: str


@dataclass(frozen=True)
class InvoicePaymentRecordedEvent:
    """A payment was recorded against an invoice."""
    invoice_id: str
    payment_type: str
    amount: Decimal
    new_status: str


InvoiceEvent = (
    InvoiceCreatedEvent
    | InvoiceIssuedEvent
    | InvoiceVoidedEvent
    | InvoiceReissuedEvent
    | InvoicePaymentRecordedEvent
)


# ---------------------------------------------------------------------------
# Plan functions — validate, mutate, return events (NO side effects)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class IssuePlan:
    """Result of planning an invoice issue."""
    invoice: Any
    waybill_rate: Decimal
    waybill_currency: str
    events: list[InvoiceEvent] = field(default_factory=list)


def plan_issue(
    invoice: Any,
    user_id: Any,
    now: datetime | None = None,
) -> IssuePlan:
    """Validate and apply invoice issue.

    Returns an IssuePlan with the mutated invoice and events.
    Raises InvalidInvoiceStatusError on violations.
    """
    assert_issuable(invoice)
    compute_totals(invoice)

    ts = now or datetime.now(timezone.utc)

    # Compute total rate for waybill write-back
    items = invoice.items or []
    total_rate: Decimal = sum(
        (Decimal(str(item.get("qty", 1))) * Decimal(str(item.get("unit_price", 0)))
         for item in items),
        Decimal("0"),
    )

    invoice.status = "issued"
    invoice.issued_by_id = user_id
    invoice.issued_at = ts
    invoice.updated_by_id = user_id
    invoice.updated_at = ts

    currency = invoice.currency or "USD"

    events: list[InvoiceEvent] = [
        InvoiceIssuedEvent(
            invoice_id=str(invoice.id),
            waybill_id=str(invoice.waybill_id) if invoice.waybill_id else None,
            total_rate=total_rate,
            currency=currency,
        )
    ]

    return IssuePlan(
        invoice=invoice,
        waybill_rate=total_rate,
        waybill_currency=currency,
        events=events,
    )


@dataclass(frozen=True)
class VoidPlan:
    """Result of planning an invoice void."""
    invoice: Any
    events: list[InvoiceEvent] = field(default_factory=list)


def plan_void(
    invoice: Any,
    user_id: Any,
    now: datetime | None = None,
) -> VoidPlan:
    """Validate and apply invoice void.

    Archives the invoice number and frees the waybill unique constraint.
    Raises InvalidInvoiceStatusError if already voided.
    """
    assert_voidable(invoice)
    ts = now or datetime.now(timezone.utc)

    # Archive invoice number
    if invoice.invoice_number and not invoice.archived_invoice_number:
        invoice.archived_invoice_number = invoice.invoice_number
    invoice.invoice_number = None
    invoice.status = "voided"
    invoice.updated_by_id = user_id
    invoice.updated_at = ts

    events: list[InvoiceEvent] = [
        InvoiceVoidedEvent(invoice_id=str(invoice.id))
    ]

    return VoidPlan(invoice=invoice, events=events)


@dataclass(frozen=True)
class PaymentPlan:
    """Result of planning a payment."""
    invoice: Any
    payment_type: str
    events: list[InvoiceEvent] = field(default_factory=list)


def plan_payment(
    invoice: Any,
    amount: Decimal,
    payment_type: str,
    user_id: Any,
    now: datetime | None = None,
) -> PaymentPlan:
    """Validate and apply a payment.

    Returns a PaymentPlan with the mutated invoice and events.
    Raises PaymentAmountError or InvalidInvoiceStatusError on violations.
    """
    ts = now or datetime.now(timezone.utc)

    resolved_type = validate_payment(invoice, amount, payment_type)
    new_status = apply_payment(invoice, amount, resolved_type)

    invoice.updated_by_id = user_id
    invoice.updated_at = ts

    events: list[InvoiceEvent] = [
        InvoicePaymentRecordedEvent(
            invoice_id=str(invoice.id),
            payment_type=resolved_type,
            amount=amount,
            new_status=new_status,
        )
    ]

    return PaymentPlan(
        invoice=invoice,
        payment_type=resolved_type,
        events=events,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _status_str(invoice: Any) -> str:
    """Extract status string from invoice, handling enum or plain string."""
    status = invoice.status
    if hasattr(status, "value"):
        return status.value
    return str(status)
