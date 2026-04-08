"""
Cargo Type Management - Story 2.8: Transport Master Data
CRUD endpoints for cargo type management.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
from app.models import (
    CargoType,
    CargoTypeCreate,
    CargoTypePublic,
    CargoTypesPublic,
    CargoTypeUpdate,
    Message,
)

router = APIRouter(prefix="/cargo-types", tags=["cargo-types"])


@router.get("", response_model=CargoTypesPublic)
def read_cargo_types(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> Any:
    """Retrieve all cargo types."""
    count_statement = select(func.count()).select_from(CargoType)
    count = session.exec(count_statement).one()
    statement = (
        select(CargoType).order_by(CargoType.name).offset(skip).limit(limit)
    )
    cargo_types = session.exec(statement).all()
    return CargoTypesPublic(data=cargo_types, count=count)


@router.get("/{id}", response_model=CargoTypePublic)
def read_cargo_type(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Get cargo type by ID."""
    cargo_type = session.get(CargoType, id)
    if not cargo_type:
        raise HTTPException(status_code=404, detail="Cargo type not found")
    return cargo_type


@router.post("", response_model=CargoTypePublic)
def create_cargo_type(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    cargo_type_in: CargoTypeCreate,
) -> Any:
    """
    Create new cargo type.
    Prevents duplicates by checking name uniqueness (case-insensitive).
    """
    existing = session.exec(
        select(CargoType).where(
            func.lower(CargoType.name) == cargo_type_in.name.lower(),
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Cargo type with this name already exists",
        )

    cargo_type = CargoType.model_validate(cargo_type_in)
    session.add(cargo_type)
    commit_or_rollback(session)
    session.refresh(cargo_type)
    return cargo_type


@router.patch("/{id}", response_model=CargoTypePublic)
def update_cargo_type(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    cargo_type_in: CargoTypeUpdate,
) -> Any:
    """Update a cargo type."""
    cargo_type = session.get(CargoType, id)
    if not cargo_type:
        raise HTTPException(status_code=404, detail="Cargo type not found")

    update_dict = cargo_type_in.model_dump(exclude_unset=True)

    if "name" in update_dict:
        existing = session.exec(
            select(CargoType).where(
                func.lower(CargoType.name) == update_dict["name"].lower(),
            )
        ).first()
        if existing and existing.id != cargo_type.id:
            raise HTTPException(
                status_code=400,
                detail="Cargo type with this name already exists",
            )

    cargo_type.sqlmodel_update(update_dict)
    session.add(cargo_type)
    commit_or_rollback(session)
    session.refresh(cargo_type)
    return cargo_type


@router.delete("/{id}", status_code=204)
def delete_cargo_type(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> None:
    """Delete a cargo type."""
    cargo_type = session.get(CargoType, id)
    if not cargo_type:
        raise HTTPException(status_code=404, detail="Cargo type not found")
    session.delete(cargo_type)
    commit_or_rollback(session)
