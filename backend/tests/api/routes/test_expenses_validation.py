import uuid
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import ExpenseCategory

def test_create_fuel_expense_missing_trip(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that Fuel expense requires trip_id."""
    data = {
        "amount": 50000.00,
        "category": "Fuel",
        "description": "Missing Trip",
        # trip_id missing
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 422
    assert "Trip Number is required" in response.json()["detail"]

def test_create_office_expense_without_trip(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that Office expense DOES NOT require trip_id."""
    data = {
        "amount": 10000.00,
        "category": "Office",
        "description": "Valid Office Expense",
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    assert response.json()["category"] == "Office"
