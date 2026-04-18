"""
Invoice Management — Invoice Generation & Payment Verification
CRUD endpoints for invoice lifecycle: create from waybill, edit, issue, void.
"""
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from sqlalchemy import text
from sqlalchemy.orm.attributes import flag_modified
from sqlmodel import func, select

logger = logging.getLogger(__name__)

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
from app.core.storage import storage
from app.models import (
    Client,
    CompanySettings,
    ExchangeRate,
    Invoice,
    InvoiceCreate,
    InvoicePayment,
    InvoicePaymentCreate,
    InvoicePaymentPublic,
    InvoicePaymentsPublic,
    InvoicePublic,
    InvoiceStatus,
    InvoicesPublic,
    InvoiceUpdate,
    Message,
    PaymentType,
    Trip,
    Truck,
    Trailer,
    UserRole,
    Waybill,
    WaybillStatus,
)

# Legacy role sets removed — permission checks now use granular permissions
# via _has_permission() matching frontend hasPermission() logic.

# Permission strings (mirrors frontend usePermissions.ts)
PERM_INVOICES_CREATE = "invoices:create"
PERM_INVOICES_EDIT = "invoices:edit"
PERM_INVOICES_ISSUE = "invoices:issue"
PERM_INVOICES_VOID = "invoices:void"
PERM_INVOICES_REISSUE = "invoices:reissue"
PERM_INVOICES_PAYMENT = "invoices:payment"
PERM_INVOICES_POP_MANAGE = "invoices:pop-manage"


def _has_permission(user, permission: str) -> bool:
    """Check granular permission — admin/superuser bypasses all checks."""
    if user.is_superuser or user.role == UserRole.admin:
        return True
    return permission in (user.permissions or [])

router = APIRouter(prefix="/invoices", tags=["invoices"])


def get_invoice_display_number(invoice: Invoice) -> str | None:
    """Prefer the active number; fall back to the archived snapshot for voided records."""
    return invoice.invoice_number or invoice.archived_invoice_number


def build_invoice_public(session: SessionDep, invoice: Invoice) -> InvoicePublic:
    """Serialize invoice with display number fallback and resolved references."""
    pub = InvoicePublic.model_validate(invoice)
    pub.invoice_number = get_invoice_display_number(invoice)

    if invoice.waybill_id:
        pub.waybill_number = session.exec(
            select(Waybill.waybill_number).where(Waybill.id == invoice.waybill_id)
        ).first()
    if invoice.trip_id:
        pub.trip_number = session.exec(
            select(Trip.trip_number).where(Trip.id == invoice.trip_id)
        ).first()
    return pub


def generate_next_invoice_number(session: SessionDep) -> tuple[str, int]:
    """Suggest the next sequential invoice number. User can override it."""
    # Advisory lock — prevents concurrent requests generating the same number
    session.execute(text("SELECT pg_advisory_xact_lock(2001)"))

    statement = (
        select(Invoice.invoice_seq)
        .order_by(Invoice.invoice_seq.desc())
        .limit(1)
    )
    last_seq = session.exec(statement).first()
    seq = (last_seq or 0) + 1
    return f"{seq:04d}", seq


def check_invoice_number_exists(session: SessionDep, number: str, exclude_id: uuid.UUID | None = None) -> bool:
    """Check if an invoice number already exists in the database."""
    query = select(Invoice).where(Invoice.invoice_number == number)
    if exclude_id:
        query = query.where(Invoice.id != exclude_id)
    return session.exec(query).first() is not None


def compute_totals(invoice: Invoice) -> None:
    """Recompute subtotal, vat, totals from line items."""
    items = invoice.items or []
    subtotal = sum(Decimal(str(item.get("qty", 1))) * Decimal(str(item.get("unit_price", 0))) for item in items)
    vat_amount = subtotal * (invoice.vat_rate / Decimal("100"))
    total_usd = subtotal + vat_amount
    total_tzs = total_usd * invoice.exchange_rate

    invoice.subtotal = subtotal
    invoice.vat_amount = vat_amount
    invoice.total_usd = total_usd
    invoice.total_tzs = total_tzs
    invoice.amount_outstanding = total_usd - invoice.amount_paid


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
        waybill_number_map = {wid: wnum for wid, wnum in wbs}

    trip_number_map: dict[uuid.UUID, str] = {}
    if trip_ids:
        trips = list(session.exec(
            select(Trip.id, Trip.trip_number).where(Trip.id.in_(trip_ids))
        ).all())
        trip_number_map = {tid: tnum for tid, tnum in trips}

    public_invoices = []
    for inv in invoices:
        pub = InvoicePublic.model_validate(inv)
        pub.invoice_number = get_invoice_display_number(inv)
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
# Create from Waybill (primary creation path)# ---------------------------------------------------------------------------

@router.post("/from-waybill/{waybill_id}", response_model=InvoicePublic)
def create_invoice_from_waybill(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    waybill_id: uuid.UUID,
) -> Any:
    """Auto-generate a draft invoice from waybill data."""
    if not _has_permission(current_user, PERM_INVOICES_CREATE):
        raise HTTPException(status_code=403, detail="Not enough permissions to create invoices")

    # Check waybill exists
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

    # Bank details are NOT snapshotted at draft creation — they will be fetched
    # live from company_settings until the invoice is issued. Only then are they
    # frozen into the invoice record so that post-issue settings changes don't
    # retroactively alter issued invoices.

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
    if not _has_permission(current_user, PERM_INVOICES_EDIT):
        raise HTTPException(status_code=403, detail="Not enough permissions to update invoices")

    invoice = session.get(Invoice, id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status != InvoiceStatus.draft:
        raise HTTPException(status_code=422, detail="Only draft invoices can be edited")

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
    if not _has_permission(current_user, PERM_INVOICES_ISSUE):
        raise HTTPException(status_code=403, detail="Not enough permissions to issue invoices")

    invoice = session.get(Invoice, id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status != InvoiceStatus.draft:
        raise HTTPException(status_code=422, detail="Only draft invoices can be issued")

    # Validate: must have an invoice number
    if not invoice.invoice_number or not invoice.invoice_number.strip():
        raise HTTPException(status_code=422, detail="Enter an invoice number before issuing")

    # Recompute totals before issuing
    compute_totals(invoice)

    # Validate: must have at least one item with a rate > 0
    items = invoice.items or []
    total_rate = sum(
        Decimal(str(item.get("qty", 1))) * Decimal(str(item.get("unit_price", 0)))
        for item in items
    )
    if total_rate <= 0:
        raise HTTPException(status_code=422, detail="Cannot issue invoice with zero rate. Enter a unit price first.")

    # Snapshot bank details at issue time (drafts fetch live from company_settings)
    if not invoice.bank_details_tzs or not invoice.bank_details_tzs.get("bank"):
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

    # Transition status
    invoice.status = InvoiceStatus.issued
    invoice.issued_by_id = current_user.id
    invoice.issued_at = datetime.now(timezone.utc)
    invoice.updated_by_id = current_user.id
    invoice.updated_at = datetime.now(timezone.utc)

    # Rate write-back to waybill (design §4d)
    if invoice.waybill_id:
        waybill = session.get(Waybill, invoice.waybill_id)
        if waybill:
            waybill.agreed_rate = total_rate
            waybill.currency = invoice.currency
            waybill.status = WaybillStatus.invoiced
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
    if not _has_permission(current_user, PERM_INVOICES_VOID):
        raise HTTPException(status_code=403, detail="Only Manager or Admin can void invoices")

    invoice = session.get(Invoice, id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status == InvoiceStatus.voided:
        raise HTTPException(status_code=422, detail="Invoice is already voided")

    if invoice.invoice_number and not invoice.archived_invoice_number:
        invoice.archived_invoice_number = invoice.invoice_number
    invoice.invoice_number = None
    invoice.status = InvoiceStatus.voided
    invoice.updated_by_id = current_user.id
    invoice.updated_at = datetime.now(timezone.utc)

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
    if not _has_permission(current_user, PERM_INVOICES_REISSUE):
        raise HTTPException(status_code=403, detail="Only Manager or Admin can reissue invoices")

    invoice = session.get(Invoice, id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status == InvoiceStatus.draft:
        raise HTTPException(status_code=422, detail="Cannot reissue a draft invoice — edit it instead")
    if invoice.status == InvoiceStatus.fully_paid:
        raise HTTPException(status_code=422, detail="Cannot reissue a fully paid invoice")

    # Block if payments exist
    payment_count = session.exec(
        select(func.count()).select_from(InvoicePayment).where(InvoicePayment.invoice_id == id)
    ).one()
    if payment_count > 0:
        raise HTTPException(
            status_code=422,
            detail="Cannot reissue invoice with recorded payments. Void payments first.",
        )

    waybill_id = invoice.waybill_id
    if not waybill_id:
        raise HTTPException(status_code=422, detail="Invoice has no linked waybill")

    waybill = session.get(Waybill, waybill_id)
    if not waybill:
        raise HTTPException(status_code=404, detail="Linked waybill not found")

    replacement_invoice_number = get_invoice_display_number(invoice)
    if not replacement_invoice_number:
        raise HTTPException(status_code=422, detail="Invoice has no reusable invoice number")

    # --- 1. Void the existing invoice ---
    if not invoice.archived_invoice_number:
        invoice.archived_invoice_number = replacement_invoice_number
    invoice.invoice_number = None
    invoice.status = InvoiceStatus.voided
    invoice.waybill_id = None  # Free the unique constraint
    invoice.updated_by_id = current_user.id
    invoice.updated_at = datetime.now(timezone.utc)
    session.add(invoice)

    # --- 2. Revert the waybill ---
    waybill.status = WaybillStatus.completed
    waybill.agreed_rate = Decimal("0")
    waybill.currency = waybill.currency or "USD"
    waybill.updated_by_id = current_user.id
    session.add(waybill)

    # --- 3. Create a new draft invoice from the waybill ---
    # Reuse the same logic as create_invoice_from_waybill

    # Find linked trip (go or return leg)
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

    # Keep the original visible number, but continue advancing the internal sequence.
    _, invoice_seq = generate_next_invoice_number(session)

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
# Payment Recording (Phase 2)
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
    if not _has_permission(current_user, PERM_INVOICES_PAYMENT):
        raise HTTPException(status_code=403, detail="Only Finance or Admin can record invoice payments")

    invoice = session.get(Invoice, id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Only allow payments on invoices that can receive them
    if invoice.status == InvoiceStatus.draft:
        raise HTTPException(status_code=422, detail="Cannot record payment on a draft invoice")
    if invoice.status == InvoiceStatus.voided:
        raise HTTPException(status_code=422, detail="Cannot record payment on a voided invoice")
    if invoice.status == InvoiceStatus.fully_paid:
        raise HTTPException(status_code=422, detail="Invoice is already fully paid")

    # Validate amount doesn't exceed outstanding balance
    outstanding_after = invoice.amount_outstanding - body.amount
    if outstanding_after < 0:
        raise HTTPException(
            status_code=422,
            detail=f"Payment amount ({body.amount}) exceeds outstanding balance ({invoice.amount_outstanding})"
        )

    # Validate payment_type matches invoice state
    if invoice.status == InvoiceStatus.issued and body.payment_type == PaymentType.balance:
        raise HTTPException(status_code=422, detail="Cannot record balance payment when no advance has been recorded")
    if invoice.status == InvoiceStatus.partially_paid and body.payment_type == PaymentType.advance:
        raise HTTPException(status_code=422, detail="Advance payment already recorded, please record the balance")

    # Auto-suggest payment_type if 'full' but amount != total
    if body.payment_type == PaymentType.full and body.amount != invoice.total_usd:
        # Override: if partial payment on issued invoice, treat as advance
        if invoice.status == InvoiceStatus.issued and body.amount < invoice.total_usd:
            body.payment_type = PaymentType.advance

    # Apply payment
    invoice.amount_paid += body.amount
    invoice.amount_outstanding = outstanding_after

    # Auto-transition status
    if invoice.amount_outstanding <= 0:
        invoice.status = InvoiceStatus.fully_paid
    elif invoice.amount_paid > 0:
        invoice.status = InvoiceStatus.partially_paid

    invoice.updated_by_id = current_user.id
    invoice.updated_at = datetime.now(timezone.utc)

    # Create payment record
    payment = InvoicePayment(
        invoice_id=id,
        payment_type=body.payment_type,
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

POP_ALLOWED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
]
POP_MAX_SIZE = 5 * 1024 * 1024  # 5 MB


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
    if not _has_permission(current_user, PERM_INVOICES_POP_MANAGE):
        raise HTTPException(status_code=403, detail="Only Finance or Admin can upload POP attachments")

    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    payment = session.get(InvoicePayment, payment_id)
    if not payment or payment.invoice_id != invoice_id:
        raise HTTPException(status_code=404, detail="Payment not found for this invoice")

    # Validate file type
    if file.content_type not in POP_ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' is not allowed. Accepted: PDF, JPEG, PNG, WebP",
        )

    # Validate file size
    content = await file.read()
    if len(content) > POP_MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 5 MB limit")

    # Generate storage key
    unique_id = uuid.uuid4().hex[:8]
    clean_filename = (file.filename or "pop").replace(" ", "_")
    object_name = f"pop/{invoice_id}/{unique_id}_{clean_filename}"

    uploaded_key = storage.upload_file(content, object_name, file.content_type)
    if not uploaded_key:
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    # Append to payment's JSON attachments list
    attachment_entry = {
        "id": uuid.uuid4().hex[:12],
        "key": uploaded_key,
        "filename": file.filename or clean_filename,
        "content_type": file.content_type,
        "uploaded_by": str(current_user.id),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }

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
        enriched_attachments = []
        for att in (payment.attachments or []):
            url = storage.get_presigned_url(att["key"], expiration=3600)
            enriched_attachments.append({**att, "url": url})

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
    if not _has_permission(current_user, PERM_INVOICES_POP_MANAGE):
        raise HTTPException(status_code=403, detail="Only Finance or Admin can delete POP attachments")

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
