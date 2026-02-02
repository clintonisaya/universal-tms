import uuid
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import ExpenseRequest, ExpenseStatus, ExpenseCategory, UserRole, User

def create_test_expense(db: Session, user_id: uuid.UUID, status: ExpenseStatus = ExpenseStatus.pending_manager) -> ExpenseRequest:
    expense = ExpenseRequest(
        amount=Decimal("100.00"),
        category=ExpenseCategory.fuel,
        description="Test Batch",
        status=status,
        created_by_id=user_id,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

def test_batch_approve_expenses(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    # 1. Get current user (superuser is admin)
    response = client.get(f"{settings.API_V1_STR}/users/me", headers=superuser_token_headers)
    user_id = response.json()["id"]
    
    # 2. Create 3 expenses
    e1 = create_test_expense(db, uuid.UUID(user_id))
    e2 = create_test_expense(db, uuid.UUID(user_id))
    e3 = create_test_expense(db, uuid.UUID(user_id))

    # 3. Batch approve
    data = {
        "ids": [str(e1.id), str(e2.id), str(e3.id)],
        "status": "Pending Finance"
    }
    
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/batch",
        headers=superuser_token_headers,
        json=data,
    )
    
    if response.status_code != 200:
        print(response.json())
        
    assert response.status_code == 200
    assert "updated 3 expenses" in response.json()["message"]
    
    # Verify DB
    db.refresh(e1)
    db.refresh(e2)
    assert e1.status == ExpenseStatus.pending_finance
    assert e2.status == ExpenseStatus.pending_finance

def test_batch_return_with_comment(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    response = client.get(f"{settings.API_V1_STR}/users/me", headers=superuser_token_headers)
    user_id = response.json()["id"]
    
    e1 = create_test_expense(db, uuid.UUID(user_id))
    
    data = {
        "ids": [str(e1.id)],
        "status": "Returned",
        "comment": "Missing receipt"
    }
    
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/batch",
        headers=superuser_token_headers,
        json=data,
    )
    
    if response.status_code != 200:
        print(response.json())
        
    assert response.status_code == 200
    
    db.refresh(e1)
    assert e1.status == ExpenseStatus.returned
    assert e1.manager_comment == "Missing receipt"
