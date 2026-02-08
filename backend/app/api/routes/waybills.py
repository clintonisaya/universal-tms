"""
Waybill Management - Story 2.7
CRUD endpoints for waybill management.
"""
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Message,
    UserRole,
    Waybill,
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
            pass # Fallback to 1 if parsing fails
            
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

    waybill_number = generate_waybill_number(session)
    waybill = Waybill.model_validate(waybill_in, update={"waybill_number": waybill_number})
    session.add(waybill)
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

    update_dict = waybill_in.model_dump(exclude_unset=True)
    waybill.sqlmodel_update(update_dict)
    session.add(waybill)
    session.commit()
    session.refresh(waybill)
    return waybill


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
