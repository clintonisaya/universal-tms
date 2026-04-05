"""
Waybill Management - Story 2.7
CRUD endpoints for waybill management.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
from sqlmodel import func, select

logger = logging.getLogger(__name__)

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    BorderPost,
    Invoice,
    Message,
    Trip,
    TripStatus,
    UserRole,
    Waybill,
    WaybillBorder,
    WaybillBorderPublic,
    WaybillCreate,
    WaybillPublic,
    WaybillsPublic,
    WaybillStatus,
    WaybillUpdate,
)

# Roles allowed to create/update waybills
WRITE_ROLES = {UserRole.admin, UserRole.manager, UserRole.ops}
# Roles allowed to delete waybills
DELETE_ROLES = {UserRole.admin}

router = APIRouter(prefix="/waybills", tags=["waybills"])


def generate_waybill_number(session: SessionDep) -> str:
    """Generate a unique waybill number: WB-YYYY-SEQ"""
    year = datetime.now().year

    # Acquire advisory lock — prevents concurrent requests generating the same number
    session.execute(text("SELECT pg_advisory_xact_lock(1002)"))

    # Find last sequence for this year
    pattern = f"WB-{year}-%"
    statement = select(Waybill.waybill_number).where(Waybill.waybill_number.like(pattern)).order_by(Waybill.waybill_number.desc()).limit(1)
    last_waybill_number = session.exec(statement).first()

    sequence = 1
    if last_waybill_number:
        # Extract sequence from end (last 4 digits) - WB-YYYY-0001
        try:
            last_seq = int(last_waybill_number.split("-")[-1])
            sequence = last_seq + 1
        except ValueError:
            logger.error("Failed to parse last waybill number: %s", last_waybill_number)

    return f"WB-{year}-{sequence:04d}"


@router.get("", response_model=WaybillsPublic)
def read_waybills(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    status: str | None = Query(default=None, description="Filter by status"),
) -> Any:
    """Retrieve all waybills, enriched with invoice data."""
    query = select(Waybill)
    if status:
        query = query.where(Waybill.status == status)

    count_statement = select(func.count()).select_from(query.subquery())
    count = session.exec(count_statement).one()

    query = query.order_by(Waybill.created_at.desc()).offset(skip).limit(limit)
    waybills = session.exec(query).all()

    # Enrich with invoice data and trip number (bulk lookup)
    waybill_ids = [w.id for w in waybills]
    invoice_map: dict = {}
    trip_number_map: dict = {}
    if waybill_ids:
        invoices = session.exec(
            select(Invoice).where(Invoice.waybill_id.in_(waybill_ids))
        ).all()
        invoice_map = {inv.waybill_id: inv for inv in invoices}

        trips = session.exec(
            select(Trip.waybill_id, Trip.trip_number).where(Trip.waybill_id.in_(waybill_ids))
        ).all()
        trip_number_map = {twb: tnum for twb, tnum in trips}

    enriched = []
    for wb in waybills:
        pub = WaybillPublic.model_validate(wb)
        inv = invoice_map.get(wb.id)
        if inv:
            pub.invoice_id = inv.id
            pub.invoice_number = inv.invoice_number
            pub.invoice_status = inv.status
        pub.trip_number = trip_number_map.get(wb.id)
        enriched.append(pub)

    return WaybillsPublic(data=enriched, count=count)


@router.get("/{id}", response_model=WaybillPublic)
def read_waybill(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Get waybill by ID, enriched with invoice data."""
    waybill = session.get(Waybill, id)
    if not waybill:
        raise HTTPException(status_code=404, detail="Waybill not found")

    pub = WaybillPublic.model_validate(waybill)
    inv = session.exec(
        select(Invoice).where(Invoice.waybill_id == id)
    ).first()
    if inv:
        pub.invoice_id = inv.id
        pub.invoice_number = inv.invoice_number
        pub.invoice_status = inv.status
    return pub


@router.post("", response_model=WaybillPublic)
def create_waybill(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    waybill_in: WaybillCreate,
) -> Any:
    """Create a new waybill."""
    # RBAC: Only admin, manager, and ops can create waybills
    if current_user.role not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions to create waybills")

    border_ids = waybill_in.border_ids
    waybill_number = generate_waybill_number(session)
    waybill = Waybill.model_validate(waybill_in, update={
        "waybill_number": waybill_number,
        "created_by_id": current_user.id,
    })
    session.add(waybill)
    session.flush()  # Get waybill.id before inserting borders

    # Persist ordered border crossings (Story 2.26)
    if border_ids:
        for seq, border_post_id in enumerate(border_ids, start=1):
            border_post = session.get(BorderPost, border_post_id)
            if not border_post:
                raise HTTPException(status_code=404, detail=f"Border post {border_post_id} not found")
            wb_border = WaybillBorder(
                waybill_id=waybill.id,
                border_post_id=border_post_id,
                sequence=seq,
            )
            session.add(wb_border)

    session.commit()
    session.refresh(waybill)
    return waybill


@router.patch("/{id}", response_model=WaybillPublic)
def update_waybill(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    waybill_in: WaybillUpdate,
) -> Any:
    """Update a waybill."""
    # RBAC: Only admin, manager, and ops can update waybills
    if current_user.role not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions to update waybills")

    waybill = session.get(Waybill, id)
    if not waybill:
        raise HTTPException(status_code=404, detail="Waybill not found")

    # Edit lock: Completed/Invoiced waybills are locked — only admin/manager can edit
    UNLOCK_ROLES = {UserRole.admin, UserRole.manager}
    locked_statuses = {WaybillStatus.completed, WaybillStatus.invoiced}
    current_wb_status = WaybillStatus(waybill.status) if isinstance(waybill.status, str) else waybill.status
    if current_wb_status in locked_statuses and current_user.role not in UNLOCK_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Waybill is locked for editing. Only Manager or Admin can edit completed waybills."
        )

    # Handle border_ids separately — not a Waybill column
    border_ids = waybill_in.border_ids
    update_dict = waybill_in.model_dump(exclude_unset=True, exclude={"border_ids"})
    waybill.sqlmodel_update(update_dict)
    waybill.updated_by_id = current_user.id  # Story 6.13: audit trail
    session.add(waybill)

    # Update ordered border crossings if provided (Story 2.26)
    if border_ids is not None:
        existing_borders = session.exec(
            select(WaybillBorder).where(WaybillBorder.waybill_id == id)
        ).all()
        existing_map = {wb.border_post_id: wb for wb in existing_borders}
        new_id_set = set(border_ids)

        # Validate all new border posts exist before making any changes
        for border_post_id in new_id_set:
            if not session.get(BorderPost, border_post_id):
                raise HTTPException(status_code=404, detail=f"Border post {border_post_id} not found")

        # Remove borders no longer in the list
        to_remove = set(existing_map.keys()) - new_id_set
        for border_post_id in to_remove:
            session.delete(existing_map[border_post_id])

        # Add new borders not already present
        to_add = new_id_set - set(existing_map.keys())
        for border_post_id in to_add:
            session.add(WaybillBorder(waybill_id=id, border_post_id=border_post_id, sequence=0))

        # Update sequence for all borders in the new order
        session.flush()
        for seq, border_post_id in enumerate(border_ids, start=1):
            wb = session.exec(
                select(WaybillBorder).where(
                    WaybillBorder.waybill_id == id,
                    WaybillBorder.border_post_id == border_post_id,
                )
            ).first()
            if wb:
                wb.sequence = seq
                session.add(wb)

    session.commit()
    session.refresh(waybill)
    return waybill


@router.get("/{id}/borders", response_model=list[WaybillBorderPublic])
def read_waybill_borders(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Get ordered border crossing list for a waybill."""
    waybill = session.get(Waybill, id)
    if not waybill:
        raise HTTPException(status_code=404, detail="Waybill not found")

    borders = session.exec(
        select(WaybillBorder, BorderPost)
        .join(BorderPost, BorderPost.id == WaybillBorder.border_post_id)
        .where(WaybillBorder.waybill_id == id)
        .order_by(WaybillBorder.sequence)
    ).all()

    return [
        WaybillBorderPublic(
            id=wb.id,
            waybill_id=wb.waybill_id,
            border_post_id=wb.border_post_id,
            sequence=wb.sequence,
            border_post=bp,
        )
        for wb, bp in borders
    ]


@router.delete("/{id}")
def delete_waybill(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Message:
    """Delete a waybill."""
    # RBAC: Only admin can delete waybills
    if current_user.role not in DELETE_ROLES:
        raise HTTPException(status_code=403, detail="Only admin can delete waybills")

    waybill = session.get(Waybill, id)
    if not waybill:
        raise HTTPException(status_code=404, detail="Waybill not found")

    # AC-2: Cannot delete non-Open waybill
    if waybill.status != WaybillStatus.open:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot delete waybill with status '{waybill.status}'. Only Open waybills can be deleted.",
        )

    # AC-1: Cannot delete waybill linked to an active trip
    active_trip = session.exec(
        select(Trip).where(
            (Trip.waybill_id == id) | (Trip.return_waybill_id == id),
            Trip.status.notin_([TripStatus.completed, TripStatus.cancelled]),
        )
    ).first()
    if active_trip:
        raise HTTPException(
            status_code=409,
            detail="Waybill is linked to an active trip and cannot be deleted.",
        )

    session.delete(waybill)
    session.commit()
    return Message(message="Waybill deleted successfully")
