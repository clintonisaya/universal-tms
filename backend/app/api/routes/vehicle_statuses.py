"""
Vehicle Status Management - Story 2.8: Transport Master Data
CRUD endpoints for vehicle status management.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Message,
    VehicleStatus,
    VehicleStatusCreate,
    VehicleStatusesPublic,
    VehicleStatusPublic,
    VehicleStatusUpdate,
)

router = APIRouter(prefix="/vehicle-statuses", tags=["vehicle-statuses"])


@router.get("", response_model=VehicleStatusesPublic)
def read_vehicle_statuses(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
) -> Any:
    """Retrieve all vehicle statuses. Optionally filter by active only."""
    base_query = select(VehicleStatus)
    if active_only:
        base_query = base_query.where(VehicleStatus.is_active == True)  # noqa: E712

    count_statement = select(func.count()).select_from(
        base_query.subquery()
    )
    count = session.exec(count_statement).one()

    statement = base_query.order_by(VehicleStatus.name).offset(skip).limit(limit)
    statuses = session.exec(statement).all()
    return VehicleStatusesPublic(data=statuses, count=count)


@router.get("/{id}", response_model=VehicleStatusPublic)
def read_vehicle_status(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Get vehicle status by ID."""
    status = session.get(VehicleStatus, id)
    if not status:
        raise HTTPException(status_code=404, detail="Vehicle status not found")
    return status


@router.post("", response_model=VehicleStatusPublic)
def create_vehicle_status(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    status_in: VehicleStatusCreate,
) -> Any:
    """
    Create new vehicle status.
    Prevents duplicates by checking name uniqueness (case-insensitive).
    """
    existing = session.exec(
        select(VehicleStatus).where(
            func.lower(VehicleStatus.name) == status_in.name.lower(),
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Vehicle status with this name already exists",
        )

    status = VehicleStatus.model_validate(status_in)
    session.add(status)
    session.commit()
    session.refresh(status)
    return status


@router.patch("/{id}", response_model=VehicleStatusPublic)
def update_vehicle_status(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    status_in: VehicleStatusUpdate,
) -> Any:
    """Update a vehicle status."""
    status = session.get(VehicleStatus, id)
    if not status:
        raise HTTPException(status_code=404, detail="Vehicle status not found")

    update_dict = status_in.model_dump(exclude_unset=True)

    if "name" in update_dict:
        existing = session.exec(
            select(VehicleStatus).where(
                func.lower(VehicleStatus.name) == update_dict["name"].lower(),
            )
        ).first()
        if existing and existing.id != status.id:
            raise HTTPException(
                status_code=400,
                detail="Vehicle status with this name already exists",
            )

    status.sqlmodel_update(update_dict)
    session.add(status)
    session.commit()
    session.refresh(status)
    return status


@router.delete("/{id}")
def delete_vehicle_status(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Message:
    """Delete a vehicle status."""
    status = session.get(VehicleStatus, id)
    if not status:
        raise HTTPException(status_code=404, detail="Vehicle status not found")
    session.delete(status)
    session.commit()
    return Message(message="Vehicle status deleted successfully")
