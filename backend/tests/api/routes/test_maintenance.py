import uuid
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import MaintenanceEvent, ExpenseRequest, Truck, TruckStatus

def test_create_maintenance_event(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    # 1. Create a truck first
    truck = Truck(plate_number="TEST-MANT", make="Test", model="Truck", status="Idle")
    db.add(truck)
    db.commit()
    db.refresh(truck)

    data = {
        "truck_id": str(truck.id),
        "garage_name": "Test Garage",
        "description": "Test Maintenance",
        "start_date": "2024-01-01T10:00:00Z",
        "cost": 500.00,
        "update_truck_status": True,
    }

    response = client.post(
        f"{settings.API_V1_STR}/maintenance/",
        headers=superuser_token_headers,
        json=data,
    )
    
    assert response.status_code == 200
    content = response.json()
    assert content["garage_name"] == "Test Garage"
    assert "id" in content
    
    # Verify DB
    event_id = content["id"]
    event = db.get(MaintenanceEvent, event_id)
    assert event
    assert event.expense_id
    
    # Verify Expense
    expense = db.get(ExpenseRequest, event.expense_id)
    assert expense
    assert expense.amount == Decimal("500.00")
    assert expense.category == "Maintenance"
    
    # Verify Truck Status
    db.refresh(truck)
    assert truck.status == TruckStatus.maintenance
