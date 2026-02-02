"""
Tests for Expense Request Submission - Story 2.2
Tests expense CRUD operations, filtering, authorization, and status workflow.
"""
import uuid
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import ExpenseCategory, ExpenseStatus, User, UserRole
from tests.utils.expense import create_random_expense
from tests.utils.trip import create_random_trip
from tests.utils.user import create_random_user


def test_create_expense_for_trip(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Scenario 1: Submit Request
    Given I am viewing Trip #101
    When I click "Add Expense"
    And I fill Type, Amount, Description
    Then a new ExpenseRequest is created with Status "Pending Manager"
    And it is linked to Trip
    """
    trip = create_random_trip(db)

    data = {
        "trip_id": str(trip.id),
        "amount": 50000.00,
        "category": "Fuel",
        "description": "Shell V-Power",
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["status"] == ExpenseStatus.pending_manager.value
    assert float(content["amount"]) == 50000.00
    assert content["category"] == ExpenseCategory.fuel.value
    assert content["description"] == "Shell V-Power"
    assert content["trip_id"] == str(trip.id)
    assert "id" in content
    assert "created_by_id" in content
    assert "created_at" in content


def test_create_office_expense_no_trip(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test creating an expense without a trip (office expense)."""
    data = {
        "amount": 10000.00,
        "category": "Office",
        "description": "Office supplies",
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["status"] == ExpenseStatus.pending_manager.value
    assert content["trip_id"] is None
    assert content["category"] == ExpenseCategory.office.value


def test_create_expense_invalid_amount(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that expense cannot be created with zero or negative amount."""
    trip = create_random_trip(db)

    data = {
        "trip_id": str(trip.id),
        "amount": 0,
        "category": "Fuel",
        "description": "Invalid expense",
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 422  # Validation error


def test_create_expense_negative_amount(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that expense cannot be created with negative amount."""
    trip = create_random_trip(db)

    data = {
        "trip_id": str(trip.id),
        "amount": -100.00,
        "category": "Fuel",
        "description": "Invalid expense",
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 422  # Validation error


def test_create_expense_trip_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when trip doesn't exist."""
    data = {
        "trip_id": str(uuid.uuid4()),
        "amount": 50000.00,
        "category": "Fuel",
        "description": "Test expense",
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Trip not found"


def test_read_expense(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test getting an expense by ID."""
    user = create_random_user(db)
    expense = create_random_expense(db, user)

    response = client.get(
        f"{settings.API_V1_STR}/expenses/{expense.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["id"] == str(expense.id)
    assert float(content["amount"]) == float(expense.amount)


def test_read_expense_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when expense doesn't exist."""
    response = client.get(
        f"{settings.API_V1_STR}/expenses/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Expense not found"


def test_read_expenses(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test listing all expenses."""
    user = create_random_user(db)
    create_random_expense(db, user)
    create_random_expense(db, user)

    response = client.get(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert "count" in content
    assert len(content["data"]) >= 2


def test_read_expenses_filter_by_trip(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test filtering expenses by trip_id."""
    user = create_random_user(db)
    trip1 = create_random_trip(db)
    trip2 = create_random_trip(db)

    expense1 = create_random_expense(db, user, trip1)
    expense2 = create_random_expense(db, user, trip1)
    expense3 = create_random_expense(db, user, trip2)

    # Filter by trip1
    response = client.get(
        f"{settings.API_V1_STR}/expenses/?trip_id={trip1.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] >= 2
    expense_ids = [e["id"] for e in content["data"]]
    assert str(expense1.id) in expense_ids
    assert str(expense2.id) in expense_ids
    assert str(expense3.id) not in expense_ids


def test_read_expenses_filter_by_status(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test filtering expenses by status."""
    user = create_random_user(db)
    create_random_expense(db, user)

    # Filter by pending_manager
    response = client.get(
        f"{settings.API_V1_STR}/expenses/?status=Pending Manager",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] >= 1


def test_read_expenses_filter_by_category(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test filtering expenses by category."""
    user = create_random_user(db)
    create_random_expense(db, user)  # Fuel category

    # Filter by fuel
    response = client.get(
        f"{settings.API_V1_STR}/expenses/?category=Fuel",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] >= 1


def test_read_expenses_invalid_status_filter(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 400 error when filtering by invalid status."""
    response = client.get(
        f"{settings.API_V1_STR}/expenses/?status=InvalidStatus",
        headers=superuser_token_headers,
    )
    assert response.status_code == 400
    content = response.json()
    assert "Invalid status" in content["detail"]


def test_read_expenses_invalid_category_filter(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 400 error when filtering by invalid category."""
    response = client.get(
        f"{settings.API_V1_STR}/expenses/?category=InvalidCategory",
        headers=superuser_token_headers,
    )
    assert response.status_code == 400
    content = response.json()
    assert "Invalid category" in content["detail"]


def test_update_expense(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test updating an expense (admin can update any)."""
    user = create_random_user(db)
    expense = create_random_expense(db, user)

    data = {
        "amount": 75000.00,
        "description": "Updated description",
    }
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{expense.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert float(content["amount"]) == 75000.00
    assert content["description"] == "Updated description"


def test_update_expense_status_manager_approve(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test manager approval flow (Pending Manager -> Pending Finance)."""
    user = create_random_user(db)
    expense = create_random_expense(db, user)

    # Admin can approve (move to Pending Finance)
    data = {"status": "Pending Finance"}
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{expense.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["status"] == ExpenseStatus.pending_finance.value


def test_update_expense_status_finance_pay(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test finance payment flow (Pending Finance -> Paid)."""
    user = create_random_user(db)
    expense = create_random_expense(db, user, status=ExpenseStatus.pending_finance)

    # Admin can pay
    data = {"status": "Paid"}
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{expense.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["status"] == ExpenseStatus.paid.value


def test_update_expense_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when updating non-existent expense."""
    data = {"amount": 75000.00}
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Expense not found"


def test_delete_expense(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test deleting an expense (admin can delete pending expenses)."""
    user = create_random_user(db)
    expense = create_random_expense(db, user)

    response = client.delete(
        f"{settings.API_V1_STR}/expenses/{expense.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["message"] == "Expense deleted successfully"


def test_delete_expense_not_pending_fails(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that paid expenses cannot be deleted."""
    user = create_random_user(db)
    expense = create_random_expense(db, user, status=ExpenseStatus.paid)

    response = client.delete(
        f"{settings.API_V1_STR}/expenses/{expense.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 403
    content = response.json()
    assert "Pending Manager" in content["detail"]


def test_delete_expense_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when deleting non-existent expense."""
    response = client.delete(
        f"{settings.API_V1_STR}/expenses/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Expense not found"


def test_updated_at_changes_on_update(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that updated_at field changes when expense is updated."""
    user = create_random_user(db)
    expense = create_random_expense(db, user)
    original_updated_at = expense.updated_at

    # Update the expense
    data = {"description": "Changed description"}
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{expense.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["updated_at"] != str(original_updated_at)


# ============================================================================
# Story 3.2: Office Expense Management Tests
# ============================================================================


def test_office_expense_full_approval_workflow(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Story 3.2 - Scenario 1 & 2: Submit office expense and approve through full workflow.
    Given an Admin submits an office expense (trip_id=None)
    Then it enters "Pending Manager" status
    When a Manager approves it → "Pending Finance"
    When Finance processes it → "Paid"
    """
    # Submit office expense (no trip_id)
    data = {
        "amount": 100000.00,
        "category": "Office",
        "description": "Jan 2026 Office Rent",
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    expense_id = content["id"]
    assert content["status"] == ExpenseStatus.pending_manager.value
    assert content["trip_id"] is None
    assert content["category"] == ExpenseCategory.office.value
    assert float(content["amount"]) == 100000.00
    assert content["description"] == "Jan 2026 Office Rent"

    # Manager approves → Pending Finance
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{expense_id}",
        headers=superuser_token_headers,
        json={"status": "Pending Finance"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == ExpenseStatus.pending_finance.value

    # Finance pays → Paid
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{expense_id}",
        headers=superuser_token_headers,
        json={"status": "Paid"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == ExpenseStatus.paid.value


def test_office_expense_rejection(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Story 3.2: Manager can reject an office expense.
    """
    data = {
        "amount": 50000.00,
        "category": "Office",
        "description": "Questionable expense",
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    expense_id = response.json()["id"]

    # Reject
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{expense_id}",
        headers=superuser_token_headers,
        json={"status": "Rejected"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == ExpenseStatus.rejected.value


def test_office_expense_return_and_resubmit(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Story 3.2: Office expense can be returned for corrections and resubmitted.
    """
    data = {
        "amount": 75000.00,
        "category": "Office",
        "description": "Utilities Q1",
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    expense_id = response.json()["id"]

    # Return for corrections
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{expense_id}",
        headers=superuser_token_headers,
        json={"status": "Returned"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == ExpenseStatus.returned.value

    # Resubmit
    response = client.patch(
        f"{settings.API_V1_STR}/expenses/{expense_id}",
        headers=superuser_token_headers,
        json={"status": "Pending Manager"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == ExpenseStatus.pending_manager.value


def test_office_expense_in_approval_queue_with_trip_expenses(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Story 3.2 - Scenario 2: Office expenses appear alongside trip expenses in approval queue.
    """
    trip = create_random_trip(db)

    # Create a trip expense
    trip_expense_data = {
        "trip_id": str(trip.id),
        "amount": 30000.00,
        "category": "Fuel",
        "description": "Trip fuel",
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=trip_expense_data,
    )
    assert response.status_code == 200
    trip_expense_id = response.json()["id"]

    # Create an office expense
    office_expense_data = {
        "amount": 100000.00,
        "category": "Office",
        "description": "Feb 2026 Office Rent",
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=office_expense_data,
    )
    assert response.status_code == 200
    office_expense_id = response.json()["id"]

    # Fetch all expenses - both should appear (manager/admin sees all)
    response = client.get(
        f"{settings.API_V1_STR}/expenses/?status=Pending Manager",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    expense_ids = [e["id"] for e in content["data"]]
    assert trip_expense_id in expense_ids
    assert office_expense_id in expense_ids


def test_office_expense_category_filter(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Story 3.2: Can filter expenses by Office category.
    """
    # Create office expense
    data = {
        "amount": 25000.00,
        "category": "Office",
        "description": "Internet bill",
    }
    response = client.post(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200

    # Filter by Office category
    response = client.get(
        f"{settings.API_V1_STR}/expenses/?category=Office",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] >= 1
    # All returned expenses should have Office category
    for expense in content["data"]:
        assert expense["category"] == ExpenseCategory.office.value
