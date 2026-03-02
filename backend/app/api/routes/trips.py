"""
Trip Creation & Dispatch - Story 2.1
CRUD endpoints for trip management with transactional integrity.
"""
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from sqlmodel import func, or_, select
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import CurrentUser, SessionDep
from app.core.storage import storage
from app.models import (
    AttachReturnWaybillRequest,
    BorderPost,
    BorderPostPublic,
    Driver,
    DriverPublic,
    DriverStatus,
    DriversPublic,
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
    UserRole,
    Waybill,
    WaybillBorder,
    WaybillStatus,
)

# Roles allowed to create/update trips
WRITE_ROLES = {UserRole.admin, UserRole.manager, UserRole.ops}
# Roles allowed to delete trips
DELETE_ROLES = {UserRole.admin}
# Roles allowed to reopen closed trips (Completed/Cancelled -> active)
REOPEN_ROLES = {UserRole.admin, UserRole.manager}
# Closed trip statuses
CLOSED_STATUSES = {TripStatus.completed, TripStatus.cancelled}

router = APIRouter(prefix="/trips", tags=["trips"])


# Return leg statuses — require return_waybill_id to be set
RETURN_LEG_STATUSES = {
    TripStatus.waiting_return,
    TripStatus.dispatch_return,
    TripStatus.wait_to_load_return,
    TripStatus.loading_return,
    TripStatus.loaded_return,
    TripStatus.in_transit_return,
    TripStatus.at_border_return,
    TripStatus.arrived_at_destination_return,
    TripStatus.offloading_return,
    TripStatus.offloaded_return,
}

# Status mapping for synchronized truck/trailer status updates
TRIP_TO_TRUCK_STATUS = {
    TripStatus.waiting: TruckStatus.waiting,
    TripStatus.dispatch: TruckStatus.dispatch,
    TripStatus.wait_to_load: TruckStatus.wait_to_load,         # "Arrived at Loading Point"
    TripStatus.loading: TruckStatus.loading,
    TripStatus.loaded: TruckStatus.loading,                     # still loading side
    TripStatus.in_transit: TruckStatus.in_transit,
    TripStatus.at_border: TruckStatus.at_border,
    TripStatus.arrived_at_destination: TruckStatus.offloaded,   # at destination, not yet offloading
    TripStatus.offloading: TruckStatus.offloaded,
    TripStatus.offloaded: TruckStatus.offloaded,
    TripStatus.returning_empty: TruckStatus.in_transit,         # renamed from on_way_return
    TripStatus.waiting_return: TruckStatus.offloaded,
    # Return leg statuses map to equivalent go-leg truck statuses
    TripStatus.dispatch_return: TruckStatus.dispatch,
    TripStatus.wait_to_load_return: TruckStatus.wait_to_load,
    TripStatus.loading_return: TruckStatus.loading,
    TripStatus.loaded_return: TruckStatus.loading,
    TripStatus.in_transit_return: TruckStatus.in_transit,
    TripStatus.at_border_return: TruckStatus.at_border,
    TripStatus.arrived_at_destination_return: TruckStatus.offloaded,
    TripStatus.offloading_return: TruckStatus.offloaded,
    TripStatus.offloaded_return: TruckStatus.offloaded,
    TripStatus.returned: TruckStatus.returned,
    TripStatus.waiting_for_pods: TruckStatus.waiting_for_pods,
    TripStatus.completed: TruckStatus.idle,
    TripStatus.cancelled: TruckStatus.idle,
}

TRIP_TO_TRAILER_STATUS = {
    TripStatus.waiting: TrailerStatus.waiting,
    TripStatus.dispatch: TrailerStatus.dispatch,
    TripStatus.wait_to_load: TrailerStatus.wait_to_load,
    TripStatus.loading: TrailerStatus.loading,
    TripStatus.loaded: TrailerStatus.loading,
    TripStatus.in_transit: TrailerStatus.in_transit,
    TripStatus.at_border: TrailerStatus.at_border,
    TripStatus.arrived_at_destination: TrailerStatus.offloaded,
    TripStatus.offloading: TrailerStatus.offloaded,
    TripStatus.offloaded: TrailerStatus.offloaded,
    TripStatus.returning_empty: TrailerStatus.in_transit,
    TripStatus.waiting_return: TrailerStatus.offloaded,
    # Return leg statuses map to equivalent go-leg trailer statuses
    TripStatus.dispatch_return: TrailerStatus.dispatch,
    TripStatus.wait_to_load_return: TrailerStatus.wait_to_load,
    TripStatus.loading_return: TrailerStatus.loading,
    TripStatus.loaded_return: TrailerStatus.loading,
    TripStatus.in_transit_return: TrailerStatus.in_transit,
    TripStatus.at_border_return: TrailerStatus.at_border,
    TripStatus.arrived_at_destination_return: TrailerStatus.offloaded,
    TripStatus.offloading_return: TrailerStatus.offloaded,
    TripStatus.offloaded_return: TrailerStatus.offloaded,
    TripStatus.returned: TrailerStatus.returned,
    TripStatus.waiting_for_pods: TrailerStatus.waiting_for_pods,
    TripStatus.completed: TrailerStatus.idle,
    TripStatus.cancelled: TrailerStatus.idle,
}

# Go waybill status sync: waybill completes at "Offloaded" (auto after offloading_date)
TRIP_TO_GO_WAYBILL_STATUS = {
    TripStatus.waiting: WaybillStatus.open,
    TripStatus.dispatch: WaybillStatus.in_progress,
    TripStatus.wait_to_load: WaybillStatus.in_progress,
    TripStatus.loading: WaybillStatus.in_progress,
    TripStatus.loaded: WaybillStatus.in_progress,
    TripStatus.in_transit: WaybillStatus.in_progress,
    TripStatus.at_border: WaybillStatus.in_progress,
    TripStatus.arrived_at_destination: WaybillStatus.in_progress,
    TripStatus.offloading: WaybillStatus.in_progress,      # still in progress until Offloaded
    TripStatus.offloaded: WaybillStatus.completed,          # Cargo delivered — go waybill done
    TripStatus.returning_empty: WaybillStatus.completed,
    TripStatus.waiting_return: WaybillStatus.completed,
    TripStatus.dispatch_return: WaybillStatus.completed,
    TripStatus.wait_to_load_return: WaybillStatus.completed,
    TripStatus.loading_return: WaybillStatus.completed,
    TripStatus.loaded_return: WaybillStatus.completed,
    TripStatus.in_transit_return: WaybillStatus.completed,
    TripStatus.at_border_return: WaybillStatus.completed,
    TripStatus.arrived_at_destination_return: WaybillStatus.completed,
    TripStatus.offloading_return: WaybillStatus.completed,
    TripStatus.offloaded_return: WaybillStatus.completed,
    TripStatus.returned: WaybillStatus.completed,
    TripStatus.waiting_for_pods: WaybillStatus.completed,
    TripStatus.completed: WaybillStatus.completed,
    TripStatus.cancelled: WaybillStatus.open,
}

# Return waybill status sync: active during return leg, completed when offloaded
TRIP_TO_RETURN_WAYBILL_STATUS = {
    TripStatus.waiting_return: WaybillStatus.open,       # Return waybill exists but not started
    TripStatus.dispatch_return: WaybillStatus.in_progress,
    TripStatus.wait_to_load_return: WaybillStatus.in_progress,
    TripStatus.loading_return: WaybillStatus.in_progress,
    TripStatus.loaded_return: WaybillStatus.in_progress,
    TripStatus.in_transit_return: WaybillStatus.in_progress,
    TripStatus.at_border_return: WaybillStatus.in_progress,
    TripStatus.arrived_at_destination_return: WaybillStatus.in_progress,
    TripStatus.offloading_return: WaybillStatus.in_progress,   # still in progress until Offloaded (Return)
    TripStatus.offloaded_return: WaybillStatus.completed,       # Return cargo delivered — waybill done
    TripStatus.returned: WaybillStatus.completed,
    TripStatus.waiting_for_pods: WaybillStatus.completed,
    TripStatus.completed: WaybillStatus.completed,
    TripStatus.cancelled: WaybillStatus.open,
}


def is_truck_available(truck: Truck) -> bool:
    """Check if truck is available for a new trip."""
    return truck.status in (TruckStatus.idle, TruckStatus.offloaded)  # offloaded = truck-side status for Offloading


def is_trailer_available(trailer: Trailer) -> bool:
    """Check if trailer is available for a new trip."""
    return trailer.status in (TrailerStatus.idle, TrailerStatus.offloaded)


def is_driver_available(driver: Driver) -> bool:
    """Check if driver is available for a new trip."""
    return driver.status == DriverStatus.active


def generate_trip_number(session: SessionDep, plate_number: str) -> str:
    """Generate a unique trip number: <Plate>-YYYY<Seq>

    Sequence is per-vehicle per-year:
    - T512EZD-2026001 (first trip for truck T512EZD in 2026)
    - T512EZD-2026002 (second trip for truck T512EZD in 2026)
    - T556EDS-2026001 (first trip for truck T556EDS in 2026 - independent)
    - New year resets sequence to 001 for each vehicle

    Note: Plate number already includes prefix (e.g., T512EZD), no extra T added.
    """
    sanitized_plate = plate_number.replace(" ", "").upper()
    year = datetime.now().year

    # Find last sequence for THIS vehicle in THIS year
    pattern = f"{sanitized_plate}-{year}%"
    statement = (
        select(Trip.trip_number)
        .where(Trip.trip_number.like(pattern))
        .order_by(Trip.trip_number.desc())
        .limit(1)
    )
    last_trip_number = session.exec(statement).first()

    sequence = 1
    if last_trip_number:
        # Extract sequence from end (last 3 digits)
        try:
            last_seq = int(last_trip_number[-3:])
            sequence = last_seq + 1
        except ValueError:
            pass  # Fallback to 1 if parsing fails

    return f"{sanitized_plate}-{year}{sequence:03d}"


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
    skip: int = 0,
    limit: int = 100,
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
    if current_user.role not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions to create trips")

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
    trip = Trip.model_validate(trip_in, update={"trip_number": trip_number})
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

    session.commit()
    session.refresh(trip)
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
    if current_user.role not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions to update trips")

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
        new_status = TripStatus(update_dict["status"])
        current_status = TripStatus(trip.status) if isinstance(trip.status, str) else trip.status

        # Auto-advance "Loading" → "Loaded" when loading_end_date is provided
        if new_status == TripStatus.loading and update_dict.get("loading_end_date"):
            new_status = TripStatus.loaded
            update_dict["status"] = TripStatus.loaded.value

        # Auto-advance "Loading (Return)" → "Loaded (Return)" when loading_return_end_date is provided
        if new_status == TripStatus.loading_return and update_dict.get("loading_return_end_date"):
            new_status = TripStatus.loaded_return
            update_dict["status"] = TripStatus.loaded_return.value

        # Auto-advance "Offloading" → "Offloaded" when offloading_date is provided
        if new_status == TripStatus.offloading and update_dict.get("offloading_date"):
            new_status = TripStatus.offloaded
            update_dict["status"] = TripStatus.offloaded.value

        # Auto-advance "Offloading (Return)" → "Offloaded (Return)" when offloading_return_date is provided
        if new_status == TripStatus.offloading_return and update_dict.get("offloading_return_date"):
            new_status = TripStatus.offloaded_return
            update_dict["status"] = TripStatus.offloaded_return.value

        # Auto-advance to "Waiting for PODs" when arrival_return_date is provided
        # — applies to "Returning Empty", "Offloaded (Return)", and "Arrived at Yard"
        if new_status in (TripStatus.returning_empty, TripStatus.offloaded_return, TripStatus.returned) \
                and update_dict.get("arrival_return_date"):
            new_status = TripStatus.waiting_for_pods
            update_dict["status"] = TripStatus.waiting_for_pods.value

        # Auto-advance "Waiting for PODs" → "Completed" when pods_confirmed_date is provided
        if new_status == TripStatus.waiting_for_pods and update_dict.get("pods_confirmed_date"):
            new_status = TripStatus.completed
            update_dict["status"] = TripStatus.completed.value

        # Story 2.25: Block return leg statuses if no return waybill is attached
        if new_status in RETURN_LEG_STATUSES and not trip.return_waybill_id:
            raise HTTPException(
                status_code=422,
                detail="Return waybill must be attached before updating to return leg statuses"
            )

        # Protect Invoiced waybills — once invoiced, a waybill's status must not be
        # changed by trip-status automation.  Only admin/manager may override this via
        # explicit waybill editing; trip-level status changes are blocked for regular ops.
        if new_status not in CLOSED_STATUSES:  # allow completing / cancelling the trip itself
            go_wb_obj = session.get(Waybill, trip.waybill_id) if trip.waybill_id else None
            ret_wb_obj = session.get(Waybill, trip.return_waybill_id) if trip.return_waybill_id else None

            go_invoiced = go_wb_obj is not None and go_wb_obj.status == WaybillStatus.invoiced
            ret_invoiced = ret_wb_obj is not None and ret_wb_obj.status == WaybillStatus.invoiced
            # Mirror the frontend isWaybillFinalised logic: all relevant waybills are invoiced
            all_waybills_invoiced = go_invoiced and (
                trip.return_waybill_id is None or ret_invoiced
            )
            if all_waybills_invoiced and current_user.role not in REOPEN_ROLES:
                raise HTTPException(
                    status_code=403,
                    detail="Cannot update trip status: all waybills are Invoiced. Contact a Manager or Admin.",
                )

        # Check if this is a reopen operation (Completed/Cancelled -> active)
        is_reopen = current_status in CLOSED_STATUSES and new_status not in CLOSED_STATUSES
        if is_reopen:
            # Only Manager/Admin can reopen closed trips
            if current_user.role not in REOPEN_ROLES:
                raise HTTPException(
                    status_code=403,
                    detail="Only Manager or Admin can reopen completed/cancelled trips"
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
        if truck and new_status in TRIP_TO_TRUCK_STATUS:
            truck.status = TRIP_TO_TRUCK_STATUS[new_status]
            session.add(truck)

        # Update trailer status (synchronized with truck)
        trailer = session.get(Trailer, trip.trailer_id)
        if trailer and new_status in TRIP_TO_TRAILER_STATUS:
            trailer.status = TRIP_TO_TRAILER_STATUS[new_status]
            session.add(trailer)

        # Update driver status based on trip status
        driver = session.get(Driver, trip.driver_id)
        if driver:
            if new_status in (TripStatus.in_transit, TripStatus.in_transit_return):
                driver.status = DriverStatus.on_trip
                session.add(driver)
            elif new_status in (TripStatus.completed, TripStatus.cancelled):
                driver.status = DriverStatus.active
                session.add(driver)

        # Set start_date from dispatch_date when trip is dispatched
        if new_status == TripStatus.dispatch:
            dispatch_dt = update_dict.get("dispatch_date")
            if dispatch_dt:
                update_dict["start_date"] = dispatch_dt

        # Auto-record dispatch_return_date when entering Dispatch (Return)
        if new_status == TripStatus.dispatch_return:
            if "dispatch_return_date" not in update_dict:
                today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                update_dict["dispatch_return_date"] = today

        # Handle end_date for completed trips
        if new_status == TripStatus.completed:
            update_dict["end_date"] = datetime.now(timezone.utc)
            # Calculate trip duration from dispatch to return (date-only diff)
            dispatch_dt = update_dict.get("dispatch_date") or trip.dispatch_date
            return_dt = update_dict.get("arrival_return_date") or trip.arrival_return_date
            if dispatch_dt and return_dt:
                dispatch_date = dispatch_dt.date() if hasattr(dispatch_dt, "date") else dispatch_dt
                return_date = return_dt.date() if hasattr(return_dt, "date") else return_dt
                update_dict["trip_duration_days"] = (return_date - dispatch_date).days
        elif new_status == TripStatus.waiting:
            # If moved back to waiting, clear end_date
            update_dict["end_date"] = None

        # Always stamp the system update time so "Last Updated" is precise
        update_dict["updated_at"] = datetime.now(timezone.utc)

        # Story 2.25: Update go waybill status (dual waybill sync)
        # Never touch a waybill that has already been Invoiced — it is financially locked.
        if trip.waybill_id and new_status in TRIP_TO_GO_WAYBILL_STATUS:
            go_waybill = session.get(Waybill, trip.waybill_id)
            if go_waybill and go_waybill.status != WaybillStatus.invoiced:
                if new_status == TripStatus.cancelled:
                    if cancel_go_waybill:
                        go_waybill.status = WaybillStatus.open
                        session.add(go_waybill)
                else:
                    go_waybill.status = TRIP_TO_GO_WAYBILL_STATUS[new_status]
                    session.add(go_waybill)

        # Story 2.25: Update return waybill status (if attached)
        # Never touch a waybill that has already been Invoiced — it is financially locked.
        if trip.return_waybill_id and new_status in TRIP_TO_RETURN_WAYBILL_STATUS:
            return_waybill = session.get(Waybill, trip.return_waybill_id)
            if return_waybill and return_waybill.status != WaybillStatus.invoiced:
                if new_status == TripStatus.cancelled:
                    if cancel_return_waybill:
                        return_waybill.status = WaybillStatus.open
                        session.add(return_waybill)
                else:
                    return_waybill.status = TRIP_TO_RETURN_WAYBILL_STATUS[new_status]
                    session.add(return_waybill)

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
                mapped_status = TRIP_TO_GO_WAYBILL_STATUS.get(current_trip_status, WaybillStatus.in_progress)
                if mapped_status == WaybillStatus.open and current_trip_status != TripStatus.cancelled:
                    mapped_status = WaybillStatus.in_progress
                new_wb.status = mapped_status
                session.add(new_wb)

    trip.sqlmodel_update(update_dict)
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip


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
    """
    # RBAC: Only admin, manager, and ops can swap trucks
    if current_user.role not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions to swap trucks")

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
    if trip.status in TRIP_TO_TRUCK_STATUS:
        new_truck.status = TRIP_TO_TRUCK_STATUS[trip.status]
    else:
        new_truck.status = TruckStatus.in_transit
    session.add(new_truck)

    # Update trip with new truck
    trip.truck_id = swap_in.truck_id
    session.add(trip)

    session.commit()
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
    if current_user.role not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions to update trips")

    trip = session.get(Trip, id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Validate trip is at Offloading status
    current_status = TripStatus(trip.status) if isinstance(trip.status, str) else trip.status
    if current_status != TripStatus.offloading:
        raise HTTPException(
            status_code=422,
            detail="Return waybill can only be attached when trip status is 'Offloading'"
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
    session.add(trip)

    return_waybill.status = WaybillStatus.in_progress
    session.add(return_waybill)

    session.commit()
    session.refresh(trip)
    return trip


@router.delete("/{id}")
def delete_trip(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Message:
    """Delete a trip."""
    # RBAC: Only admin can delete trips
    if current_user.role not in DELETE_ROLES:
        raise HTTPException(status_code=403, detail="Only admin can delete trips")

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
    session.commit()
    return Message(message="Trip deleted successfully")


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
    if current_user.role not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions to record border crossings")

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
        auto_status = None
        if current_trip_status == TripStatus.at_border and crossing_in.direction == "go":
            auto_status = TripStatus.in_transit
        elif current_trip_status == TripStatus.at_border_return and crossing_in.direction == "return":
            auto_status = TripStatus.in_transit_return

        if auto_status:
            trip.status = auto_status
            trip.updated_at = datetime.now(timezone.utc)
            truck = session.get(Truck, trip.truck_id)
            if truck and auto_status in TRIP_TO_TRUCK_STATUS:
                truck.status = TRIP_TO_TRUCK_STATUS[auto_status]
                session.add(truck)
            trailer = session.get(Trailer, trip.trailer_id)
            if trailer and auto_status in TRIP_TO_TRAILER_STATUS:
                trailer.status = TRIP_TO_TRAILER_STATUS[auto_status]
                session.add(trailer)
            driver = session.get(Driver, trip.driver_id)
            if driver:
                driver.status = DriverStatus.on_trip
                session.add(driver)
            session.add(trip)

    session.commit()
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

ALLOWED_ATTACHMENT_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]
MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024  # 5 MB


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

    if current_user.role not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions to add trip attachments")

    if trip.status in CLOSED_STATUSES:
        raise HTTPException(status_code=400, detail="Cannot add attachments to a completed or cancelled trip")

    # Validate file type
    if file.content_type not in ALLOWED_ATTACHMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File type '{file.content_type}' is not allowed. "
                "Accepted: PDF, JPEG, PNG, WebP, GIF, Word (.doc/.docx), Excel (.xls/.xlsx)"
            ),
        )

    # Read and validate file size
    content = await file.read()
    if len(content) > MAX_ATTACHMENT_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10 MB limit")

    # Generate unique storage key
    unique_id = uuid.uuid4().hex[:8]
    clean_filename = (file.filename or "attachment").replace(" ", "_")
    object_name = f"trips/{trip.id}/{unique_id}_{clean_filename}"

    uploaded_key = storage.upload_file(content, object_name, file.content_type)
    print(f"DEBUG: Uploaded key: {uploaded_key}")
    if not uploaded_key:
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    current_attachments = list(trip.attachments) if trip.attachments else []
    current_attachments.append(uploaded_key)
    print(f"DEBUG: Current attachments before save: {current_attachments}")
    trip.attachments = current_attachments
    flag_modified(trip, "attachments")
    trip.updated_at = datetime.now(timezone.utc)
    session.add(trip)
    session.commit()
    session.refresh(trip)
    print(f"DEBUG: Trip attachments after refresh: {trip.attachments}")
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

    result = []
    for key in (trip.attachments or []):
        url = storage.get_presigned_url(key, expiration=3600)
        filename = key.split("/")[-1] if "/" in key else key
        # Strip the 8-char hex prefix added during upload
        if len(filename) > 9 and filename[8] == "_":
            filename = filename[9:]
        result.append({"key": key, "filename": filename, "url": url})

    return result


@router.delete("/{id}/attachment")
def delete_trip_attachment(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    key: str = Query(..., description="Storage key of the attachment to remove"),
) -> Message:
    """
    Delete a specific attachment from a trip.
    Removes from R2 storage and updates the database record.
    Not permitted on Completed or Cancelled trips.
    """
    trip = session.get(Trip, id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if current_user.role not in WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions to delete trip attachments")

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
    session.commit()
    return Message(message="Attachment deleted successfully")
