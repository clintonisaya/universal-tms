"""
Office Expense Type Management - Story 2.22: Office Expense Master Data
CRUD endpoints for office expense type management.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    OfficeExpenseType,
    OfficeExpenseTypeCreate,
    OfficeExpenseTypePublic,
    OfficeExpenseTypesPublic,
    OfficeExpenseTypeUpdate,
    Message,
)

router = APIRouter(prefix="/office-expense-types", tags=["office-expense-types"])


@router.get("/", response_model=OfficeExpenseTypesPublic)
def read_office_expense_types(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 200,
    active_only: bool = True,
) -> Any:
    """
    Retrieve all office expense types.
    - Filter by is_active if active_only=True (default)
    """
    query = select(OfficeExpenseType)

    if active_only:
        query = query.where(OfficeExpenseType.is_active == True)

    count_query = select(func.count()).select_from(query.subquery())
    count = session.exec(count_query).one()

    statement = query.order_by(OfficeExpenseType.name).offset(skip).limit(limit)
    expense_types = session.exec(statement).all()

    return OfficeExpenseTypesPublic(data=expense_types, count=count)


@router.get("/{id}", response_model=OfficeExpenseTypePublic)
def read_office_expense_type(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Get office expense type by ID."""
    expense_type = session.get(OfficeExpenseType, id)
    if not expense_type:
        raise HTTPException(status_code=404, detail="Office expense type not found")
    return expense_type


@router.post("/", response_model=OfficeExpenseTypePublic)
def create_office_expense_type(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    expense_type_in: OfficeExpenseTypeCreate,
) -> Any:
    """
    Create new office expense type.
    Prevents duplicates by checking name uniqueness (case-insensitive).
    """
    existing = session.exec(
        select(OfficeExpenseType).where(
            func.lower(OfficeExpenseType.name) == expense_type_in.name.lower(),
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Office expense type with this name already exists",
        )

    expense_type = OfficeExpenseType.model_validate(expense_type_in)
    session.add(expense_type)
    session.commit()
    session.refresh(expense_type)
    return expense_type


@router.patch("/{id}", response_model=OfficeExpenseTypePublic)
def update_office_expense_type(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    expense_type_in: OfficeExpenseTypeUpdate,
) -> Any:
    """Update an office expense type."""
    expense_type = session.get(OfficeExpenseType, id)
    if not expense_type:
        raise HTTPException(status_code=404, detail="Office expense type not found")

    update_dict = expense_type_in.model_dump(exclude_unset=True)

    if "name" in update_dict:
        existing = session.exec(
            select(OfficeExpenseType).where(
                func.lower(OfficeExpenseType.name) == update_dict["name"].lower(),
            )
        ).first()
        if existing and existing.id != expense_type.id:
            raise HTTPException(
                status_code=400,
                detail="Office expense type with this name already exists",
            )

    expense_type.sqlmodel_update(update_dict)
    session.add(expense_type)
    session.commit()
    session.refresh(expense_type)
    return expense_type


@router.delete("/{id}")
def delete_office_expense_type(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Message:
    """Delete an office expense type."""
    expense_type = session.get(OfficeExpenseType, id)
    if not expense_type:
        raise HTTPException(status_code=404, detail="Office expense type not found")
    session.delete(expense_type)
    session.commit()
    return Message(message="Office expense type deleted successfully")


@router.post("/seed", response_model=Message)
def seed_office_expense_types(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Seed the database with standard office expense types.
    """
    seed_data = [
        "Office Rent",
        "Electricity",
        "Water Bill",
        "Internet",
        "Stationery",
        "Staff Welfare",
        "Cleaning",
        "Security",
        "Kitchen Supplies",
        "Repair & Maintenance",
    ]

    created_count = 0
    for name in seed_data:
        existing = session.exec(
            select(OfficeExpenseType).where(
                func.lower(OfficeExpenseType.name) == name.lower()
            )
        ).first()

        if not existing:
            expense_type = OfficeExpenseType(name=name, is_active=True)
            session.add(expense_type)
            created_count += 1

    session.commit()
    return Message(message=f"Seeded {created_count} office expense types successfully")
