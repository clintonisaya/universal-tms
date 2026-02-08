"""
Truck Registry Management - Story 1.4
CRUD endpoints for truck management.
"""
import re
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from decimal import Decimal

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ExpenseRequest,
    MaintenanceEvent,
    MaintenanceHistoryPublic,
    Message,
    Truck,
    TruckCreate,
    TruckPublic,
    TrucksPublic,
    TruckUpdate,
)

router = APIRouter(prefix="/trucks", tags=["trucks"])


def normalize_for_comparison(plate: str) -> str:
    """
    Normalize plate number for duplicate comparison.
    Removes all spaces and converts to uppercase.
    """
    return re.sub(r"\s+", "", plate.upper().strip())


def format_plate_number(plate: str) -> str:
    """
    Format plate number for display with space before trailing letters.
    Examples:
        "T512EVG" -> "T512 EVG"
        "KCB123A" -> "KCB123 A"
        "t512 evg" -> "T512 EVG"
    """
    # First normalize: remove spaces, uppercase
    cleaned = re.sub(r"\s+", "", plate.upper().strip())

    # Format: add space before trailing letters (after numbers)
    # Pattern: everything up to and including last digit, then letters
    match = re.match(r"^(.+\d)([A-Z]+)$", cleaned)
    if match:
        prefix, suffix = match.groups()
        return f"{prefix} {suffix}"

    # No trailing letters, return as-is
    return cleaned


@router.get("", response_model=TrucksPublic)
def read_trucks(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve all trucks.
    """
    count_statement = select(func.count()).select_from(Truck)
    count = session.exec(count_statement).one()
    statement = (
        select(Truck).order_by(Truck.created_at.desc()).offset(skip).limit(limit)
    )
    trucks = session.exec(statement).all()
    return TrucksPublic(data=trucks, count=count)


@router.get("/{id}", response_model=TruckPublic)
def read_truck(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """
    Get truck by ID.
    """
    truck = session.get(Truck, id)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    return truck


@router.get("/{id}/maintenance-history", response_model=MaintenanceHistoryPublic)
def read_truck_maintenance_history(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Get maintenance history for a specific truck.
    Returns maintenance events with associated expense data and total cost.
    """
    truck = session.get(Truck, id)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    # Query maintenance events for this truck
    query = (
        select(MaintenanceEvent)
        .where(MaintenanceEvent.truck_id == id)
        .order_by(MaintenanceEvent.start_date.desc())
    )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    count = session.exec(count_query).one()

    # Paginate
    events = session.exec(query.offset(skip).limit(limit)).all()

    # Calculate total maintenance cost from associated expenses
    cost_query = (
        select(func.coalesce(func.sum(ExpenseRequest.amount), 0))
        .join(MaintenanceEvent, MaintenanceEvent.expense_id == ExpenseRequest.id)
        .where(MaintenanceEvent.truck_id == id)
    )
    total_cost = session.exec(cost_query).one()

    return MaintenanceHistoryPublic(
        data=events,
        count=count,
        total_maintenance_cost=Decimal(str(total_cost)),
    )


@router.post("", response_model=TruckPublic)
def create_truck(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    truck_in: TruckCreate,
) -> Any:
    """
    Create new truck.
    Prevents duplicates by checking plate_number uniqueness.
    Formats plate number for consistent display.
    """
    # Format plate for storage/display
    formatted_plate = format_plate_number(truck_in.plate_number)
    # Normalize for comparison
    normalized_plate = normalize_for_comparison(truck_in.plate_number)

    # Check for duplicate - compare normalized versions
    existing_trucks = session.exec(select(Truck)).all()
    for truck in existing_trucks:
        if normalize_for_comparison(truck.plate_number) == normalized_plate:
            raise HTTPException(
                status_code=400,
                detail="Truck with this plate already exists",
            )

    # Create truck with formatted plate number
    truck_data = truck_in.model_dump()
    truck_data["plate_number"] = formatted_plate
    truck = Truck.model_validate(truck_data)
    session.add(truck)
    session.commit()
    session.refresh(truck)
    return truck


@router.patch("/{id}", response_model=TruckPublic)
def update_truck(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    truck_in: TruckUpdate,
) -> Any:
    """
    Update a truck.
    Formats plate number if provided.
    """
    truck = session.get(Truck, id)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    update_dict = truck_in.model_dump(exclude_unset=True)

    # If updating plate_number, format and check for duplicates
    if "plate_number" in update_dict:
        formatted_plate = format_plate_number(update_dict["plate_number"])
        normalized_new = normalize_for_comparison(update_dict["plate_number"])
        normalized_current = normalize_for_comparison(truck.plate_number)

        # Only check duplicates if the plate is actually changing
        if normalized_new != normalized_current:
            existing_trucks = session.exec(select(Truck)).all()
            for existing in existing_trucks:
                if existing.id != truck.id and normalize_for_comparison(existing.plate_number) == normalized_new:
                    raise HTTPException(
                        status_code=400,
                        detail="Truck with this plate already exists",
                    )
        update_dict["plate_number"] = formatted_plate

    truck.sqlmodel_update(update_dict)
    session.add(truck)
    session.commit()
    session.refresh(truck)
    return truck


@router.delete("/{id}")
def delete_truck(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Message:
    """
    Delete a truck.
    """
    truck = session.get(Truck, id)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    session.delete(truck)
    session.commit()
    return Message(message="Truck deleted successfully")
