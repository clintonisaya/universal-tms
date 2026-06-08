import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import selectinload
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep, assert_user_has_permission
from app.api.routes.expenses import generate_expense_number
from app.core.db import commit_or_rollback
from app.models import (
    AvailableExpensesPublic,
    ExpenseCategory,
    ExpenseRequest,
    ExpenseStatus,
    MaintenanceEvent,
    MaintenanceEventCreate,
    MaintenanceEventLinkExpense,
    MaintenanceEventPublic,
    MaintenanceEventsPublic,
    MaintenanceEventUpdate,
    OfficeExpenseType,
    Trailer,
    TrailerStatus,
    Truck,
    TruckStatus,
)
from app.modules.permissions import Permission

router = APIRouter(prefix="/maintenance", tags=["maintenance"])
MAINTENANCE_ITEM_TOKEN = "maintenance"


def _maintenance_type_names(session: SessionDep) -> list[str]:
    return [
        name.lower()
        for name in session.exec(
            select(OfficeExpenseType.name).where(
                func.lower(OfficeExpenseType.category) == MAINTENANCE_ITEM_TOKEN
            )
        ).all()
    ]


def _is_maintenance_item_name(
    item_name: object | None,
    maintenance_type_names: list[str],
) -> bool:
    normalized_name = str(item_name or "").strip().lower()
    return bool(
        normalized_name
        and (
            MAINTENANCE_ITEM_TOKEN in normalized_name
            or normalized_name in maintenance_type_names
        )
    )


def _maintenance_expense_filter(session: SessionDep) -> Any:
    maintenance_type_names = _maintenance_type_names(session)
    item_name = func.lower(ExpenseRequest.expense_metadata["item_name"].as_string())
    filters = [
        ExpenseRequest.category == ExpenseCategory.maintenance,
        item_name.like(f"%{MAINTENANCE_ITEM_TOKEN}%"),
    ]
    if maintenance_type_names:
        filters.append(item_name.in_(maintenance_type_names))
    return or_(*filters)


@router.get("", response_model=MaintenanceEventsPublic)
def read_maintenance_events(
    session: SessionDep,
    _current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> Any:
    """
    Retrieve maintenance events.
    """
    count_statement = select(func.count()).select_from(MaintenanceEvent)
    count = session.exec(count_statement).one()
    statement = (
        select(MaintenanceEvent)
        .options(
            selectinload(MaintenanceEvent.truck),
            selectinload(MaintenanceEvent.trailer),
            selectinload(MaintenanceEvent.expense),
        )
        .order_by(MaintenanceEvent.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    events = session.exec(statement).all()
    return MaintenanceEventsPublic(data=events, count=count)


@router.post("", response_model=MaintenanceEventPublic)
def create_maintenance_event(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    event_in: MaintenanceEventCreate,
) -> Any:
    """
    Create new maintenance event.
    Automatically creates an associated ExpenseRequest.
    Optionally sets Truck or Trailer Status to 'Maintenance'.
    """
    # RBAC: Only admin, manager, and ops can create maintenance events
    assert_user_has_permission(
        current_user,
        Permission.FLEET_MAINTENANCE_EDIT,
        detail="Not enough permissions to create maintenance events",
    )

    # 1. Create ExpenseRequest with generated expense_number - Story 2.17
    expense_number = generate_expense_number(session, None, None)

    asset_info = ""
    if event_in.truck_id:
        truck = session.get(Truck, event_in.truck_id)
        if truck:
            asset_info = f"Truck {truck.plate_number}"
    elif event_in.trailer_id:
        trailer = session.get(Trailer, event_in.trailer_id)
        if trailer:
            asset_info = f"Trailer {trailer.plate_number}"

    # Build expense metadata matching office expense format
    expense_metadata = {
        "payment_method": event_in.payment_method,
        "item_name": "Maintenance",
        "item_details": event_in.description,
    }
    if event_in.payment_method == "Transfer" and event_in.bank_details:
        expense_metadata["bank_details"] = {
            "bank_name": event_in.bank_details.bank_name,
            "account_name": event_in.bank_details.account_name,
            "account_no": event_in.bank_details.account_no,
        }

    expense_in = ExpenseRequest(
        expense_number=expense_number,
        amount=event_in.cost,
        currency=event_in.currency,
        category=ExpenseCategory.maintenance,
        description=f"Maintenance for {asset_info} at {event_in.garage_name}: {event_in.description}",
        status=ExpenseStatus.pending_manager,
        expense_metadata=expense_metadata,
        created_by_id=current_user.id,
    )
    session.add(expense_in)
    session.flush()  # Flush to get expense_in.id

    # 2. Create MaintenanceEvent
    # Extract data excluding 'cost' and 'update_truck_status'/'update_trailer_status' (if present)
    event_data = event_in.model_dump(
        exclude={"cost", "update_truck_status", "update_trailer_status"}
    )
    event = MaintenanceEvent(**event_data, expense_id=expense_in.id)
    session.add(event)

    # 3. Update Truck/Trailer Status if requested
    if getattr(event_in, "update_truck_status", False) and event_in.truck_id:
        truck = session.get(Truck, event_in.truck_id)
        if truck:
            truck.status = TruckStatus.maintenance
            session.add(truck)

    if getattr(event_in, "update_trailer_status", False) and event_in.trailer_id:
        trailer = session.get(Trailer, event_in.trailer_id)
        if trailer:
            trailer.status = TrailerStatus.maintenance
            session.add(trailer)

    # 4. Commit transaction
    commit_or_rollback(session)
    session.refresh(event)
    return event


@router.get("/available-expenses", response_model=AvailableExpensesPublic)
def read_available_expenses(
    session: SessionDep,
    _current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> Any:
    """
    Get maintenance expenses NOT already linked to a MaintenanceEvent.
    Matches both:
      - Expenses with category='Maintenance' (from 'New Record' flow)
      - Expenses whose metadata item_name is maintenance-related
    Used by the 'Already Applied' flow.
    """
    # Get expense_ids already linked to maintenance events
    linked_subquery = select(MaintenanceEvent.expense_id)

    # Base filter: not linked, valid status
    base_filters = [
        ExpenseRequest.id.not_in(linked_subquery),
        ExpenseRequest.status.in_(
            [
                ExpenseStatus.pending_manager,
                ExpenseStatus.pending_finance,
                ExpenseStatus.paid,
            ]
        ),
    ]

    # Match expenses by category OR by metadata item_name
    maintenance_filter = _maintenance_expense_filter(session)

    query = (
        select(ExpenseRequest)
        .where(maintenance_filter)
        .where(*base_filters)
        .order_by(ExpenseRequest.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    count_query = (
        select(func.count())
        .select_from(ExpenseRequest)
        .where(maintenance_filter)
        .where(*base_filters)
    )

    count = session.exec(count_query).one()
    expenses = session.exec(query).all()

    return AvailableExpensesPublic(data=expenses, count=count)


@router.post("/link-expense", response_model=MaintenanceEventPublic)
def link_expense_to_maintenance(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    event_in: MaintenanceEventLinkExpense,
) -> Any:
    """
    Create a MaintenanceEvent linked to an existing office expense.
    Does NOT create a new expense — uses the one already in the system.
    Used by the 'Already Applied' flow.
    """
    assert_user_has_permission(
        current_user,
        Permission.FLEET_MAINTENANCE_EDIT,
        detail="Not enough permissions to create maintenance events",
    )

    # 1. Validate expense exists
    expense = session.get(ExpenseRequest, event_in.expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # 2. Validate expense is a maintenance expense
    is_maintenance_category = expense.category == ExpenseCategory.maintenance
    if not is_maintenance_category:
        item_name = (expense.expense_metadata or {}).get("item_name")
        if not _is_maintenance_item_name(item_name, _maintenance_type_names(session)):
            raise HTTPException(
                status_code=400,
                detail="Expense must be a maintenance expense",
            )

    # 3. Validate expense not already linked to another MaintenanceEvent
    existing_link = session.exec(
        select(MaintenanceEvent).where(
            MaintenanceEvent.expense_id == event_in.expense_id
        )
    ).first()
    if existing_link:
        raise HTTPException(
            status_code=409,
            detail="This expense is already linked to a maintenance record",
        )

    # 4. Validate truck or trailer is provided
    if not event_in.truck_id and not event_in.trailer_id:
        raise HTTPException(
            status_code=400,
            detail="Either truck_id or trailer_id must be provided",
        )

    # 5. Create MaintenanceEvent linked to existing expense
    event = MaintenanceEvent(
        truck_id=event_in.truck_id,
        trailer_id=event_in.trailer_id,
        garage_name=event_in.garage_name,
        description=event_in.description,
        start_date=event_in.start_date,
        end_date=event_in.end_date,
        currency=expense.currency,
        expense_id=expense.id,
    )
    session.add(event)

    # 6. Update Truck/Trailer Status if requested
    if event_in.update_truck_status and event_in.truck_id:
        truck = session.get(Truck, event_in.truck_id)
        if truck:
            truck.status = TruckStatus.maintenance
            session.add(truck)

    if event_in.update_trailer_status and event_in.trailer_id:
        trailer = session.get(Trailer, event_in.trailer_id)
        if trailer:
            trailer.status = TrailerStatus.maintenance
            session.add(trailer)

    # 7. Commit transaction
    commit_or_rollback(session)
    session.refresh(event)
    return event


@router.get("/{id}", response_model=MaintenanceEventPublic)
def read_maintenance_event(
    session: SessionDep,
    _current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """
    Get maintenance event by ID.
    """
    event = session.get(MaintenanceEvent, id)
    if not event:
        raise HTTPException(status_code=404, detail="Maintenance event not found")
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
    # RBAC: Only admin, manager, and ops can update maintenance events
    assert_user_has_permission(
        current_user,
        Permission.FLEET_MAINTENANCE_EDIT,
        detail="Not enough permissions to update maintenance events",
    )

    event = session.get(MaintenanceEvent, id)
    if not event:
        raise HTTPException(status_code=404, detail="Maintenance event not found")

    update_dict = event_in.model_dump(exclude_unset=True)

    # Handle cost and currency update -> ExpenseRequest update
    expense = session.get(ExpenseRequest, event.expense_id)
    if expense:
        if "cost" in update_dict:
            expense.amount = update_dict["cost"]
            session.add(expense)
        if "currency" in update_dict:
            expense.currency = update_dict["currency"]
            session.add(expense)

    # Pop cost from update_dict as it's not in MaintenanceEvent model
    if "cost" in update_dict:
        update_dict.pop("cost")

    event.sqlmodel_update(update_dict)
    session.add(event)
    commit_or_rollback(session)
    session.refresh(event)
    return event


@router.delete("/{id}", status_code=204)
def delete_maintenance_event(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> None:
    """
    Delete a maintenance event.
    Also deletes the associated ExpenseRequest.
    """
    # RBAC: Only admin can delete maintenance events
    assert_user_has_permission(
        current_user,
        Permission.FLEET_MAINTENANCE_DELETE,
        detail="Only admin can delete maintenance events",
    )

    event = session.get(MaintenanceEvent, id)
    if not event:
        raise HTTPException(status_code=404, detail="Maintenance event not found")

    # AC-4: Block deletion if the linked expense has already been paid
    expense = (
        session.get(ExpenseRequest, event.expense_id) if event.expense_id else None
    )
    if expense and expense.status == ExpenseStatus.paid:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete — the linked expense has already been paid. Void the expense first.",
        )

    session.delete(event)

    # Also delete expense if no money has moved (Pending Manager / Pending Finance).
    # Rejected / Returned / Voided expenses are left as orphaned historical records.
    deletable_statuses = {ExpenseStatus.pending_manager, ExpenseStatus.pending_finance}
    if expense and expense.status in deletable_statuses:
        session.delete(expense)

    commit_or_rollback(session)
