"""
Invoice Management — Invoice Generation & Payment Verification
CRUD endpoints for invoice lifecycle: create from waybill, edit, issue, void.

Thin HTTP adapter — business logic lives in app.modules.invoice_settlement.
"""
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from sqlalchemy.orm.attributes import flag_modified
from sqlmodel import func, select

logger = logging.getLogger(__name__)

from app.api.deps import CurrentUser, SessionDep, assert_user_has_permission
from app.core.db import commit_or_rollback
from app.core.storage import storage
from app.modules.documents import (
    POP_ATTACHMENT_POLICY,
    DocumentError,
    build_pop_attachment_entry,
    enrich_pop_attachment_urls,
    generate_storage_key,
    validate_attachment,
)
from app.models import (
    Client,
    CompanySettings,
    ExchangeRate,
    Invoice,
    InvoicePayment,
    InvoicePaymentCreate,
    InvoicePaymentsPublic,
    InvoicePublic,
    InvoicesPublic,
    InvoiceStatus,
    InvoiceUpdate,
    PaymentType,
    Trailer,
    Trip,
    Truck,
    Waybill,
)
from app.modules.invoice_settlement import (
    InvalidInvoiceStatusError,
    InvoiceError,
    PaymentAmountError,
    ReissueBlockedError,
    assert_draft,
    assert_reissuable,
    check_invoice_number_exists,
    compute_totals,
    generate_next_invoice_number,
    get_display_number,
    plan_issue,
    plan_payment,
    plan_void,
)
from app.modules.permissions import Permission

router = APIRouter(prefix="/invoices", tags=["invoices"])


# ---------------------------------------------------------------------------
# Error mapping
# ---------------------------------------------------------------------------

def _map_invoice_error(err: InvoiceError) -> HTTPException:
    """Convert domain errors to HTTP exceptions."""
    if isinstance(err, (InvalidInvoiceStatusError, ReissueBlockedError, PaymentAmountError)):
        return HTTPException(status_code=422, detail=err.detail)
    return HTTPException(status_code=400, detail=err.detail)


# ---------------------------------------------------------------------------
# Serialization helpers
# ---------------------------------------------------------------------------

def build_invoice_public(session: SessionDep, invoice: Invoice) -> InvoicePublic:
    """Serialize invoice with display number fallback and resolved references."""
    pub = InvoicePublic.model_validate(invoice)
    pub.invoice_number = get_display_number(invoice)

    if invoice.waybill_id:
        pub.waybill_number = session.exec(
            select(Waybill.waybill_number).where(Waybill.id == invoice.waybill_id)
        ).first()
    if invoice.trip_id:
        pub.trip_number = session.exec(
            select(Trip.trip_number).where(Trip.id == invoice.trip_id)
        ).first()
    return pub


# ---------------------------------------------------------------------------
# List & Read
# ---------------------------------------------------------------------------

@router.get("", response_model=InvoicesPublic)
def read_invoices(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    status: str | None = Query(default=None, description="Filter by status"),
    client_id: str | None = Query(default=None, description="Filter by client ID"),
) -> Any:
    """List invoices with optional filters."""
    query = select(Invoice)
    if status:
        query = query.where(Invoice.status == status)
    if client_id:
        query = query.where(Invoice.client_id == uuid.UUID(client_id))

    count_statement = select(func.count()).select_from(query.subquery())
    count = session.exec(count_statement).one()

    query = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit)
    invoices = session.exec(query).all()

    # Enrich with waybill_number and trip_number via bulk lookup
    waybill_ids = [inv.waybill_id for inv in invoices if inv.waybill_id]
    trip_ids = [inv.trip_id for inv in invoices if inv.trip_id]

    waybill_number_map: dict[uuid.UUID, str] = {}
    if waybill_ids:
        wbs = list(session.exec(
            select(Waybill.id, Waybill.waybill_number).where(Waybill.id.in_(waybill_ids))
        ).all())
        waybill_number_map = dict(wbs)

    trip_number_map: dict[uuid.UUID, str] = {}
    if trip_ids:
        trips = list(session.exec(
            select(Trip.id, Trip.trip_number).where(Trip.id.in_(trip_ids))
        ).all())
        trip_number_map = {tid: tnum for tid, tnum in trips}

    public_invoices = []
    for inv in invoices:
        pub = InvoicePublic.model_validate(inv)
        pub.invoice_number = get_display_number(inv)
        pub.waybill_number = waybill_number_map.get(inv.waybill_id) if inv.waybill_id else None
        pub.trip_number = trip_number_map.get(inv.trip_id) if inv.trip_id else None
        public_invoices.append(pub)

    return InvoicesPublic(data=public_invoices, count=count)


@router.get("/check-number/{invoice_number}")
def check_invoice_number(
    session: SessionDep,
    current_user: CurrentUser,
    invoice_number: str,
    exclude_id: uuid.UUID | None = Query(default=None, description="Exclude this invoice ID from the check"),
) -> dict:
    """Check if an invoice number is already taken."""
    exists = check_invoice_number_exists(session, invoice_number, exclude_id)
    return {"exists": exists, "invoice_number": invoice_number}


@router.get("/{id}", response_model=InvoicePublic)
def read_invoice(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Get single invoice by ID."""
    invoice = session.get(Invoice, id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return build_invoice_public(session, invoice)


# ---------------------------------------------------------------------------
# Create from Waybill (primary creation path)
# ---------------------------------------------------------------------------

@router.post("/from-waybill/{waybill_id}", response_model=InvoicePublic)
def create_invoice_from_waybill(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    waybill_id: uuid.UUID,
) -> Any:
    """Auto-generate a draft invoice from waybill data."""
    assert_user_has_permission(
        current_user,
        Permission.INVOICES_CREATE,
        detail="Not enough permissions to create invoices",
    )

    waybill = session.get(Waybill, waybill_id)
    if not waybill:
        raise HTTPException(status_code=404, detail="Waybill not found")

    # Check no invoice already exists for this waybill
    existing = session.exec(
        select(Invoice).where(Invoice.waybill_id == waybill_id)
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Invoice {existing.invoice_number} already exists for this waybill",
        )

    # Find linked trip (go or return leg)
    trip = session.exec(
        select(Trip).where(
            (Trip.waybill_id == waybill_id) | (Trip.return_waybill_id == waybill_id)
        )
    ).first()

    # Get truck/trailer plate numbers from trip
    truck_plate = ""
    trailer_plate = ""
    trip_id = None
    if trip:
        trip_id = trip.id
        truck = session.get(Truck, trip.truck_id)
        trailer = session.get(Trailer, trip.trailer_id)
        if truck:
            truck_plate = truck.plate_number
        if trailer:
            trailer_plate = trailer.plate_number

    # Look up client TIN
    customer_tin = ""
    client_id = None
    client = session.exec(
        select(Client).where(Client.name == waybill.client_name)
    ).first()
    if client:
        customer_tin = client.tin or ""
        client_id = client.id

    # Get latest exchange rate
    exchange_rate = Decimal("0")
    now = datetime.now()
    latest_rate = session.exec(
        select(ExchangeRate)
        .where(ExchangeRate.year == now.year, ExchangeRate.month == now.month)
    ).first()
    if latest_rate:
        exchange_rate = latest_rate.rate

    # Auto-suggest next sequential number (user can change it later)
    invoice_number, invoice_seq = generate_next_invoice_number(session)

    # Build line item
    route = f"{waybill.origin} - {waybill.destination}"
    items = [
        {
            "route": route,
            "truck_plate": truck_plate,
            "trailer_plate": trailer_plate,
            "qty": 1,
            "unit_price": 0,
            "payment_schedule": "100%",
            "amount": 0,
        }
    ]

    invoice = Invoice(
        invoice_number=invoice_number,
        invoice_seq=invoice_seq,
        date=now.strftime("%Y-%m-%d"),
        status=InvoiceStatus.draft,
        customer_name=waybill.client_name,
        customer_tin=customer_tin,
        client_id=client_id,
        currency=waybill.currency or "USD",
        exchange_rate=exchange_rate,
        vat_rate=Decimal("0"),
        items=items,
        waybill_id=waybill_id,
        trip_id=trip_id,
        created_by_id=current_user.id,
    )

    compute_totals(invoice)
    session.add(invoice)
    commit_or_rollback(session)
    session.refresh(invoice)
    return build_invoice_public(session, invoice)


# ---------------------------------------------------------------------------
# Update (draft only)
# ---------------------------------------------------------------------------

@router.put("/{id}", response_model=InvoicePublic)
def update_invoice(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    invoice_in: InvoiceUpdate,
) -> Any:
    """Update a draft invoice. Rejects if invoice is not in draft status."""
    assert_user_has_permission(
        current_user,
        Permission.INVOICES_EDIT,
        detail="Not enough permissions to update invoices",
    )

    invoice = session.get(Invoice, id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    try:
        assert_draft(invoice)
    except InvalidInvoiceStatusError as exc:
        raise _map_invoice_error(exc)

    update_dict = invoice_in.model_dump(exclude_unset=True)

    # Validate invoice number uniqueness if being changed
    if "invoice_number" in update_dict and update_dict["invoice_number"]:
        if check_invoice_number_exists(session, update_dict["invoice_number"], exclude_id=id):
            raise HTTPException(status_code=409, detail="Invoice number already exists")

    invoice.sqlmodel_update(update_dict)
    invoice.updated_by_id = current_user.id
    invoice.updated_at = datetime.now(timezone.utc)

    compute_totals(invoice)
    session.add(invoice)
    commit_or_rollback(session)
    session.refresh(invoice)
    return build_invoice_public(session, invoice)


# ---------------------------------------------------------------------------
# Issue (draft → issued) — triggers rate write-back
# ---------------------------------------------------------------------------

@router.post("/{id}/issue", response_model=InvoicePublic)
def issue_invoice(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Transition invoice from draft to issued. Writes rate back to waybill."""
    assert_user_has_permission(
        current_user,
        Permission.INVOICES_ISSUE,
        detail="Not enough permissions to issue invoices",
    )

    invoice = session.get(Invoice, id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    try:
        plan = plan_issue(invoice=invoice, user_id=current_user.id)
    except InvalidInvoiceStatusError as exc:
        raise _map_invoice_error(exc)

    # Snapshot bank details from company settings at issue time
    company = session.exec(select(CompanySettings)).first()
    if company:
        invoice.bank_details_tzs = {
            "bank": company.bank_name_tzs,
            "account": company.bank_account_tzs,
            "name": company.bank_account_name,
            "currency": company.bank_currency_tzs,
        }
        invoice.bank_details_usd = {
            "bank": company.bank_name_usd,
            "account": company.bank_account_usd,
            "name": company.bank_account_name,
            "currency": company.bank_currency_usd,
        }

    # Rate write-back to waybill (design §4d)
    if invoice.waybill_id:
        waybill = session.get(Waybill, invoice.waybill_id)
        if waybill:
            waybill.agreed_rate = plan.waybill_rate
            waybill.currency = plan.waybill_currency
            waybill.updated_by_id = current_user.id
            session.add(waybill)

    session.add(invoice)
    commit_or_rollback(session)
    session.refresh(invoice)
    return build_invoice_public(session, invoice)


# ---------------------------------------------------------------------------
# Void
# ---------------------------------------------------------------------------

@router.post("/{id}/void", response_model=InvoicePublic)
def void_invoice(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Void an invoice (any status → voided)."""
    assert_user_has_permission(
        current_user,
        Permission.INVOICES_VOID,
        detail="Only Manager or Admin can void invoices",
    )

    invoice = session.get(Invoice, id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    try:
        plan_void(invoice=invoice, user_id=current_user.id)
    except InvalidInvoiceStatusError as exc:
        raise _map_invoice_error(exc)

    session.add(invoice)
    commit_or_rollback(session)
    session.refresh(invoice)
    return build_invoice_public(session, invoice)


# ---------------------------------------------------------------------------
# Reissue (void + create new draft from same waybill)
# ---------------------------------------------------------------------------

@router.post("/{id}/reissue", response_model=InvoicePublic)
def reissue_invoice(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Void the invoice and create a fresh draft from the same waybill."""
    assert_user_has_permission(
        current_user,
        Permission.INVOICES_REISSUE,
        detail="Only Manager or Admin can reissue invoices",
    )

    invoice = session.get(Invoice, id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Count payments
    payment_count = session.exec(
        select(func.count()).select_from(InvoicePayment).where(InvoicePayment.invoice_id == id)
    ).one()

    try:
        assert_reissuable(invoice, payment_count)
    except ReissueBlockedError as exc:
        raise _map_invoice_error(exc)

    waybill_id = invoice.waybill_id
    waybill = session.get(Waybill, waybill_id)
    if not waybill:
        raise HTTPException(status_code=404, detail="Linked waybill not found")

    replacement_invoice_number = get_display_number(invoice)
    if not replacement_invoice_number:
        raise HTTPException(status_code=422, detail="Invoice has no reusable invoice number")

    # --- 1. Void the existing invoice ---
    plan_void(invoice=invoice, user_id=current_user.id)

    # Free the unique constraint (plan_void doesn't detach waybill)
    invoice.waybill_id = None
    session.add(invoice)

    # --- 2. Revert the waybill ---
    waybill.agreed_rate = Decimal("0")
    waybill.currency = waybill.currency or "USD"
    waybill.updated_by_id = current_user.id
    session.add(waybill)

    # --- 3. Create a new draft invoice from the waybill ---
    trip = session.exec(
        select(Trip).where(
            (Trip.waybill_id == waybill_id) | (Trip.return_waybill_id == waybill_id)
        )
    ).first()

    truck_plate = ""
    trailer_plate = ""
    trip_id = None
    if trip:
        trip_id = trip.id
        truck = session.get(Truck, trip.truck_id)
        trailer = session.get(Trailer, trip.trailer_id)
        if truck:
            truck_plate = truck.plate_number
        if trailer:
            trailer_plate = trailer.plate_number

    customer_tin = ""
    client_id = None
    client = session.exec(
        select(Client).where(Client.name == waybill.client_name)
    ).first()
    if client:
        customer_tin = client.tin or ""
        client_id = client.id

    exchange_rate = Decimal("0")
    now = datetime.now()
    latest_rate = session.exec(
        select(ExchangeRate)
        .where(ExchangeRate.year == now.year, ExchangeRate.month == now.month)
    ).first()
    if latest_rate:
        exchange_rate = latest_rate.rate

    _, invoice_seq = generate_next_invoice_number(session)

    route = f"{waybill.origin} - {waybill.destination}"
    items = [
        {
            "route": route,
            "truck_plate": truck_plate,
            "trailer_plate": trailer_plate,
            "qty": 1,
            "unit_price": 0,
            "payment_schedule": "100%",
            "amount": 0,
        }
    ]

    new_invoice = Invoice(
        invoice_number=replacement_invoice_number,
        invoice_seq=invoice_seq,
        date=now.strftime("%Y-%m-%d"),
        status=InvoiceStatus.draft,
        customer_name=waybill.client_name,
        customer_tin=customer_tin,
        client_id=client_id,
        currency=waybill.currency or "USD",
        exchange_rate=exchange_rate,
        vat_rate=Decimal("0"),
        items=items,
        waybill_id=waybill_id,
        trip_id=trip_id,
        created_by_id=current_user.id,
    )

    compute_totals(new_invoice)
    session.add(new_invoice)

    commit_or_rollback(session)
    session.refresh(new_invoice)
    return build_invoice_public(session, new_invoice)


# ---------------------------------------------------------------------------
# Payment Recording
# ---------------------------------------------------------------------------

@router.patch("/{id}/payment", response_model=InvoicePublic)
def record_payment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    body: InvoicePaymentCreate,
) -> Any:
    """Record a payment against an issued or partially-paid invoice."""
    assert_user_has_permission(
        current_user,
        Permission.INVOICES_PAYMENT,
        detail="Only Finance or Admin can record invoice payments",
    )

    invoice = session.get(Invoice, id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    try:
        plan = plan_payment(
            invoice=invoice,
            amount=body.amount,
            payment_type=body.payment_type.value if hasattr(body.payment_type, "value") else body.payment_type,
            user_id=current_user.id,
        )
    except (InvalidInvoiceStatusError, PaymentAmountError) as exc:
        raise _map_invoice_error(exc)

    # Create payment record
    payment = InvoicePayment(
        invoice_id=id,
        payment_type=PaymentType(plan.payment_type),
        amount=body.amount,
        currency=body.currency,
        payment_date=body.payment_date,
        reference=body.reference,
        notes=body.notes,
        verified_by_id=current_user.id,
    )

    session.add(invoice)
    session.add(payment)
    commit_or_rollback(session)
    session.refresh(invoice)
    return build_invoice_public(session, invoice)


@router.get("/{id}/payments", response_model=InvoicePaymentsPublic)
def list_payments(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """List all payments recorded against an invoice."""
    invoice = session.get(Invoice, id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    statement = (
        select(InvoicePayment)
        .where(InvoicePayment.invoice_id == id)
        .order_by(InvoicePayment.payment_date.asc())
    )
    payments = session.exec(statement).all()

    return InvoicePaymentsPublic(data=payments, count=len(payments))


# ---------------------------------------------------------------------------
# POP Attachments — attach Proof of Payment files to payment records
# ---------------------------------------------------------------------------

# POP attachment policy defined in app.modules.documents.helpers
# POP_ATTACHMENT_POLICY: allowed types and max size for proof-of-payment


@router.post("/{invoice_id}/payments/{payment_id}/attachment")
async def upload_pop_attachment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    invoice_id: uuid.UUID,
    payment_id: uuid.UUID,
    file: UploadFile = File(...),
) -> Any:
    """Upload a proof-of-payment attachment for a specific payment record."""
    assert_user_has_permission(
        current_user,
        Permission.INVOICES_POP_MANAGE,
        detail="Only Finance or Admin can upload POP attachments",
    )

    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    payment = session.get(InvoicePayment, payment_id)
    if not payment or payment.invoice_id != invoice_id:
        raise HTTPException(status_code=404, detail="Payment not found for this invoice")

    # Validate file type and size against POP policy
    content = await file.read()
    try:
        validate_attachment(file.content_type, len(content), POP_ATTACHMENT_POLICY)
    except DocumentError as e:
        raise HTTPException(status_code=400, detail=e.detail)

    # Generate storage key and upload
    object_name = generate_storage_key("pop", invoice_id, file.filename)
    uploaded_key = storage.upload_file(content, object_name, file.content_type)
    if not uploaded_key:
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    # Build rich attachment entry and append to payment
    clean_filename = (file.filename or "pop").replace(" ", "_")
    attachment_entry = build_pop_attachment_entry(
        uploaded_key, clean_filename, file.content_type, current_user.id,
    )

    current = list(payment.attachments) if payment.attachments else []
    current.append(attachment_entry)
    payment.attachments = current
    flag_modified(payment, "attachments")
    payment.updated_at = datetime.now(timezone.utc)
    session.add(payment)
    commit_or_rollback(session)

    return attachment_entry


@router.get("/{invoice_id}/pop-attachments")
def list_pop_attachments(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    invoice_id: uuid.UUID,
) -> Any:
    """List all POP attachments for an invoice, grouped by payment."""
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    statement = (
        select(InvoicePayment)
        .where(InvoicePayment.invoice_id == invoice_id)
        .order_by(InvoicePayment.payment_date.desc())
    )
    payments = session.exec(statement).all()

    result = []
    for payment in payments:
        enriched_attachments = enrich_pop_attachment_urls(
            payment.attachments or [], storage,
        )

        result.append({
            "payment_id": str(payment.id),
            "payment_type": payment.payment_type,
            "amount": float(payment.amount),
            "payment_date": payment.payment_date.isoformat() if payment.payment_date else None,
            "attachments": enriched_attachments,
        })

    return result


@router.delete("/{invoice_id}/pop-attachments/{attachment_id}", status_code=204)
def delete_pop_attachment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    invoice_id: uuid.UUID,
    attachment_id: str,
) -> None:
    """Delete a POP attachment by its ID."""
    assert_user_has_permission(
        current_user,
        Permission.INVOICES_POP_MANAGE,
        detail="Only Finance or Admin can delete POP attachments",
    )

    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Find the payment that contains this attachment
    statement = (
        select(InvoicePayment)
        .where(InvoicePayment.invoice_id == invoice_id)
    )
    payments = session.exec(statement).all()

    for payment in payments:
        current = list(payment.attachments) if payment.attachments else []
        match = next((a for a in current if a.get("id") == attachment_id), None)
        if match:
            storage.delete_file(match["key"])
            current.remove(match)
            payment.attachments = current
            flag_modified(payment, "attachments")
            payment.updated_at = datetime.now(timezone.utc)
            session.add(payment)
            commit_or_rollback(session)
            return

    raise HTTPException(status_code=404, detail="Attachment not found")
