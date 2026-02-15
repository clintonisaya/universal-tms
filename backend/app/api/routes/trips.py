"""
Trip Creation & Dispatch - Story 2.1
CRUD endpoints for trip management with transactional integrity.
"""
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, or_, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
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


# Status mapping for synchronized truck/trailer status updates
TRIP_TO_TRUCK_STATUS = {
    TripStatus.waiting: TruckStatus.waiting,
    TripStatus.dispatch: TruckStatus.dispatch,
    TripStatus.loading: TruckStatus.loading,
    TripStatus.in_transit: TruckStatus.in_transit,
    TripStatus.at_border: TruckStatus.at_border,
    TripStatus.offloaded: TruckStatus.offloaded,
    TripStatus.returned: TruckStatus.returned,
    TripStatus.waiting_for_pods: TruckStatus.waiting_for_pods,
    TripStatus.completed: TruckStatus.idle,
    TripStatus.cancelled: TruckStatus.idle,
}

TRIP_TO_TRAILER_STATUS = {
    TripStatus.waiting: TrailerStatus.waiting,
    TripStatus.dispatch: TrailerStatus.dispatch,
    TripStatus.loading: TrailerStatus.loading,
    TripStatus.in_transit: TrailerStatus.in_transit,
    TripStatus.at_border: TrailerStatus.at_border,
    TripStatus.offloaded: TrailerStatus.offloaded,
    TripStatus.returned: TrailerStatus.returned,
    TripStatus.waiting_for_pods: TrailerStatus.waiting_for_pods,
    TripStatus.completed: TrailerStatus.idle,
    TripStatus.cancelled: TrailerStatus.idle,
}

TRIP_TO_WAYBILL_STATUS = {
    TripStatus.waiting: WaybillStatus.open,
    TripStatus.dispatch: WaybillStatus.in_progress,
    TripStatus.loading: WaybillStatus.in_progress,
    TripStatus.in_transit: WaybillStatus.in_progress,
    TripStatus.at_border: WaybillStatus.in_progress,
    TripStatus.offloaded: WaybillStatus.in_progress,
    TripStatus.returned: WaybillStatus.in_progress,
    TripStatus.waiting_for_pods: WaybillStatus.in_progress,
    TripStatus.completed: WaybillStatus.completed,
    TripStatus.cancelled: WaybillStatus.open,
}


def is_truck_available(truck: Truck) -> bool:
    """Check if truck is available for a new trip."""
    return truck.status in (TruckStatus.idle, TruckStatus.offloaded)


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
    # Batch-fetch waybills for trips that have waybill_id
    waybill_ids = [t.waybill_id for t in trips if t.waybill_id]
    waybill_map: dict[uuid.UUID, Waybill] = {}
    if waybill_ids:
        wbs = session.exec(select(Waybill).where(Waybill.id.in_(waybill_ids))).all()
        waybill_map = {wb.id: wb for wb in wbs}

    for trip in trips:
        trip_data = TripPublic.model_validate(trip)
        # Waybill enrichment
        if trip.waybill_id and trip.waybill_id in waybill_map:
            wb = waybill_map[trip.waybill_id]
            trip_data.waybill_rate = wb.agreed_rate
            trip_data.waybill_currency = wb.currency
            trip_data.waybill_risk_level = wb.risk_level
        # Location update time: most recent non-null tracking date
        tracking_dates = [
            d for d in (
                trip.dispatch_date,
                trip.arrival_loading_date,
                trip.loading_date,
                trip.arrival_offloading_date,
                trip.offloading_date,
                trip.arrival_return_date,
            ) if d is not None
        ]
        trip_data.location_update_time = max(tracking_dates) if tracking_dates else trip.start_date
        enriched.append(trip_data)

    return TripsPublic(data=enriched, count=count)


@router.get("/{id}", response_model=TripPublicDetailed)
def read_trip(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Get trip by ID with detailed information."""
    trip = session.get(Trip, id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


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

    # Handle status change with synchronized updates
    if "status" in update_dict:
        new_status = TripStatus(update_dict["status"])
        current_status = TripStatus(trip.status) if isinstance(trip.status, str) else trip.status

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
            if new_status == TripStatus.in_transit:
                driver.status = DriverStatus.on_trip
                session.add(driver)
            elif new_status in (TripStatus.completed, TripStatus.cancelled):
                driver.status = DriverStatus.active
                session.add(driver)

        # Handle end_date for completed trips
        if new_status == TripStatus.completed:
            update_dict["end_date"] = datetime.now(timezone.utc)
            # Calculate trip duration from dispatch to return
            dispatch_dt = update_dict.get("dispatch_date") or trip.dispatch_date
            return_dt = update_dict.get("arrival_return_date") or trip.arrival_return_date
            if dispatch_dt and return_dt:
                delta = return_dt - dispatch_dt
                update_dict["trip_duration_days"] = delta.days
        elif new_status == TripStatus.waiting:
            # If moved back to waiting, clear end_date
            update_dict["end_date"] = None

        # Update waybill status if linked
        if trip.waybill_id and new_status in TRIP_TO_WAYBILL_STATUS:
            waybill = session.get(Waybill, trip.waybill_id)
            if waybill:
                waybill.status = TRIP_TO_WAYBILL_STATUS[new_status]
                session.add(waybill)

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

    # Reset waybill status back to Open if linked
    if trip.waybill_id:
        waybill = session.get(Waybill, trip.waybill_id)
        if waybill:
            waybill.status = WaybillStatus.open
            session.add(waybill)

    session.delete(trip)
    session.commit()
    return Message(message="Trip deleted successfully")
