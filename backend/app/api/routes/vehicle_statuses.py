"""
Vehicle Status Management - Story 2.8: Transport Master Data
CRUD endpoints for vehicle status management.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
from app.models import (
    Message,
    VehicleStatus,
    VehicleStatusCreate,
    VehicleStatusesPublic,
    VehicleStatusPublic,
    VehicleStatusUpdate,
)
from app.modules.master_data import DuplicateNameError, check_duplicate_name, filtered_list_query

router = APIRouter(prefix="/vehicle-statuses", tags=["vehicle-statuses"])


@router.get("", response_model=VehicleStatusesPublic)
def read_vehicle_statuses(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    active_only: bool = False,
) -> Any:
    """Retrieve all vehicle statuses. Optionally filter by active only."""
    return filtered_list_query(
        session, VehicleStatus, skip=skip, limit=limit, active_only=active_only,
    )


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
    try:
        check_duplicate_name(session, VehicleStatus, status_in.name)
    except DuplicateNameError as e:
        raise HTTPException(status_code=400, detail=str(e))

    status = VehicleStatus.model_validate(status_in)
    session.add(status)
    commit_or_rollback(session)
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
        try:
            check_duplicate_name(session, VehicleStatus, update_dict["name"], exclude_id=id)
        except DuplicateNameError as e:
            raise HTTPException(status_code=400, detail=str(e))

    status.sqlmodel_update(update_dict)
    session.add(status)
    commit_or_rollback(session)
    session.refresh(status)
    return status


@router.delete("/{id}", status_code=204)
def delete_vehicle_status(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> None:
    """Delete a vehicle status."""
    status = session.get(VehicleStatus, id)
    if not status:
        raise HTTPException(status_code=404, detail="Vehicle status not found")
    session.delete(status)
    commit_or_rollback(session)
