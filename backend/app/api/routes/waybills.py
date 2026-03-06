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
    Message,
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
    """Retrieve all waybills."""
    query = select(Waybill)
    if status:
        query = query.where(Waybill.status == status)
        
    count_statement = select(func.count()).select_from(query.subquery())
    count = session.exec(count_statement).one()
    
    query = query.order_by(Waybill.created_at.desc()).offset(skip).limit(limit)
    waybills = session.exec(query).all()
    
    return WaybillsPublic(data=waybills, count=count)


@router.get("/{id}", response_model=WaybillPublic)
def read_waybill(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Get waybill by ID."""
    waybill = session.get(Waybill, id)
    if not waybill:
        raise HTTPException(status_code=404, detail="Waybill not found")
    return waybill


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
    waybill = Waybill.model_validate(waybill_in, update={"waybill_number": waybill_number})
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

    # Handle border_ids separately — not a Waybill column
    border_ids = waybill_in.border_ids
    update_dict = waybill_in.model_dump(exclude_unset=True, exclude={"border_ids"})
    waybill.sqlmodel_update(update_dict)
    session.add(waybill)

    # Update ordered border crossings if provided (Story 2.26)
    if border_ids is not None:
        # Delete existing borders for this waybill
        existing_borders = session.exec(
            select(WaybillBorder).where(WaybillBorder.waybill_id == id)
        ).all()
        for wb in existing_borders:
            session.delete(wb)
        session.flush()

        # Re-insert with new order
        for seq, border_post_id in enumerate(border_ids, start=1):
            border_post = session.get(BorderPost, border_post_id)
            if not border_post:
                raise HTTPException(status_code=404, detail=f"Border post {border_post_id} not found")
            wb_border = WaybillBorder(
                waybill_id=id,
                border_post_id=border_post_id,
                sequence=seq,
            )
            session.add(wb_border)

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
        
    session.delete(waybill)
    session.commit()
    return Message(message="Waybill deleted successfully")
