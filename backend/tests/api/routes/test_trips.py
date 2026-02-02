import random
import string
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Driver, Trailer, Trip, Truck, TripStatus, TruckStatus, TrailerStatus, DriverStatus
from tests.utils.utils import random_lower_string


def _random_truck_plate() -> str:
    """Generate a random truck plate like 'KAA 123A' (input format)."""
    prefix = "K" + "".join(random.choices(string.ascii_uppercase, k=2))
    digits = "".join(random.choices(string.digits, k=3))
    suffix = random.choice(string.ascii_uppercase)
    return f"{prefix} {digits}{suffix}"


def _normalize_truck_plate(plate: str) -> str:
    """Normalize truck plate: strip spaces, uppercase, space before trailing letters."""
    cleaned = plate.replace(" ", "").upper()
    # Truck normalization: space before trailing letter group
    i = len(cleaned)
    while i > 0 and cleaned[i - 1].isalpha():
        i -= 1
    if i < len(cleaned) and i > 0:
        return cleaned[:i] + " " + cleaned[i:]
    return cleaned


def _random_trailer_plate() -> str:
    """Generate a random trailer plate like 'ZB 4444' (input format)."""
    letters = "Z" + random.choice(string.ascii_uppercase)
    digits = "".join(random.choices(string.digits, k=4))
    return f"{letters} {digits}"


def test_create_trip(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    # 1. Create resources with random plates
    truck_plate = _random_truck_plate()
    trailer_plate = _random_trailer_plate()
    truck = Truck(plate_number=truck_plate, make="Volvo", model="FH16", status=TruckStatus.idle)
    trailer = Trailer(plate_number=trailer_plate, type="Flatbed", make="Hammar", status=TrailerStatus.idle)
    driver = Driver(
        full_name="John Doe",
        license_number=random_lower_string(),
        phone_number="1234567890",
        status=DriverStatus.active
    )
    db.add(truck)
    db.add(trailer)
    db.add(driver)
    db.commit()
    db.refresh(truck)
    db.refresh(trailer)
    db.refresh(driver)

    # Compute expected trip_number prefix from normalized plate
    normalized = _normalize_truck_plate(truck_plate)
    trip_prefix = "T" + normalized.replace(" ", "") + "-"

    data = {
        "truck_id": str(truck.id),
        "trailer_id": str(trailer.id),
        "driver_id": str(driver.id),
        "route_name": "Mombasa - Nairobi",
    }

    response = client.post(
        f"{settings.API_V1_STR}/trips/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["route_name"] == data["route_name"]
    assert content["status"] == TripStatus.loading
    assert "trip_number" in content
    assert content["trip_number"].startswith(trip_prefix)
    assert content["id"] is not None

    # Check database updates
    trip_in_db = db.get(Trip, content["id"])
    assert trip_in_db
    assert trip_in_db.status == TripStatus.loading

    db.refresh(truck)
    assert truck.status == TruckStatus.loading

    db.refresh(trailer)
    assert trailer.status == TrailerStatus.loading

    db.refresh(driver)
    assert driver.status == DriverStatus.assigned


def test_create_trip_invalid_truck_status(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    truck_plate = _random_truck_plate()
    trailer_plate = _random_trailer_plate()
    truck = Truck(plate_number=truck_plate, make="Volvo", model="FH16", status=TruckStatus.in_transit)
    trailer = Trailer(plate_number=trailer_plate, type="Flatbed", make="Hammar", status=TrailerStatus.idle)
    driver = Driver(
        full_name="Jane Doe",
        license_number=random_lower_string(),
        phone_number="0987654321",
        status=DriverStatus.active
    )
    db.add(truck)
    db.add(trailer)
    db.add(driver)
    db.commit()

    data = {
        "truck_id": str(truck.id),
        "trailer_id": str(trailer.id),
        "driver_id": str(driver.id),
        "route_name": "Nairobi - Kampala",
    }

    response = client.post(
        f"{settings.API_V1_STR}/trips/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Truck is not available"


def test_swap_truck(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    # Setup active trip with random plates
    old_truck_plate = _random_truck_plate()
    new_truck_plate = _random_truck_plate()
    trailer_plate = _random_trailer_plate()
    old_truck = Truck(plate_number=old_truck_plate, make="Scania", model="R450", status=TruckStatus.in_transit)
    new_truck = Truck(plate_number=new_truck_plate, make="Scania", model="R450", status=TruckStatus.idle)
    trailer = Trailer(plate_number=trailer_plate, type="Box", make="Krone", status=TrailerStatus.in_transit)
    driver = Driver(full_name="Driver 3", license_number=random_lower_string(), phone_number="111", status=DriverStatus.assigned)

    # Generate a unique trip number based on old truck plate
    normalized_old = _normalize_truck_plate(old_truck_plate)
    trip_number = "T" + normalized_old.replace(" ", "") + "-2026" + "".join(random.choices(string.digits, k=3))

    trip = Trip(
        truck_id=old_truck.id,
        trailer_id=trailer.id,
        driver_id=driver.id,
        route_name="Route 1",
        status=TripStatus.in_transit,
        trip_number=trip_number,
    )

    db.add(old_truck)
    db.add(new_truck)
    db.add(trailer)
    db.add(driver)
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # Swap
    data = {"truck_id": str(new_truck.id)}
    response = client.put(
        f"{settings.API_V1_STR}/trips/{trip.id}/swap-truck",
        headers=superuser_token_headers,
        json=data,
    )

    assert response.status_code == 200
    content = response.json()
    assert content["truck_id"] == str(new_truck.id)

    db.refresh(old_truck)
    assert old_truck.status == TruckStatus.idle

    db.refresh(new_truck)
    assert new_truck.status == TruckStatus.in_transit