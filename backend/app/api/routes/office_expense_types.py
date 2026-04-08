"""
Office Expense Type Management - Story 2.22: Office Expense Master Data
CRUD endpoints for office expense type management.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
from app.models import (
    OfficeExpenseType,
    OfficeExpenseTypeCreate,
    OfficeExpenseTypePublic,
    OfficeExpenseTypesPublic,
    OfficeExpenseTypeUpdate,
    Message,
)

router = APIRouter(prefix="/office-expense-types", tags=["office-expense-types"])


@router.get("", response_model=OfficeExpenseTypesPublic)
def read_office_expense_types(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=500),
    category: str | None = None,
    active_only: bool = True,
) -> Any:
    """
    Retrieve all office expense types.
    - Filter by category if provided
    - Filter by is_active if active_only=True (default)
    """
    query = select(OfficeExpenseType)

    if active_only:
        query = query.where(OfficeExpenseType.is_active == True)

    if category:
        query = query.where(OfficeExpenseType.category == category)

    count_query = select(func.count()).select_from(query.subquery())
    count = session.exec(count_query).one()

    statement = query.order_by(OfficeExpenseType.category, OfficeExpenseType.name).offset(skip).limit(limit)
    expense_types = session.exec(statement).all()

    return OfficeExpenseTypesPublic(data=expense_types, count=count)


@router.get("/categories", response_model=list[str])
def read_categories(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get list of unique categories."""
    statement = (
        select(OfficeExpenseType.category)
        .distinct()
        .order_by(OfficeExpenseType.category)
    )
    categories = session.exec(statement).all()
    return categories


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


@router.post("", response_model=OfficeExpenseTypePublic)
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
    commit_or_rollback(session)
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
    commit_or_rollback(session)
    session.refresh(expense_type)
    return expense_type


@router.delete("/{id}", status_code=204)
def delete_office_expense_type(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> None:
    """Delete an office expense type."""
    expense_type = session.get(OfficeExpenseType, id)
    if not expense_type:
        raise HTTPException(status_code=404, detail="Office expense type not found")
    session.delete(expense_type)
    commit_or_rollback(session)


@router.post("/seed", response_model=Message)
def seed_office_expense_types(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Seed the database with standard office expense types from office-cost.txt.
    Only creates entries that don't already exist.
    """
    seed_data = [
        # Assets
        ("Assets", "Assets"),

        # Bond
        ("CB11", "Bond"),
        ("IM8", "Bond"),
        ("CB6", "Bond"),
        ("CB4", "Bond"),
        ("CB3", "Bond"),

        # Certificate
        ("Certificate", "Certificate"),
        ("ID", "Certificate"),

        # Client Treatment Fee
        ("Client Treatment Fee", "Client Treatment Fee"),

        # Company License
        ("Other Company License", "Company License"),
        ("Transporter Of Goods", "Company License"),
        ("Goverment Chemist Laboratory Authority", "Company License"),
        ("DRC Carrier License", "Company License"),
        ("Zambia Carrier License", "Company License"),
        ("Business License-Logidtics", "Company License"),
        ("Tax Clearance", "Company License"),
        ("Goods In Transit(GIT)", "Company License"),
        ("Transporter Association (TATOA)", "Company License"),
        ("Business Licence-Trailers", "Company License"),

        # Construction
        ("Yard Maintenance", "Construction"),
        ("Construction", "Construction"),

        # Equipment Rental
        ("Equipment Others", "Equipment Rental"),
        ("Equipment Tips", "Equipment Rental"),
        ("Equipment Maintainance", "Equipment Rental"),
        ("Equipment Driver Allowance", "Equipment Rental"),
        ("Equipment Fuel", "Equipment Rental"),

        # Facilitation
        ("Facilitation", "Facilitation"),

        # Financial Expenses
        ("Loan", "Financial Expenses"),
        ("Bank Service Fees", "Financial Expenses"),
        ("Interest", "Financial Expenses"),

        # Office
        ("Dog Expenses", "Office"),
        ("Generator Fuel", "Office"),
        ("Labour Charges", "Office"),
        ("Other Office Payments", "Office"),
        ("Visa/Work Permit", "Office"),
        ("ID/Photos", "Office"),
        ("Telephone And Internet", "Office"),
        ("Consulatancy Fee", "Office"),
        ("Express Fee", "Office"),
        ("IT Services", "Office"),
        ("Office Supplies And Stationery", "Office"),

        # Office Vehicles
        ("Other Vehicle Expenses", "Office Vehicles"),
        ("Maintainance", "Office Vehicles"),
        ("Office Vehicles-Fuel", "Office Vehicles"),

        # One Time Payment
        ("Covid Certificate ( New Driver Go Into DRC From Zambia)", "One Time Payment"),
        ("Vehicle Stamp Duty", "One Time Payment"),
        ("First Pass The Mutaka Scanner", "One Time Payment"),

        # Passport
        ("Passport", "Passport"),

        # Recurring Payment
        ("Other Licences", "Recurring Payment"),
        ("Safety Stickers", "Recurring Payment"),
        ("Vehicle Inspection Report", "Recurring Payment"),
        ("LATRA", "Recurring Payment"),
        ("COMESA", "Recurring Payment"),
        ("C28", "Recurring Payment"),
        ("C40", "Recurring Payment"),

        # Rent
        ("TPA Service Fee", "Rent"),
        ("Apartment Rent", "Rent"),
        ("Truck Yard Rent", "Rent"),
        ("TPA Rent", "Rent"),
        ("Electricity Charges", "Rent"),

        # Salary
        ("Salary", "Salary"),
        ("WCF", "Salary"),
        ("Wages", "Salary"),
        ("Project Bonus", "Salary"),
        ("Staff Welfare", "Salary"),
        ("City Transportation Fee", "Salary"),
        ("NSSF", "Salary"),
        ("NHIF", "Salary"),

        # Tax
        ("Other Tax", "Tax"),
        ("Withholding Tax", "Tax"),
        ("SDL", "Tax"),
        ("VAT", "Tax"),
        ("Stamp Duty", "Tax"),
        ("PAYE", "Tax"),
        ("Cooperate Tax", "Tax"),

        # Transportation Costs
        ("Bonus", "Transportation Costs"),
        ("Driver Deduction", "Transportation Costs"),
        ("Transportation Costs-Others", "Transportation Costs"),
        ("Transportation Costs-Tips", "Transportation Costs"),
        ("Parking Fee", "Transportation Costs"),
        ("Bond", "Transportation Costs"),
        ("CNPR Tax", "Transportation Costs"),
        ("Council", "Transportation Costs"),
        ("Agency Fee", "Transportation Costs"),
        ("Port Fee", "Transportation Costs"),
        ("Toll Gates", "Transportation Costs"),
        ("Road Toll", "Transportation Costs"),
        ("Cargo Charges", "Transportation Costs"),
        ("Driver Allowance", "Transportation Costs"),
        ("Fuel", "Transportation Costs"),

        # Travel And Accomodation
        ("Travel And Accomodation", "Travel And Accomodation"),

        # Vehicle Purchase
        ("Trailer Maintenance Fee", "Vehicle Purchase"),
        ("Vehicle Purchase-Tips", "Vehicle Purchase"),
        ("Clearance Fee", "Vehicle Purchase"),
        ("Duty", "Vehicle Purchase"),
        ("Vehicle Price", "Vehicle Purchase"),
    ]

    created_count = 0
    for name, category in seed_data:
        existing = session.exec(
            select(OfficeExpenseType).where(
                func.lower(OfficeExpenseType.name) == name.lower()
            )
        ).first()

        if not existing:
            expense_type = OfficeExpenseType(name=name, category=category, is_active=True)
            session.add(expense_type)
            created_count += 1

    commit_or_rollback(session)
    return Message(message=f"Seeded {created_count} office expense types successfully")
