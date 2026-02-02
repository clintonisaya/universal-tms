from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.trip import create_random_trip
from tests.utils.waybill import create_random_waybill

def test_get_waybill_tracking_report(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    # Create some test data
    waybill = create_random_waybill(db)
    trip = create_random_trip(db, waybill_id=waybill.id)
    
    response = client.get(
        f"{settings.API_V1_STR}/reports/waybill-tracking",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert isinstance(content, list)
    assert len(content) >= 1
    
    # Check fields
    item = next((x for x in content if x["waybill_id"] == str(waybill.id)), None)
    assert item is not None
    assert item["waybill_number"] == waybill.waybill_number
    assert item["trip_number"] == trip.trip_number
    assert "mileage_km" in item
    assert "fuel_consumption_liters" in item
    assert "risk_level" in item
    assert "truck_plate" in item
    assert "trailer_plate" in item
