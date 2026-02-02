"""
Utility functions for trip tests.
"""
import random
import uuid
from datetime import datetime, timezone

from sqlmodel import Session

from app.models import (
    Driver,
    DriverStatus,
    Trailer,
    TrailerStatus,
    Trip,
    TripCreate,
    TripStatus,
    Truck,
    TruckStatus,
)
from tests.utils.driver import create_random_driver
from tests.utils.trailer import create_random_trailer
from tests.utils.truck import create_random_truck


def _generate_test_trip_number(plate: str) -> str:
    """Generate a unique trip number for testing."""
    clean = plate.replace(" ", "")
    year = datetime.now(timezone.utc).year
    seq = random.randint(100, 999)
    return f"T{clean}-{year}{seq}"


def create_random_trip(db: Session, waybill_id: uuid.UUID | None = None) -> Trip:
    """Create a random trip with associated truck, trailer, and driver."""
    # Create resources
    truck = create_random_truck(db)
    trailer = create_random_trailer(db)
    driver = create_random_driver(db)

    trip_number = _generate_test_trip_number(truck.plate_number)

    # Create trip
    trip_in = TripCreate(
        truck_id=truck.id,
        trailer_id=trailer.id,
        driver_id=driver.id,
        route_name="Test Route",
        waybill_id=waybill_id,
    )
    trip = Trip.model_validate(trip_in, update={"trip_number": trip_number})
    db.add(trip)

    # Update statuses (simulating what the API would do)
    truck.status = TruckStatus.loading
    trailer.status = TrailerStatus.loading
    driver.status = DriverStatus.assigned
    db.add(truck)
    db.add(trailer)
    db.add(driver)

    db.commit()
    db.refresh(trip)
    return trip


def create_idle_truck(db: Session) -> Truck:
    """Create a truck with Idle status."""
    return create_random_truck(db)


def create_idle_trailer(db: Session) -> Trailer:
    """Create a trailer with Idle status."""
    return create_random_trailer(db)


def create_active_driver(db: Session) -> Driver:
    """Create a driver with Active status."""
    return create_random_driver(db)


def create_in_transit_truck(db: Session) -> Truck:
    """Create a truck with In Transit status."""
    truck = create_random_truck(db)
    truck.status = TruckStatus.in_transit
    db.add(truck)
    db.commit()
    db.refresh(truck)
    return truck


def create_offloaded_truck(db: Session) -> Truck:
    """Create a truck with Offloaded status."""
    truck = create_random_truck(db)
    truck.status = TruckStatus.offloaded
    db.add(truck)
    db.commit()
    db.refresh(truck)
    return truck


def create_offloaded_trailer(db: Session) -> Trailer:
    """Create a trailer with Offloaded status."""
    trailer = create_random_trailer(db)
    trailer.status = TrailerStatus.offloaded
    db.add(trailer)
    db.commit()
    db.refresh(trailer)
    return trailer
