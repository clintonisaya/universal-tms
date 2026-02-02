import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    MaintenanceEvent,
    MaintenanceEventCreate,
    MaintenanceEventPublic,
    MaintenanceEventsPublic,
    MaintenanceEventUpdate,
    ExpenseRequest,
    ExpenseCategory,
    ExpenseStatus,
    Message,
    Truck,
    TruckStatus,
)

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

@router.get("/", response_model=MaintenanceEventsPublic)
def read_maintenance_events(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve maintenance events.
    """
    count_statement = select(func.count()).select_from(MaintenanceEvent)
    count = session.exec(count_statement).one()
    statement = (
        select(MaintenanceEvent)
        .order_by(MaintenanceEvent.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    events = session.exec(statement).all()
    return MaintenanceEventsPublic(data=events, count=count)

@router.get("/{id}", response_model=MaintenanceEventPublic)
def read_maintenance_event(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """
    Get maintenance event by ID.
    """
    event = session.get(MaintenanceEvent, id)
    if not event:
        raise HTTPException(status_code=404, detail="Maintenance event not found")
    return event

@router.post("/", response_model=MaintenanceEventPublic)
def create_maintenance_event(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    event_in: MaintenanceEventCreate,
) -> Any:
    """
    Create new maintenance event.
    Automatically creates an associated ExpenseRequest.
    Optionally sets Truck Status to 'Maintenance'.
    """
    # 1. Create ExpenseRequest
    expense_in = ExpenseRequest(
        amount=event_in.cost,
        category=ExpenseCategory.maintenance,
        description=f"Maintenance for {event_in.garage_name}: {event_in.description}",
        status=ExpenseStatus.pending_manager,
        created_by_id=current_user.id,
    )
    session.add(expense_in)
    session.flush() # Flush to get expense_in.id

    # 2. Create MaintenanceEvent
    # Extract data excluding 'cost' and 'update_truck_status' (if present)
    event_data = event_in.model_dump(exclude={"cost", "update_truck_status"})
    event = MaintenanceEvent(
        **event_data,
        expense_id=expense_in.id
    )
    session.add(event)

    # 3. Update Truck Status if requested
    if getattr(event_in, "update_truck_status", False):
        truck = session.get(Truck, event_in.truck_id)
        if truck:
            truck.status = TruckStatus.maintenance
            session.add(truck)
    
    # 4. Commit transaction
    session.commit()
    session.refresh(event)
    return event

@router.patch("/{id}", response_model=MaintenanceEventPublic)
def update_maintenance_event(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    event_in: MaintenanceEventUpdate,
) -> Any:
    """
    Update a maintenance event.
    Updates associated ExpenseRequest amount if cost is changed.
    """
    event = session.get(MaintenanceEvent, id)
    if not event:
        raise HTTPException(status_code=404, detail="Maintenance event not found")

    update_dict = event_in.model_dump(exclude_unset=True)
    
    # Handle cost update -> ExpenseRequest update
    if "cost" in update_dict:
        cost = update_dict.pop("cost")
        # Update expense
        expense = session.get(ExpenseRequest, event.expense_id)
        if expense:
            expense.amount = cost
            session.add(expense)

    event.sqlmodel_update(update_dict)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event

@router.delete("/{id}")
def delete_maintenance_event(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Message:
    """
    Delete a maintenance event.
    Also deletes the associated ExpenseRequest.
    """
    event = session.get(MaintenanceEvent, id)
    if not event:
        raise HTTPException(status_code=404, detail="Maintenance event not found")
    
    # Get associated expense to delete
    expense = session.get(ExpenseRequest, event.expense_id)
    
    session.delete(event)
    if expense:
        session.delete(expense)
        
    session.commit()
    return Message(message="Maintenance event deleted successfully")
