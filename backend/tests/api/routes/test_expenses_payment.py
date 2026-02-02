import uuid
from decimal import Decimal
from datetime import datetime

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import ExpenseRequest, ExpenseStatus, ExpenseCategory, PaymentMethod

def create_pending_finance_expense(db: Session, user_id: uuid.UUID) -> ExpenseRequest:
    expense = ExpenseRequest(
        amount=Decimal("100.00"),
        category=ExpenseCategory.fuel,
        description="Test Payment",
        status=ExpenseStatus.pending_finance,
        created_by_id=user_id,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

def test_process_cash_payment(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    # 1. Get current user
    response = client.get(f"{settings.API_V1_STR}/users/me", headers=superuser_token_headers)
    user_id = response.json()["id"]
    
    # 2. Create expense
    expense = create_pending_finance_expense(db, uuid.UUID(user_id))
    
    # 3. Process Payment
    data = {
        "method": "CASH"
    }
    
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{expense.id}/payment",
        headers=superuser_token_headers,
        json=data,
    )
    
    assert response.status_code == 200
    content = response.json()
    assert content["status"] == ExpenseStatus.paid
    assert content["payment_method"] == "CASH"
    assert content["payment_date"] is not None
    
def test_process_transfer_payment(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    response = client.get(f"{settings.API_V1_STR}/users/me", headers=superuser_token_headers)
    user_id = response.json()["id"]
    
    expense = create_pending_finance_expense(db, uuid.UUID(user_id))
    
    data = {
        "method": "TRANSFER",
        "reference": "TXN123456"
    }
    
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{expense.id}/payment",
        headers=superuser_token_headers,
        json=data,
    )
    
    assert response.status_code == 200
    content = response.json()
    assert content["status"] == ExpenseStatus.paid
    assert content["payment_method"] == "TRANSFER"
    assert content["payment_reference"] == "TXN123456"

def test_process_transfer_payment_missing_reference(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    response = client.get(f"{settings.API_V1_STR}/users/me", headers=superuser_token_headers)
    user_id = response.json()["id"]
    
    expense = create_pending_finance_expense(db, uuid.UUID(user_id))
    
    data = {
        "method": "TRANSFER"
    }
    
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{expense.id}/payment",
        headers=superuser_token_headers,
        json=data,
    )
    
    assert response.status_code == 422
    assert "Reference Number is required" in response.json()["detail"]