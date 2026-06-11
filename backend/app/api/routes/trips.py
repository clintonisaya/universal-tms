"""
Trip Creation & Dispatch - Story 2.1
CRUD endpoints for trip management with transactional integrity.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from sqlalchemy.orm.attributes import flag_modified
from sqlmodel import func, or_, select

logger = logging.getLogger(__name__)

from app.api.deps import CurrentUser, SessionDep, assert_user_has_permission
from app.api.routes.dashboard import invalidate_dashboard_cache
from app.core.db import commit_or_rollback
from app.core.storage import storage
from app.modules.documents import (
    TRIP_ATTACHMENT_POLICY,
    DocumentError,
    enrich_attachment_urls,
    generate_storage_key,
    validate_attachment,
)
from app.modules.permissions import Permission
from app.modules.transport_journey import (
    CLOSED_STATUSES,
    InvalidTransitionError,
    ReturnWaybillRequiredError,
    active_go_waybill_status_for_attached_trip,
    apply_status_date_effects,
    border_departure_auto_status,
    driver_status_for_trip,
    generate_trip_number,
    go_waybill_status_for_trip,
    is_driver_available,
    is_reopen_transition,
    is_trailer_available,
    is_truck_available,
    plan_status_update,
    return_waybill_status_for_trip,
    trailer_status_for_trip,
    truck_status_for_trip,
    trip_status_metadata,
)
from app.models import (
    AttachReturnWaybillRequest,
    BorderPost,
    BorderPostPublic,
    Driver,
    DriverPublic,
    DriverStatus,
    DriversPublic,
    ExpenseRequest,
    Message,
    Trailer,
    TrailerPublic,
    TrailerStatus,
    TrailersPublic,
    Trip,
    TripBorderCrossing,
    TripBorderCrossingPublic,
    TripBorderCrossingUpsert,
    TripCreate,
    TripPublic,
    TripPublicDetailed,
    TripsPublic,
    TripStatus,
    TripSwapTruck,
    TripUpdate,
    Truck,
    TruckPublic,
    TruckStatus,
    TrucksPublic,
    Waybill,
    WaybillBorder,
    WaybillStatus,
)

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("/available-trucks", response_model=TrucksPublic)
def get_available_trucks(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get trucks that are available for assignment (Idle or Offloaded)."""
    statement = select(Truck).where(
        or_(Truck.status == TruckStatus.idle, Truck.status == TruckStatus.offloaded)
    )
    trucks = session.exec(statement).all()
    return TrucksPublic(data=trucks, count=len(trucks))


@router.get("/available-trailers", response_model=TrailersPublic)
def get_available_trailers(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get trailers that are available for assignment (Idle or Offloaded)."""
    statement = select(Trailer).where(
        or_(
            Trailer.status == TrailerStatus.idle,
            Trailer.status == TrailerStatus.offloaded,
        )
    )
    trailers = session.exec(statement).all()
    return TrailersPublic(data=trailers, count=len(trailers))


@router.get("/available-drivers", response_model=DriversPublic)
def get_available_drivers(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get drivers that are available for assignment (Active only)."""
    statement = select(Driver).where(Driver.status == DriverStatus.active)
    drivers = session.exec(statement).all()
    return DriversPublic(data=drivers, count=len(drivers))


@router.get("", response_model=TripsPublic)
def read_trips(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> Any:
    """Retrieve all trips with waybill enrichment (Story 4.6)."""
    count_statement = select(func.count()).select_from(Trip)
    count = session.exec(count_statement).one()
    statement = (
        select(Trip).order_by(Trip.created_at.desc()).offset(skip).limit(limit)
    )
    trips = session.exec(statement).all()

    # Enrich trips with waybill data and location_update_time
    enriched: list[dict] = []
    # Batch-fetch go waybills
    waybill_ids = [t.waybill_id for t in trips if t.waybill_id]
    waybill_map: dict[uuid.UUID, Waybill] = {}
    if waybill_ids:
        wbs = session.exec(select(Waybill).where(Waybill.id.in_(waybill_ids))).all()
        waybill_map = {wb.id: wb for wb in wbs}
    # Batch-fetch return waybills
    return_waybill_ids = [t.return_waybill_id for t in trips if t.return_waybill_id]
    return_waybill_map: dict[uuid.UUID, Waybill] = {}
    if return_waybill_ids:
        rwbs = session.exec(select(Waybill).where(Waybill.id.in_(return_waybill_ids))).all()
        return_waybill_map = {rwb.id: rwb for rwb in rwbs}

    for trip in trips:
        trip_data = TripPublic.model_validate(trip)
        # Go waybill enrichment
        if trip.waybill_id and trip.waybill_id in waybill_map:
            wb = waybill_map[trip.waybill_id]
            trip_data.waybill_rate = wb.agreed_rate
            trip_data.waybill_currency = wb.currency
            trip_data.waybill_risk_level = wb.risk_level
        # Return waybill enrichment
        if trip.return_waybill_id and trip.return_waybill_id in return_waybill_map:
            rwb = return_waybill_map[trip.return_waybill_id]
            trip_data.return_waybill_number = rwb.waybill_number
            trip_data.return_route_name = f"{rwb.origin} → {rwb.destination}"
            trip_data.return_waybill_rate = rwb.agreed_rate
            trip_data.return_waybill_currency = rwb.currency
        # Location update time: when the trip record was last touched by a user
        trip_data.location_update_time = trip.updated_at or trip.created_at
        enriched.append(trip_data)

    return TripsPublic(data=enriched, count=count)


@router.get("/status-metadata")
def get_trip_status_metadata(
    current_user: CurrentUser,
) -> Any:
    """Return Transport Journey transition metadata for UI adapters."""
    _ = current_user
    return trip_status_metadata()


@router.get("/{id}", response_model=TripPublicDetailed)
def read_trip(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Get trip by ID with detailed information including waybill numbers."""
    trip = session.get(Trip, id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip_data = TripPublicDetailed.model_validate(trip)
    # Enrich with waybill numbers so frontend can display human-readable IDs
    if trip.waybill_id:
        wb = session.get(Waybill, trip.waybill_id)
        if wb:
            trip_data.waybill_rate = wb.agreed_rate
            trip_data.waybill_currency = wb.currency
            trip_data.waybill_risk_level = wb.risk_level
            trip_data.waybill_number = wb.waybill_number
    if trip.return_waybill_id:
        rwb = session.get(Waybill, trip.return_waybill_id)
        if rwb:
            trip_data.return_waybill_number = rwb.waybill_number
            trip_data.return_route_name = f"{rwb.origin} → {rwb.destination}"
            trip_data.return_waybill_rate = rwb.agreed_rate
            trip_data.return_waybill_currency = rwb.currency
    return trip_data


@router.post("", response_model=TripPublic)
def create_trip(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    trip_in: TripCreate,
) -> Any:
    """
    Create a new trip with transactional integrity.

    - Validates truck, trailer, and driver availability
    - Creates trip with status "Waiting"
    - Updates truck status to "Waiting"
    - Updates trailer status to "Waiting"
    - Updates driver status to "Assigned"
    """
    # RBAC: Only admin, manager, and ops can create trips
    assert_user_has_permission(
        current_user,
        Permission.TRIPS_CREATE,
        detail="Not enough permissions to create trips",
    )

    # Validate and fetch truck
    truck = session.get(Truck, trip_in.truck_id)
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    if not is_truck_available(truck):
        raise HTTPException(status_code=400, detail="Truck is not available")

    # Validate and fetch trailer
    trailer = session.get(Trailer, trip_in.trailer_id)
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")
    if not is_trailer_available(trailer):
        raise HTTPException(status_code=400, detail="Trailer is not available")

    # Validate and fetch driver
    driver = session.get(Driver, trip_in.driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if not is_driver_available(driver):
        raise HTTPException(status_code=400, detail="Driver is not available")

    # Generate trip number
    trip_number = generate_trip_number(session, truck.plate_number)

    # Create trip - all operations in same session (transactional)
    trip = Trip.model_validate(trip_in, update={
        "trip_number": trip_number,
        "created_by_id": current_user.id,
    })
    session.add(trip)

    # Update statuses
    truck.status = TruckStatus.waiting
    trailer.status = TrailerStatus.waiting
    driver.status = DriverStatus.assigned
    session.add(truck)
    session.add(trailer)
    session.add(driver)

    # Update waybill status if linked
    if trip_in.waybill_id:
        waybill = session.get(Waybill, trip_in.waybill_id)
        if waybill:
            waybill.status = WaybillStatus.in_progress
            session.add(waybill)

    commit_or_rollback(session)
    session.refresh(trip)
    invalidate_dashboard_cache()
    return trip


@router.patch("/{id}", response_model=TripPublic)
def update_trip(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    trip_in: TripUpdate,
) -> Any:
    """
    Update a trip.

    Status changes are synchronized to truck and trailer.
    Manager/Admin can reopen closed trips (Completed/Cancelled -> active status).
    """
    # RBAC: Only admin, manager, and ops can update trips
    assert_user_has_permission(
        current_user,
        Permission.TRIPS_EDIT,
        detail="Not enough permissions to update trips",
    )

    trip = session.get(Trip, id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    update_dict = trip_in.model_dump(exclude_unset=True)

    # Extract cancellation control flags before applying to trip model (not DB columns)
    cancel_go_waybill = update_dict.pop("cancel_go_waybill", True)
    cancel_return_waybill = update_dict.pop("cancel_return_waybill", True)
    # Default None to True (cancel both by default)
    if cancel_go_waybill is None:
        cancel_go_waybill = True
    if cancel_return_waybill is None:
        cancel_return_waybill = True

    # Handle status change with synchronized updates
    if "status" in update_dict:
        current_status = TripStatus(trip.status) if isinstance(trip.status, str) else trip.status
        try:
            status_plan = plan_status_update(
                current_status=current_status,
                requested_status=update_dict["status"],
                update_values=update_dict,
                has_return_waybill=bool(trip.return_waybill_id),
            )
        except (InvalidTransitionError, ReturnWaybillRequiredError) as exc:
            raise HTTPException(status_code=422, detail=exc.detail)
        new_status = status_plan.status
        update_dict = status_plan.update_values

        # Check if this is a reopen operation (Completed/Cancelled -> active)
        is_reopen = is_reopen_transition(current_status, new_status)
        if is_reopen:
            # Only Manager/Admin can reopen closed trips
            assert_user_has_permission(
                current_user,
                Permission.TRIPS_REOPEN,
                detail="Only Manager or Admin can reopen completed/cancelled trips",
            )

            # Check if truck is available for reopening
            truck = session.get(Truck, trip.truck_id)
            if truck and truck.status not in (TruckStatus.idle, TruckStatus.offloaded):
                # Check if truck is on another active trip
                other_trip = session.exec(
                    select(Trip)
                    .where(Trip.truck_id == trip.truck_id)
                    .where(Trip.id != trip.id)
                    .where(Trip.status.notin_([TripStatus.completed.value, TripStatus.cancelled.value]))
                ).first()
                if other_trip:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot reopen trip: Truck {truck.plate_number} is currently on Trip {other_trip.trip_number}. "
                               f"Complete or cancel that trip first, or swap the truck."
                    )

            # Check if trailer is available for reopening
            if trip.trailer_id:
                trailer = session.get(Trailer, trip.trailer_id)
                if trailer and trailer.status not in (TrailerStatus.idle, TrailerStatus.offloaded):
                    other_trip = session.exec(
                        select(Trip)
                        .where(Trip.trailer_id == trip.trailer_id)
                        .where(Trip.id != trip.id)
                        .where(Trip.status.notin_([TripStatus.completed.value, TripStatus.cancelled.value]))
                    ).first()
                    if other_trip:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Cannot reopen trip: Trailer {trailer.plate_number} is currently on Trip {other_trip.trip_number}. "
                                   f"Complete or cancel that trip first."
                        )

        # Update truck status
        truck = session.get(Truck, trip.truck_id)
        truck_status = truck_status_for_trip(new_status)
        if truck and truck_status:
            truck.status = truck_status
            session.add(truck)

        # Update trailer status (synchronized with truck)
        trailer = session.get(Trailer, trip.trailer_id)
        trailer_status = trailer_status_for_trip(new_status)
        if trailer and trailer_status:
            trailer.status = trailer_status
            session.add(trailer)

        # Update driver status based on trip status
        driver = session.get(Driver, trip.driver_id)
        driver_status = driver_status_for_trip(new_status)
        if driver and driver_status:
            driver.status = driver_status
            session.add(driver)

        update_dict = apply_status_date_effects(
            status=new_status,
            update_values=update_dict,
            existing_dispatch_date=trip.dispatch_date,
            existing_arrival_return_date=trip.arrival_return_date,
        )

        # Story 2.25: Update go waybill status (dual waybill sync)
        # Never touch a waybill that has already been Invoiced — it is financially locked.
        go_waybill_status = go_waybill_status_for_trip(new_status)
        if trip.waybill_id and go_waybill_status:
            go_waybill = session.get(Waybill, trip.waybill_id)
            if go_waybill and go_waybill.status != WaybillStatus.invoiced:
                if new_status == TripStatus.cancelled:
                    if cancel_go_waybill:
                        go_waybill.status = WaybillStatus.open
                        session.add(go_waybill)
                else:
                    go_waybill.status = go_waybill_status
                    session.add(go_waybill)

        # Story 2.25: Update return waybill status (if attached)
        # Never touch a waybill that has already been Invoiced — it is financially locked.
        return_waybill_status = return_waybill_status_for_trip(new_status)
        if trip.return_waybill_id and return_waybill_status:
            return_waybill = session.get(Waybill, trip.return_waybill_id)
            if return_waybill and return_waybill.status != WaybillStatus.invoiced:
                if new_status == TripStatus.cancelled:
                    if cancel_return_waybill:
                        return_waybill.status = WaybillStatus.open
                        session.add(return_waybill)
                else:
                    return_waybill.status = return_waybill_status
                    session.add(return_waybill)

    # --- Truck change: sync statuses, regenerate trip number & migrate expenses ---
    if "truck_id" in update_dict and update_dict["truck_id"] != trip.truck_id:
        # Set old truck back to idle
        old_truck = session.get(Truck, trip.truck_id)
        if old_truck:
            old_truck.status = TruckStatus.idle
            session.add(old_truck)

        new_truck_for_renumber = session.get(Truck, update_dict["truck_id"])
        if new_truck_for_renumber:
            # Set new truck status to match current trip status
            current_status = TripStatus(trip.status) if isinstance(trip.status, str) else trip.status
            new_truck_for_renumber.status = (
                truck_status_for_trip(current_status) or TruckStatus.in_transit
            )
            session.add(new_truck_for_renumber)

            # Regenerate trip number based on new truck
            old_trip_number = trip.trip_number
            new_trip_number = generate_trip_number(session, new_truck_for_renumber.plate_number)
            update_dict["trip_number"] = new_trip_number

            # Migrate expense numbers
            expenses = session.exec(
                select(ExpenseRequest).where(ExpenseRequest.trip_id == trip.id)
            ).all()
            for expense in expenses:
                if expense.expense_number and old_trip_number in expense.expense_number:
                    expense.expense_number = expense.expense_number.replace(
                        old_trip_number, new_trip_number, 1
                    )
                    session.add(expense)

            logger.info(
                "Truck change: trip %s renumbered %s → %s, %d expenses migrated",
                trip.id, old_trip_number, new_trip_number, len(expenses),
            )

    # Sync waybill status when waybill_id is being newly attached without a status change
    if "waybill_id" in update_dict and "status" not in update_dict:
        new_waybill_id = update_dict["waybill_id"]
        old_waybill_id = trip.waybill_id

        # Release the old waybill if it's being replaced — never touch an Invoiced waybill.
        if old_waybill_id and old_waybill_id != new_waybill_id:
            old_wb = session.get(Waybill, old_waybill_id)
            if old_wb and old_wb.status != WaybillStatus.invoiced:
                old_wb.status = WaybillStatus.open
                session.add(old_wb)

        # Mark the new waybill according to the trip's current status.
        # A waybill attached to any active (non-cancelled) trip is at minimum In Progress.
        if new_waybill_id:
            current_trip_status = TripStatus(trip.status) if isinstance(trip.status, str) else trip.status
            new_wb = session.get(Waybill, new_waybill_id)
            if new_wb:
                new_wb.status = active_go_waybill_status_for_attached_trip(
                    current_trip_status
                )
                session.add(new_wb)

    trip.sqlmodel_update(update_dict)
    trip.updated_by_id = current_user.id  # Story 6.13: audit trail
    session.add(trip)
    commit_or_rollback(session)
    session.refresh(trip)
    invalidate_dashboard_cache()
    return trip


@router.get("/{id}/swap-truck-preview")
def swap_truck_preview(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    truck_id: uuid.UUID = Query(..., description="New truck ID to preview swap"),
) -> Any:
    """
    Preview what a truck swap would change (trip number, expense count).
    Does NOT modify any data — read-only preview for confirmation dialog.
    """
    assert_user_has_permission(current_user, Permission.TRIPS_EDIT)

    trip = session.get(Trip, id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    new_truck = session.get(Truck, truck_id)
    if not new_truck:
        raise HTTPException(status_code=404, detail="New truck not found")
    if not is_truck_available(new_truck):
        raise HTTPException(status_code=400, detail="New truck is not available")

    # Count linked expenses (trip-linked only, not office expenses)
    expense_count_stmt = (
        select(func.count())
        .select_from(ExpenseRequest)
        .where(ExpenseRequest.trip_id == trip.id)
    )
    expense_count = session.exec(expense_count_stmt).one()

    return {
        "current_trip_number": trip.trip_number,
        "new_truck_plate": new_truck.plate_number,
        "expenses_to_renumber": expense_count,
    }


@router.put("/{id}/swap-truck", response_model=TripPublic)
def swap_truck(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    swap_in: TripSwapTruck,
) -> Any:
    """
    Swap truck during an active trip (breakdown handling).

    - Old truck status changes to Idle
    - New truck takes the current trip status
    - Trip number is regenerated based on new truck's plate
    - Linked expense numbers are updated to reflect the new trip number
    """
    # RBAC: Only admin, manager, and ops can swap trucks
    assert_user_has_permission(
        current_user,
        Permission.TRIPS_EDIT,
        detail="Not enough permissions to swap trucks",
    )

    trip = session.get(Trip, id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Validate new truck
    new_truck = session.get(Truck, swap_in.truck_id)
    if not new_truck:
        raise HTTPException(status_code=404, detail="New truck not found")
    if not is_truck_available(new_truck):
        raise HTTPException(status_code=400, detail="New truck is not available")

    # Get old truck and set to idle
    old_truck = session.get(Truck, trip.truck_id)
    if old_truck:
        old_truck.status = TruckStatus.idle
        session.add(old_truck)

    # Set new truck to current trip status
    new_truck.status = truck_status_for_trip(trip.status) or TruckStatus.in_transit
    session.add(new_truck)

    # --- Trip number regeneration ---
    old_trip_number = trip.trip_number
    new_trip_number = generate_trip_number(session, new_truck.plate_number)
    trip.trip_number = new_trip_number

    # --- Expense number migration ---
    expenses = session.exec(
        select(ExpenseRequest).where(ExpenseRequest.trip_id == trip.id)
    ).all()
    for expense in expenses:
        if expense.expense_number and old_trip_number in expense.expense_number:
            expense.expense_number = expense.expense_number.replace(
                old_trip_number, new_trip_number, 1
            )
            session.add(expense)

    logger.info(
        "Truck swap: trip %s renumbered %s → %s, %d expenses migrated",
        trip.id, old_trip_number, new_trip_number, len(expenses),
    )

    # Update trip with new truck
    trip.truck_id = swap_in.truck_id
    trip.updated_by_id = current_user.id
    session.add(trip)

    commit_or_rollback(session)
    session.refresh(trip)
    return trip


@router.patch("/{id}/attach-return-waybill", response_model=TripPublic)
def attach_return_waybill(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    request: AttachReturnWaybillRequest,
) -> Any:
    """
    Attach a return waybill to a trip (Story 2.25).

    - Only allowed when trip status is 'Offloaded'
    - The waybill must be 'Open' and not linked to another active trip
    - Sets the return waybill to 'In Progress' immediately
    """
    assert_user_has_permission(
        current_user,
        Permission.TRIPS_EDIT,
        detail="Not enough permissions to update trips",
    )

    trip = session.get(Trip, id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Validate trip is at Offloading or Offloaded status
    current_status = TripStatus(trip.status) if isinstance(trip.status, str) else trip.status
    if current_status not in (TripStatus.offloading, TripStatus.offloaded):
        raise HTTPException(
            status_code=422,
            detail="Return waybill can only be attached when trip status is 'Offloading' or 'Offloaded'"
        )

    # Validate waybill exists
    return_waybill = session.get(Waybill, request.return_waybill_id)
    if not return_waybill:
        raise HTTPException(status_code=404, detail="Waybill not found")

    # Validate waybill is Open
    if return_waybill.status != WaybillStatus.open:
        raise HTTPException(
            status_code=422,
            detail="Return waybill must have status 'Open'"
        )

    # Validate waybill is not the same as the go waybill
    if trip.waybill_id == request.return_waybill_id:
        raise HTTPException(
            status_code=422,
            detail="Return waybill cannot be the same as the Go waybill"
        )

    # Validate waybill is not already linked to another active trip
    existing_trip = session.exec(
        select(Trip)
        .where(
            or_(
                Trip.waybill_id == request.return_waybill_id,
                Trip.return_waybill_id == request.return_waybill_id,
            )
        )
        .where(Trip.id != id)
        .where(Trip.status.notin_([TripStatus.completed.value, TripStatus.cancelled.value]))
    ).first()
    if existing_trip:
        raise HTTPException(
            status_code=422,
            detail=f"Waybill is already linked to active trip {existing_trip.trip_number}"
        )

    # Attach return waybill and activate it
    trip.return_waybill_id = request.return_waybill_id

    # Auto-advance to Waiting (Return) so the return leg flow begins
    trip.status = TripStatus.waiting_return
    trip.updated_at = datetime.now(timezone.utc)
    trip.updated_by_id = current_user.id
    session.add(trip)

    return_waybill.status = WaybillStatus.in_progress
    session.add(return_waybill)

    commit_or_rollback(session)
    session.refresh(trip)
    return trip


@router.delete("/{id}", status_code=204)
def delete_trip(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> None:
    """Delete a trip."""
    # RBAC: Only admin can delete trips
    assert_user_has_permission(
        current_user,
        Permission.TRIPS_DELETE,
        detail="Only admin can delete trips",
    )

    trip = session.get(Trip, id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Reset resource statuses
    truck = session.get(Truck, trip.truck_id)
    if truck:
        truck.status = TruckStatus.idle
        session.add(truck)

    trailer = session.get(Trailer, trip.trailer_id)
    if trailer:
        trailer.status = TrailerStatus.idle
        session.add(trailer)

    driver = session.get(Driver, trip.driver_id)
    if driver:
        driver.status = DriverStatus.active
        session.add(driver)

    # Reset go waybill status back to Open if linked
    if trip.waybill_id:
        waybill = session.get(Waybill, trip.waybill_id)
        if waybill:
            waybill.status = WaybillStatus.open
            session.add(waybill)

    # Story 2.25: Reset return waybill status back to Open if linked
    if trip.return_waybill_id:
        return_waybill = session.get(Waybill, trip.return_waybill_id)
        if return_waybill:
            return_waybill.status = WaybillStatus.open
            session.add(return_waybill)

    session.delete(trip)
    commit_or_rollback(session)


# ============================================================================
# Border Crossing Endpoints - Story 2.26
# ============================================================================


def _get_next_uncompleted_border(
    trip_id: uuid.UUID,
    direction: str,
    session: SessionDep,
) -> BorderPost | None:
    """
    Returns the current active or next pending border post for the given direction.

    Priority:
    1. An IN-PROGRESS border: has arrived_side_a_at set but departed_border_at is NULL.
       (Truck is at this border — dates should still be editable.)
    2. The next PENDING border: no crossing record yet (or arrived_side_a_at IS NULL).

    A border is 'completed' only when departed_border_at IS NOT NULL (truck has left
    the border zone). Until then, the same border keeps showing so dates can be
    progressively updated.
    """
    trip = session.get(Trip, trip_id)
    if not trip:
        return None

    waybill_id = trip.waybill_id if direction == "go" else trip.return_waybill_id
    if not waybill_id:
        return None

    # Load ordered borders for the waybill
    borders_stmt = (
        select(WaybillBorder, BorderPost)
        .join(BorderPost, BorderPost.id == WaybillBorder.border_post_id)
        .where(WaybillBorder.waybill_id == waybill_id)
        .order_by(WaybillBorder.sequence.asc())
    )
    border_rows = session.execute(borders_stmt).all()
    if not border_rows:
        return None

    # Reverse order for return leg
    if direction == "return":
        border_rows = list(reversed(border_rows))

    # Load all crossings for this trip + direction
    crossings_stmt = (
        select(TripBorderCrossing)
        .where(TripBorderCrossing.trip_id == trip_id)
        .where(TripBorderCrossing.direction == direction)
    )
    crossings = {c.border_post_id: c for c in session.exec(crossings_stmt).all()}

    # Priority 1: return the in-progress border (started but not departed)
    for _wb_border, border_post in border_rows:
        crossing = crossings.get(border_post.id)
        if crossing and crossing.arrived_side_a_at is not None and crossing.departed_border_at is None:
            return border_post

    # Priority 2: return the first not-yet-started border
    for _wb_border, border_post in border_rows:
        crossing = crossings.get(border_post.id)
        if crossing is None or crossing.arrived_side_a_at is None:
            return border_post

    return None  # All borders fully completed (departed_border_at set on all)


@router.get("/{trip_id}/border-crossings", response_model=list[TripBorderCrossingPublic])
def get_trip_border_crossings(
    session: SessionDep,
    current_user: CurrentUser,
    trip_id: uuid.UUID,
) -> Any:
    """Get all recorded border crossings for a trip."""
    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    crossings_stmt = (
        select(TripBorderCrossing, BorderPost)
        .join(BorderPost, BorderPost.id == TripBorderCrossing.border_post_id)
        .where(TripBorderCrossing.trip_id == trip_id)
        .order_by(TripBorderCrossing.direction, TripBorderCrossing.created_at)
    )
    rows = session.execute(crossings_stmt).all()

    return [
        TripBorderCrossingPublic(
            id=crossing.id,
            trip_id=crossing.trip_id,
            border_post_id=crossing.border_post_id,
            direction=crossing.direction,
            arrived_side_a_at=crossing.arrived_side_a_at,
            documents_submitted_side_a_at=crossing.documents_submitted_side_a_at,
            documents_cleared_side_a_at=crossing.documents_cleared_side_a_at,
            arrived_side_b_at=crossing.arrived_side_b_at,
            departed_border_at=crossing.departed_border_at,
            created_at=crossing.created_at,
            updated_at=crossing.updated_at,
            border_post=border,
        )
        for crossing, border in rows
    ]


@router.get("/{trip_id}/next-border", response_model=BorderPostPublic | None)
def get_next_border(
    session: SessionDep,
    current_user: CurrentUser,
    trip_id: uuid.UUID,
    direction: str = "go",
) -> Any:
    """
    Returns the next uncompleted border post for a trip in the given direction.
    Returns null if all borders are completed or no borders declared.
    """
    if direction not in ("go", "return"):
        raise HTTPException(status_code=422, detail="direction must be 'go' or 'return'")

    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    return _get_next_uncompleted_border(trip_id, direction, session)


@router.put("/{trip_id}/border-crossings/{border_post_id}", response_model=TripBorderCrossingPublic)
def upsert_border_crossing(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    trip_id: uuid.UUID,
    border_post_id: uuid.UUID,
    crossing_in: TripBorderCrossingUpsert,
) -> Any:
    """
    Upsert a border crossing record for a trip.
    Creates a new record or updates an existing one (matched by trip_id + border_post_id + direction).
    All 7 date fields are optional and can be filled progressively.
    """
    assert_user_has_permission(
        current_user,
        Permission.TRIPS_EDIT,
        detail="Not enough permissions to record border crossings",
    )

    trip = session.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    border_post = session.get(BorderPost, border_post_id)
    if not border_post:
        raise HTTPException(status_code=404, detail="Border post not found")

    if crossing_in.direction not in ("go", "return"):
        raise HTTPException(status_code=422, detail="direction must be 'go' or 'return'")

    # Try to find existing record
    existing = session.exec(
        select(TripBorderCrossing)
        .where(TripBorderCrossing.trip_id == trip_id)
        .where(TripBorderCrossing.border_post_id == border_post_id)
        .where(TripBorderCrossing.direction == crossing_in.direction)
    ).first()

    date_fields = [
        "arrived_side_a_at",
        "documents_submitted_side_a_at",
        "documents_cleared_side_a_at",
        "arrived_side_b_at",
        "departed_border_at",
    ]

    if existing:
        for field in date_fields:
            value = getattr(crossing_in, field, None)
            if value is not None:
                setattr(existing, field, value)
        existing.updated_at = datetime.now(timezone.utc)
        session.add(existing)
        crossing = existing
    else:
        crossing = TripBorderCrossing(
            trip_id=trip_id,
            border_post_id=border_post_id,
            **crossing_in.model_dump(),
        )
        session.add(crossing)

    # Auto-advance trip status when truck departs the border zone
    current_trip_status = TripStatus(trip.status) if isinstance(trip.status, str) else trip.status
    if crossing.departed_border_at:
        auto_status = border_departure_auto_status(
            current_trip_status,
            crossing_in.direction,
        )

        if auto_status:
            trip.status = auto_status
            trip.updated_at = datetime.now(timezone.utc)
            truck = session.get(Truck, trip.truck_id)
            truck_status = truck_status_for_trip(auto_status)
            if truck and truck_status:
                truck.status = truck_status
                session.add(truck)
            trailer = session.get(Trailer, trip.trailer_id)
            trailer_status = trailer_status_for_trip(auto_status)
            if trailer and trailer_status:
                trailer.status = trailer_status
                session.add(trailer)
            driver = session.get(Driver, trip.driver_id)
            driver_status = driver_status_for_trip(auto_status)
            if driver and driver_status:
                driver.status = driver_status
                session.add(driver)
            session.add(trip)

    commit_or_rollback(session)
    session.refresh(crossing)

    return TripBorderCrossingPublic(
        id=crossing.id,
        trip_id=crossing.trip_id,
        border_post_id=crossing.border_post_id,
        direction=crossing.direction,
        arrived_side_a_at=crossing.arrived_side_a_at,
        documents_submitted_side_a_at=crossing.documents_submitted_side_a_at,
        documents_cleared_side_a_at=crossing.documents_cleared_side_a_at,
        arrived_side_b_at=crossing.arrived_side_b_at,
        departed_border_at=crossing.departed_border_at,
        created_at=crossing.created_at,
        updated_at=crossing.updated_at,
        border_post=border_post,
    )


# ============================================================================
# Trip Attachments — upload, list, delete trip-level documents
# ============================================================================

# Attachment policies are defined in app.modules.documents.helpers
# TRIP_ATTACHMENT_POLICY: allowed types and max size for trip documents


@router.post("/{id}/attachment", response_model=TripPublic)
async def upload_trip_attachment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    file: UploadFile = File(...),
) -> Any:
    """
    Upload a document attachment for a trip.

    - Accepted formats: PDF, JPEG, PNG, WebP, GIF, Word (.doc/.docx), Excel (.xls/.xlsx)
    - Maximum file size: 10 MB
    - Not allowed on Completed or Cancelled trips
    - Permitted roles: admin, manager, ops
    """
    trip = session.get(Trip, id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    assert_user_has_permission(
        current_user,
        Permission.TRIPS_EDIT,
        detail="Not enough permissions to add trip attachments",
    )

    if trip.status in CLOSED_STATUSES:
        raise HTTPException(status_code=400, detail="Cannot add attachments to a completed or cancelled trip")

    # Validate file type and size against trip policy
    content = await file.read()
    try:
        validate_attachment(file.content_type, len(content), TRIP_ATTACHMENT_POLICY)
    except DocumentError as e:
        raise HTTPException(status_code=400, detail=e.detail)

    # Generate unique storage key and upload
    object_name = generate_storage_key("trips", trip.id, file.filename)
    uploaded_key = storage.upload_file(content, object_name, file.content_type)
    if not uploaded_key:
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    current_attachments = list(trip.attachments) if trip.attachments else []
    current_attachments.append(uploaded_key)
    trip.attachments = current_attachments
    flag_modified(trip, "attachments")
    trip.updated_at = datetime.now(timezone.utc)
    session.add(trip)
    commit_or_rollback(session)
    session.refresh(trip)
    return trip


@router.get("/{id}/attachments")
def get_trip_attachments(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """
    Get presigned download URLs for all attachments on a trip.
    Returns a list of {key, filename, url} objects.
    """
    trip = session.get(Trip, id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    return enrich_attachment_urls(trip.attachments or [], storage)


@router.delete("/{id}/attachment", status_code=204)
def delete_trip_attachment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    key: str = Query(..., description="Storage key of the attachment to remove"),
) -> None:
    """
    Delete a specific attachment from a trip.
    Removes from R2 storage and updates the database record.
    Not permitted on Completed or Cancelled trips.
    """
    trip = session.get(Trip, id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    assert_user_has_permission(
        current_user,
        Permission.TRIPS_EDIT,
        detail="Not enough permissions to delete trip attachments",
    )

    if trip.status in CLOSED_STATUSES:
        raise HTTPException(status_code=400, detail="Cannot modify attachments on a completed or cancelled trip")

    current_attachments = list(trip.attachments) if trip.attachments else []
    if key not in current_attachments:
        raise HTTPException(status_code=404, detail="Attachment not found")

    storage.delete_file(key)
    current_attachments.remove(key)
    trip.attachments = current_attachments
    flag_modified(trip, "attachments")
    trip.updated_at = datetime.now(timezone.utc)
    session.add(trip)
    commit_or_rollback(session)
