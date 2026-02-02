import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import Waybill, WaybillStatus, Trip, TripStatus, Truck, Trailer, Driver, TruckStatus, TrailerStatus, DriverStatus
from tests.utils.utils import random_lower_string

def test_create_waybill(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    data = {
        "client_name": "Africa Walk...",
        "description": "Loose Cargo, 30 Tons",
        "cargo_type": "Loose Cargo",
        "weight_kg": 30000.0,
        "origin": "Dar es Salaam Port",
        "destination": "Lusaka, Zambia",
        "expected_loading_date": datetime.now(timezone.utc).isoformat(),
        "agreed_rate": "3500.00",
        "currency": "USD"
    }
    
    response = client.post(
        f"{settings.API_V1_STR}/waybills/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["client_name"] == data["client_name"]
    assert content["status"] == WaybillStatus.open
    assert "waybill_number" in content
    assert content["waybill_number"].startswith(f"WB-{datetime.now().year}-")
    assert content["id"] is not None

def test_dispatch_trip_from_waybill(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    # 1. Create a waybill
    unique_suffix = random_lower_string()
    waybill = Waybill(
        waybill_number=f"WB-{datetime.now().year}-{unique_suffix[:4]}",
        client_name="Test Client",
        description="Test Cargo",
        weight_kg=1000.0,
        origin="Origin",
        destination="Destination",
        expected_loading_date=datetime.now(timezone.utc),
        status=WaybillStatus.open
    )
    db.add(waybill)
    
    # 2. Setup resources for trip
    truck = Truck(plate_number="WAY 123", make="Volvo", model="FH16", status=TruckStatus.idle)
    trailer = Trailer(plate_number="TR 123", type="Flatbed", make="Hammar", status=TrailerStatus.idle)
    driver = Driver(full_name="Waybill Driver", license_number=random_lower_string(), phone_number="123", status=DriverStatus.active)
    db.add(truck)
    db.add(trailer)
    db.add(driver)
    db.commit()
    db.refresh(waybill)
    db.refresh(truck)
    db.refresh(trailer)
    db.refresh(driver)

    # 3. Create trip linked to waybill
    trip_data = {
        "truck_id": str(truck.id),
        "trailer_id": str(trailer.id),
        "driver_id": str(driver.id),
        "route_name": "Origin - Destination",
        "waybill_id": str(waybill.id)
    }
    
    response = client.post(
        f"{settings.API_V1_STR}/trips/",
        headers=superuser_token_headers,
        json=trip_data,
    )
    assert response.status_code == 200
    
    # 4. Check if waybill status updated to In Progress
    db.refresh(waybill)
    # This might fail if the implementation is missing this sync
    assert waybill.status == WaybillStatus.in_progress
