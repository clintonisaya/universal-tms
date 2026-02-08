"""
Trip Expense Type Management - Story 2.19: Trip Expense Master Data
CRUD endpoints for trip expense type management.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    TripExpenseType,
    TripExpenseTypeCreate,
    TripExpenseTypePublic,
    TripExpenseTypesPublic,
    TripExpenseTypeUpdate,
    Message,
)

router = APIRouter(prefix="/trip-expense-types", tags=["trip-expense-types"])


@router.get("", response_model=TripExpenseTypesPublic)
def read_trip_expense_types(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 200,
    category: str | None = None,
    active_only: bool = True,
) -> Any:
    """
    Retrieve all trip expense types.
    - Filter by category if provided
    - Filter by is_active if active_only=True (default)
    """
    query = select(TripExpenseType)

    if active_only:
        query = query.where(TripExpenseType.is_active == True)

    if category:
        query = query.where(TripExpenseType.category == category)

    count_query = select(func.count()).select_from(query.subquery())
    count = session.exec(count_query).one()

    statement = query.order_by(TripExpenseType.category, TripExpenseType.name).offset(skip).limit(limit)
    expense_types = session.exec(statement).all()

    return TripExpenseTypesPublic(data=expense_types, count=count)


@router.get("/categories", response_model=list[str])
def read_categories(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get list of unique categories."""
    statement = (
        select(TripExpenseType.category)
        .distinct()
        .order_by(TripExpenseType.category)
    )
    categories = session.exec(statement).all()
    return categories


@router.get("/{id}", response_model=TripExpenseTypePublic)
def read_trip_expense_type(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Get trip expense type by ID."""
    expense_type = session.get(TripExpenseType, id)
    if not expense_type:
        raise HTTPException(status_code=404, detail="Trip expense type not found")
    return expense_type


@router.post("", response_model=TripExpenseTypePublic)
def create_trip_expense_type(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    expense_type_in: TripExpenseTypeCreate,
) -> Any:
    """
    Create new trip expense type.
    Prevents duplicates by checking name uniqueness (case-insensitive).
    """
    existing = session.exec(
        select(TripExpenseType).where(
            func.lower(TripExpenseType.name) == expense_type_in.name.lower(),
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Trip expense type with this name already exists",
        )

    expense_type = TripExpenseType.model_validate(expense_type_in)
    session.add(expense_type)
    session.commit()
    session.refresh(expense_type)
    return expense_type


@router.patch("/{id}", response_model=TripExpenseTypePublic)
def update_trip_expense_type(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    expense_type_in: TripExpenseTypeUpdate,
) -> Any:
    """Update a trip expense type."""
    expense_type = session.get(TripExpenseType, id)
    if not expense_type:
        raise HTTPException(status_code=404, detail="Trip expense type not found")

    update_dict = expense_type_in.model_dump(exclude_unset=True)

    if "name" in update_dict:
        existing = session.exec(
            select(TripExpenseType).where(
                func.lower(TripExpenseType.name) == update_dict["name"].lower(),
            )
        ).first()
        if existing and existing.id != expense_type.id:
            raise HTTPException(
                status_code=400,
                detail="Trip expense type with this name already exists",
            )

    expense_type.sqlmodel_update(update_dict)
    session.add(expense_type)
    session.commit()
    session.refresh(expense_type)
    return expense_type


@router.delete("/{id}")
def delete_trip_expense_type(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Message:
    """Delete a trip expense type."""
    expense_type = session.get(TripExpenseType, id)
    if not expense_type:
        raise HTTPException(status_code=404, detail="Trip expense type not found")
    session.delete(expense_type)
    session.commit()
    return Message(message="Trip expense type deleted successfully")


@router.post("/seed", response_model=Message)
def seed_trip_expense_types(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Seed the database with standard trip expense types from Trip expense.txt.
    Only creates entries that don't already exist.
    """
    # Standard trip expense types organized by category
    seed_data = [
        # Cargo Charges
        ("Abnormal Permit (Mozambique)", "Cargo Charges"),
        ("Abnormal Permit (Zimbabwe)", "Cargo Charges"),
        ("Escort (Malawi)", "Cargo Charges"),
        ("Police Escort (Zambia)", "Cargo Charges"),
        ("Police Escort (Zimbabwe)", "Cargo Charges"),
        ("Weighbridge (DRC)", "Cargo Charges"),
        ("Weighbridge (Malawi)", "Cargo Charges"),
        ("Weighbridge (Mozambique)", "Cargo Charges"),
        ("Weighbridge (Tanzania)", "Cargo Charges"),
        ("Weighbridge (Zambia)", "Cargo Charges"),
        ("Weighbridge (Zimbabwe)", "Cargo Charges"),

        # Driver Allowance
        ("Driver Hospital Benefits", "Driver Allowance"),
        ("Overstay Allowance", "Driver Allowance"),
        ("Driver Allowance", "Driver Allowance"),
        ("Loading/Offloading Allowance", "Driver Allowance"),

        # Transportation Costs-Others
        ("Radiation Transfer Charge", "Transportation Costs-Others"),
        ("Carbon Tax Malawi", "Transportation Costs-Others"),
        ("Council Levy (Lusaka)", "Transportation Costs-Others"),
        ("Transit Charge", "Transportation Costs-Others"),
        ("Insurance Premium", "Transportation Costs-Others"),
        ("Road License", "Transportation Costs-Others"),
        ("Vehicle Permit", "Transportation Costs-Others"),

        # Toll Gates
        ("Toll Gates (Kafulafuta)", "Toll Gates"),
        ("Zimbabwe Bridge", "Toll Gates"),
        ("Toll Gate (Mozambique)", "Toll Gates"),
        ("Toll Gate (South Africa)", "Toll Gates"),
        ("Toll Gate (DRC)", "Toll Gates"),

        # Road Toll
        ("Road Toll (Malawi)", "Road Toll"),
        ("Road Toll (Uganda)", "Road Toll"),
        ("Road Toll (Kenya)", "Road Toll"),
        ("Road Toll (Rwanda)", "Road Toll"),
        ("Road Toll (Burundi)", "Road Toll"),
        ("Road Toll (Tanzania)", "Road Toll"),

        # Port Fee
        ("Labour Fee", "Port Fee"),
        ("GPRS", "Port Fee"),
        ("Wire", "Port Fee"),
        ("Customs Clearance", "Port Fee"),
        ("Port Storage", "Port Fee"),
        ("Demurrage", "Port Fee"),

        # Parking Fee
        ("Parking Fee (Conadesi)", "Parking Fee"),
        ("Parking Fee (Mokambo)", "Parking Fee"),
        ("Parking Fee (General)", "Parking Fee"),
        ("Overnight Parking", "Parking Fee"),

        # Council
        ("Council Levy (Lusaka)", "Council"),
        ("Council (Namanga)", "Council"),
        ("Council (Dar es Salaam)", "Council"),
        ("Council (Mbeya)", "Council"),

        # Bond
        ("Bond (Zimbabwe)", "Bond"),
        ("Bond (Zambia)", "Bond"),
        ("Bond (Malawi)", "Bond"),
        ("Bond (DRC)", "Bond"),

        # Agency Fee
        ("Agency Fee (Zimbabwe)", "Agency Fee"),
        ("Agency Fee (Zambia)", "Agency Fee"),
        ("Agency Fee (Malawi)", "Agency Fee"),
        ("Clearing Agent Fee", "Agency Fee"),

        # Fuel
        ("Fuel", "Fuel"),
        ("Fuel (Tanzania)", "Fuel"),
        ("Fuel (Zambia)", "Fuel"),
        ("Fuel (Zimbabwe)", "Fuel"),
        ("Fuel (Malawi)", "Fuel"),
        ("Fuel (DRC)", "Fuel"),

        # CNPR Tax
        ("CNPR (Copper Return)", "CNPR Tax"),
        ("CNPR (General)", "CNPR Tax"),

        # Bonus
        ("Trip Efficiency Bonus", "Bonus"),
        ("Safety Bonus", "Bonus"),

        # Border Expenses
        ("Border Crossing Fee", "Border Expenses"),
        ("Immigration Fee", "Border Expenses"),
        ("Health Certificate", "Border Expenses"),
        ("Phytosanitary Certificate", "Border Expenses"),

        # Miscellaneous
        ("Other", "Miscellaneous"),
        ("Communication", "Miscellaneous"),
        ("Accommodation", "Miscellaneous"),
        ("Meals", "Miscellaneous"),
    ]

    created_count = 0
    for name, category in seed_data:
        existing = session.exec(
            select(TripExpenseType).where(
                func.lower(TripExpenseType.name) == name.lower()
            )
        ).first()

        if not existing:
            expense_type = TripExpenseType(name=name, category=category, is_active=True)
            session.add(expense_type)
            created_count += 1

    session.commit()
    return Message(message=f"Seeded {created_count} trip expense types successfully")
