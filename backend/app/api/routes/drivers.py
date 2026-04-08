"""
Driver Registry Management - Story 1.5
CRUD endpoints for driver management.
"""
import re
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
from app.models import (
    Driver,
    DriverCreate,
    DriverPublic,
    DriversPublic,
    DriverUpdate,
    Message,
)

router = APIRouter(prefix="/drivers", tags=["drivers"])


def normalize_license_number(license_num: str) -> str:
    """
    Normalize license number for consistent storage and comparison.
    Removes extra spaces, converts to uppercase.
    """
    return re.sub(r"\s+", "", license_num.upper().strip())


@router.get("", response_model=DriversPublic)
def read_drivers(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> Any:
    """
    Retrieve all drivers.
    """
    count_statement = select(func.count()).select_from(Driver)
    count = session.exec(count_statement).one()
    statement = (
        select(Driver).order_by(Driver.created_at.desc()).offset(skip).limit(limit)
    )
    drivers = session.exec(statement).all()
    return DriversPublic(data=drivers, count=count)


@router.get("/{id}", response_model=DriverPublic)
def read_driver(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """
    Get driver by ID.
    """
    driver = session.get(Driver, id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver


@router.post("", response_model=DriverPublic)
def create_driver(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    driver_in: DriverCreate,
) -> Any:
    """
    Create new driver.
    Prevents duplicates by checking license_number uniqueness.
    """
    # Normalize license number
    normalized_license = normalize_license_number(driver_in.license_number)

    # Check for duplicate license number (DB-filtered query)
    existing_driver = session.exec(
        select(Driver).where(Driver.license_number == normalized_license)
    ).first()
    if existing_driver:
        raise HTTPException(
            status_code=400,
            detail="Driver with this license number already exists",
        )

    # Create driver with normalized license number
    driver_data = driver_in.model_dump()
    driver_data["license_number"] = normalized_license
    driver = Driver.model_validate(driver_data)
    session.add(driver)
    commit_or_rollback(session)
    session.refresh(driver)
    return driver


@router.patch("/{id}", response_model=DriverPublic)
def update_driver(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    driver_in: DriverUpdate,
) -> Any:
    """
    Update a driver.
    """
    driver = session.get(Driver, id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    update_dict = driver_in.model_dump(exclude_unset=True)

    # If updating license_number, normalize and check for duplicates
    if "license_number" in update_dict:
        normalized_license = normalize_license_number(update_dict["license_number"])
        normalized_current = normalize_license_number(driver.license_number)

        if normalized_license != normalized_current:
            existing_driver = session.exec(
                select(Driver).where(
                    Driver.license_number == normalized_license,
                    Driver.id != driver.id,
                )
            ).first()
            if existing_driver:
                raise HTTPException(
                    status_code=400,
                    detail="Driver with this license number already exists",
                )
        update_dict["license_number"] = normalized_license

    driver.sqlmodel_update(update_dict)
    session.add(driver)
    commit_or_rollback(session)
    session.refresh(driver)
    return driver


@router.delete("/{id}", status_code=204)
def delete_driver(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> None:
    """
    Delete a driver.
    """
    driver = session.get(Driver, id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    session.delete(driver)
    commit_or_rollback(session)
