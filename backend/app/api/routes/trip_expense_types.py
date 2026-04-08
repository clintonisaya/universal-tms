"""
Trip Expense Type Management - Story 2.19: Trip Expense Master Data
CRUD endpoints for trip expense type management.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
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
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=500),
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
    commit_or_rollback(session)
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
    commit_or_rollback(session)
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
    commit_or_rollback(session)
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
    # Complete trip expense types from master data (204 items)
    seed_data = [
        # Agency Fee
        ("Agency Fee (Zimbabwe)", "Agency Fee"),
        ("Agency Fee", "Agency Fee"),
        ("Agency fee for return cargo", "Transportation Costs-Others"),

        # Bond
        ("Bond (Zimbabwe)", "Bond"),
        ("Bond (Zambia Return)", "Bond"),
        ("Bond (Burundi 40' Container)", "Bond"),
        ("Bond (Burundi 20' Container)", "Bond"),
        ("Bond (Zambia)", "Bond"),

        # Bonus
        ("Trip Efficiency Bonus (Within 55 days)", "Bonus"),
        ("Trip Safety Bonus", "Bonus"),

        # Cargo Charges
        ("Abnormal permit (Mozambique)", "Cargo Charges"),
        ("GCLA Permit", "Cargo Charges"),
        ("Escort (Malawi)", "Cargo Charges"),
        ("Police Escort (Zambia)", "Cargo Charges"),
        ("Escort Car (Uganda)", "Cargo Charges"),
        ("Abnormal Permit (Uganda)", "Cargo Charges"),
        ("Abnormal Permit (Zimbabwe)", "Cargo Charges"),
        ("Escort Car (Zimbabwe)", "Cargo Charges"),
        ("Police Escort (Disabled)", "Cargo Charges"),
        ("Escort Car (Mozambique)", "Cargo Charges"),
        ("Escort Car (Kenya)", "Cargo Charges"),
        ("Abnormal Permit (Kenya)", "Cargo Charges"),
        ("Police Escort (Tanzania)", "Cargo Charges"),
        ("Cargo Rearrangment", "Cargo Charges"),
        ("Abnormal Permit (Malawi)", "Cargo Charges"),
        ("Abnormal Fabric", "Cargo Charges"),
        ("Escort Car (Tanzania)", "Cargo Charges"),
        ("Escort Car (DRC)", "Cargo Charges"),
        ("Escort Car (Zambia)", "Cargo Charges"),
        ("Abnormal Permit (DRC)", "Cargo Charges"),
        ("Abnormal Permit (Zambia)", "Cargo Charges"),
        ("Container Drop Off (40')", "Cargo Charges"),
        ("Container Drop Off (20')", "Cargo Charges"),
        ("Container Wash", "Cargo Charges"),
        ("Abnoamal Permit (Tanzania)", "Cargo Charges"),

        # CNPR Tax
        ("CNPR (Copper Return)", "CNPR Tax"),
        ("CNPR (Container Go&Return)", "CNPR Tax"),
        ("CNPR (Steel Structure Or Equipment Going)", "CNPR Tax"),
        ("CNPR (Normal Loose Cargo Go)", "CNPR Tax"),

        # Council
        ("Council Levy (Lusaka)", "Council"),
        ("Council (Chirundu go&return)", "Council"),
        ("Council (Kasempa)", "Council"),
        ("Council Levy (Ndola)", "Council"),
        ("Council Levy (Isoka)", "Council"),
        ("Council levy (Mpika)", "Council"),
        ("Council (Namanga)", "Council"),
        ("Council (Isoka)", "Council"),
        ("Council levy", "Council"),
        ("Council (Zimbabwe)", "Council"),
        ("Council (Zambia Manganese)", "Council"),
        ("Council (Zambia Return Cargo)", "Council"),
        ("Council (Hanrui)", "Council"),
        ("Council (Chililabombwe)", "Council"),
        ("Council (Kapiri With Return Cargo)", "Council"),
        ("Council (Kapiri Going)", "Council"),
        ("Council (Nakonde)", "Council"),
        ("Council (Tunduma)", "Council"),
        ("Council (Longido)", "Council"),
        ("Council (Kenya)", "Council"),
        ("Council (Tanzania)", "Council"),
        ("Council (DRC)", "Council"),
        ("Council (Malawi)", "Council"),
        ("Council (Zambia)", "Council"),
        ("Council (Likasi)", "Council"),
        ("Council (Kasumbalesa DRC)", "Council"),
        ("Council (Kasumbalesa Zambia)", "Council"),

        # Driver Allowance
        ("Driver Hospital Benefits", "Driver Allowance"),
        ("Overstay Allowance", "Driver Allowance"),
        ("Driver Allowance", "Driver Allowance"),

        # Fuel
        ("Fuel", "Fuel"),

        # Parking Fee
        ("Parking Fee (Conadesi)", "Parking Fee"),
        ("Parking Fee (Sakania DRC Abnormal)", "Parking Fee"),
        ("Parking Fee (Mokambo DRC Abnormal)", "Parking Fee"),
        ("Parking Fee (Mokambo DRC)", "Parking Fee"),
        ("Parking Fee (Sakania DRC)", "Parking Fee"),
        ("Parking Fee (Sakania Zambia Side Lukangaba)", "Parking Fee"),
        ("Parking Fee (Mokambo Zambia Side Lukangaba)", "Parking Fee"),
        ("Parking Fee (Others)", "Parking Fee"),
        ("Parking Fee (Kolwezi)", "Parking Fee"),
        ("Parking Fee (Kanyaka)", "Parking Fee"),
        ("Parking Fee (Wiskey)", "Parking Fee"),
        ("Parking Fee (Kasumbalesa DRC Abnormal)", "Parking Fee"),
        ("Parking Fee (Kasumbalesa DRC Normal)", "Parking Fee"),
        ("Parking Fee (Kasumbalesa Zambia Abnormal)", "Parking Fee"),
        ("Parking Fee (Kasumbalesa Zambia Normal)", "Parking Fee"),

        # Port Fee
        ("Labour Fee For Chemical Lashing", "Port Fee"),
        ("Labour Fee For Abnormal Lashing", "Port Fee"),
        ("Labour Fee For Lashing (Return)", "Port Fee"),
        ("Port Health", "Port Fee"),
        ("Manila Strip For TRA Seal", "Port Fee"),
        ("GPRS", "Port Fee"),
        ("Wire", "Port Fee"),
        ("Labour Fee For Normal Lashing", "Port Fee"),
        ("Loading Facilitation", "Port Fee"),

        # Road Toll
        ("Road Toll (Malawi Spuerlink)", "Road Toll"),
        ("ZRA Transfer charges", "Road Toll"),
        ("Road Toll (Malawi)", "Road Toll"),
        ("Road Toll (Uganda)", "Road Toll"),
        ("Road Toll (Nkhotakhota)", "Road Toll"),
        ("Road Toll (Chirundu)", "Road Toll"),
        ("Road Toll (Zimbabwe)", "Road Toll"),
        ("Road Toll (Kapiri to Kabwe)", "Road Toll"),
        ("Road Toll (Rwanda)", "Road Toll"),
        ("Road Toll (Kasumbalesa to Ndola)", "Road Toll"),
        ("Road Toll (Muhanga)", "Road Toll"),
        ("Road Toll (Kenya)", "Road Toll"),
        ("Road Toll (Magerwa to Rwanda)", "Road Toll"),
        ("Road Toll (Burundi)", "Road Toll"),
        ("Road Toll (Chikwawa)", "Road Toll"),
        ("Road Toll (Lilongwe)", "Road Toll"),
        ("Road Toll (Zambia)", "Road Toll"),
        ("Road Toll (Uvira DRC)", "Road Toll"),

        # Toll Gates
        ("Toll Gates (Kafulafuta low-bed)", "Toll Gates"),
        ("Toll Gates (kafulafuta)", "Toll Gates"),
        ("Bypass (Lubumbashi)", "Toll Gates"),
        ("Zimbabwe Bridge", "Toll Gates"),
        ("Toll Gates (Zambia Flatbed)", "Toll Gates"),
        ("Toll Gates (Zambia Lowbed)", "Toll Gates"),
        ("Toll Fee (Vlc Fall-Hwange)", "Toll Gates"),
        ("Toll Gates (Zimbabwe)", "Toll Gates"),
        ("Peage (Hanrui)", "Toll Gates"),
        ("Bypass (Kambowe)", "Toll Gates"),
        ("Peage (Kapumpi)", "Toll Gates"),
        ("Peage (Kakontwe)", "Toll Gates"),
        ("Peage (Chilabombwe Return)", "Toll Gates"),
        ("Peage (Chilabombwe Go)", "Toll Gates"),
        ("Bypass (Likasi)", "Toll Gates"),
        ("Peage (Lukumi)", "Toll Gates"),
        ("Peage (Lukangaba Sakania & Mokambo)", "Toll Gates"),
        ("Bypass (Kolwezi)", "Toll Gates"),
        ("Lualaba Bridge", "Toll Gates"),
        ("Peage (Kolwezi)", "Toll Gates"),
        ("Peage (Likasi)", "Toll Gates"),
        ("Peage (Kasumbalesa)", "Toll Gates"),
        ("Toll Gates (Zambia)", "Toll Gates"),
        ("Peage (Other DRC)", "Toll Gates"),
        ("Diversion", "Toll Gates"),

        # Transportation Costs-Others
        ("Radiation Transfer Charge", "Transportation Costs-Others"),
        ("Other Cost", "Transportation Costs-Others"),
        ("Appendax (Malawi)", "Transportation Costs-Others"),
        ("Carbon Tax Malawi", "Transportation Costs-Others"),
        ("Radiation Fee (Zambia RIT)", "Transportation Costs-Others"),
        ("Uganda Covid Certificate", "Transportation Costs-Others"),
        ("C32 Apendix", "Transportation Costs-Others"),
        ("Uganda Apendex", "Transportation Costs-Others"),
        ("Nakonde Entry&Exit Fee", "Transportation Costs-Others"),
        ("Awkward Permit", "Transportation Costs-Others"),
        ("Malawi Appendex", "Transportation Costs-Others"),
        ("Electricity Bill", "Transportation Costs-Others"),
        ("Interpol Cost", "Transportation Costs-Others"),
        ("Zimbawe Electronic Waybill", "Transportation Costs-Others"),
        ("Tanga Weighbridge", "Transportation Costs-Others"),
        ("Chemical Sticker", "Transportation Costs-Others"),
        ("Zimbabwe Empty release", "Transportation Costs-Others"),
        ("Electronic Seal", "Transportation Costs-Others"),
        ("Empty Charge", "Transportation Costs-Others"),
        ("Route Survey Tip", "Transportation Costs-Others"),
        ("Zimbabwe TIP", "Transportation Costs-Others"),
        ("Cross Border Permit", "Transportation Costs-Others"),
        ("Commercial Vehicles Guarantie", "Transportation Costs-Others"),
        ("Zimbabwe Carbon Tax", "Transportation Costs-Others"),
        ("Trailer Insurance", "Transportation Costs-Others"),
        ("Horse Insurance", "Transportation Costs-Others"),
        ("Mobile Weight Bridge", "Transportation Costs-Others"),
        ("Transportation Fee For Container Docs", "Transportation Costs-Others"),
        ("Broker Fee", "Transportation Costs-Others"),
        ("Mokambo Exit Fee", "Transportation Costs-Others"),
        ("Damage Payment", "Transportation Costs-Others"),
        ("Advertisment", "Transportation Costs-Others"),
        ("Transcom", "Transportation Costs-Others"),
        ("Truck Entry Card", "Transportation Costs-Others"),
        ("Offloading Operator", "Transportation Costs-Others"),
        ("KRA E-seal charge", "Transportation Costs-Others"),
        ("Kenya Weight Bridge", "Transportation Costs-Others"),
        ("Kenya Fast Approval", "Transportation Costs-Others"),
        ("Ndola Weighbridge Verification", "Transportation Costs-Others"),
        ("DRC Border Formalities-Mokambo", "Transportation Costs-Others"),
        ("DRC Border Formalities-Sakania", "Transportation Costs-Others"),
        ("Movement Sheet", "Transportation Costs-Others"),
        ("Road Permit-Zambia", "Transportation Costs-Others"),
        ("Carbon TAX-Zambia", "Transportation Costs-Others"),
        ("First Entry DRC", "Transportation Costs-Others"),
        ("Malawi Carbon", "Transportation Costs-Others"),
        ("Reflector", "Transportation Costs-Others"),
        ("Kenya Apendex", "Transportation Costs-Others"),
        ("Tony Boy Visa Renew", "Transportation Costs-Others"),
        ("Tony Boy Visa", "Transportation Costs-Others"),
        ("Urban Likasi", "Transportation Costs-Others"),
        ("Operation Charges", "Transportation Costs-Others"),
        ("Covid Certificate (go to Uriva)", "Transportation Costs-Others"),
        ("Radiation - Nakonde", "Transportation Costs-Others"),
        ("Truck Entry Card Renew", "Transportation Costs-Others"),
        ("Driver Visa Renew", "Transportation Costs-Others"),
        ("Weightbridge", "Transportation Costs-Others"),
        ("Malawi Apendex", "Transportation Costs-Others"),
        ("Malawi TIP", "Transportation Costs-Others"),
        ("Car Wash", "Transportation Costs-Others"),
        ("DRC Road Map", "Transportation Costs-Others"),
        ("Withdrawl Charges", "Transportation Costs-Others"),
        ("DRC Visa", "Transportation Costs-Others"),
        ("DRC Border Formalities-Kasumbalesa", "Transportation Costs-Others"),

        # Transportation Costs-Tips
        ("Documents Pushing At Kanyaka", "Transportation Costs-Tips"),
        ("Tips", "Transportation Costs-Tips"),
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

    commit_or_rollback(session)
    return Message(message=f"Seeded {created_count} trip expense types successfully")
