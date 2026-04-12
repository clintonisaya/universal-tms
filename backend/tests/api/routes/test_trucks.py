"""
Tests for Truck Registry Management - Story 1.4 & Story 3.3
Tests CRUD operations, duplicate prevention, and maintenance history.
"""
import random
import string
import uuid
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import TruckStatus
from tests.utils.maintenance import create_maintenance_event
from tests.utils.trailer import create_random_trailer
from tests.utils.truck import create_random_truck
from tests.utils.user import create_random_user


def test_create_truck(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """
    Scenario 1: Register New Truck
    Given I am a Fleet Manager
    When I submit the "New Truck" form with valid data
    Then the truck is saved to the database
    And it appears in the Table List
    """
    prefix = "".join(random.choices(string.ascii_uppercase, k=3))
    digits = "".join(random.choices(string.digits, k=3))
    suffix = random.choice(string.ascii_uppercase)
    plate_input = f"{prefix} {digits}{suffix}"
    expected_normalized = f"{prefix}{digits} {suffix}"

    data = {
        "plate_number": plate_input,
        "make": "Mercedes",
        "model": "Actros",
        "status": "Idle",
    }
    response = client.post(
        f"{settings.API_V1_STR}/trucks/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    # Plate is formatted with space before trailing letters
    assert content["plate_number"] == expected_normalized
    assert content["make"] == data["make"]
    assert content["model"] == data["model"]
    assert content["status"] == data["status"]
    assert "id" in content
    assert "created_at" in content


def test_create_truck_duplicate_plate(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Scenario 2: Prevent Duplicates
    Given "KCB 456B" exists
    When I try to register another truck with "KCB 456B"
    Then I get an error "Truck with this plate already exists"
    """
    # Create first truck
    truck = create_random_truck(db)

    # Try to create duplicate
    data = {
        "plate_number": truck.plate_number,  # Use same plate
        "make": "Volvo",
        "model": "FH16",
        "status": "Idle",
    }
    response = client.post(
        f"{settings.API_V1_STR}/trucks/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "Truck with this plate already exists"


def test_create_truck_duplicate_plate_with_different_spacing(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """
    Test that plates are normalized - "T512 EVG" and "T512EVG" are the same.
    """
    letter = random.choice(string.ascii_uppercase)
    digits = "".join(random.choices(string.digits, k=3))
    suffix = "".join(random.choices(string.ascii_uppercase, k=3))
    plate_with_spaces = f"{letter}{digits} {suffix}"
    plate_no_spaces = f"{letter}{digits}{suffix}"
    expected_normalized = f"{letter}{digits} {suffix}"

    # Create first truck with spaces
    data1 = {
        "plate_number": plate_with_spaces,
        "make": "Mercedes",
        "model": "Actros",
        "status": "Idle",
    }
    response1 = client.post(
        f"{settings.API_V1_STR}/trucks/",
        headers=superuser_token_headers,
        json=data1,
    )
    assert response1.status_code == 200
    content1 = response1.json()
    # Formatted with space before trailing letters
    assert content1["plate_number"] == expected_normalized

    # Try to create with no spaces - should be duplicate
    data2 = {
        "plate_number": plate_no_spaces,
        "make": "Volvo",
        "model": "FH16",
        "status": "Idle",
    }
    response2 = client.post(
        f"{settings.API_V1_STR}/trucks/",
        headers=superuser_token_headers,
        json=data2,
    )
    assert response2.status_code == 400
    content2 = response2.json()
    assert content2["detail"] == "Truck with this plate already exists"


def test_plate_number_normalization(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """
    Test that plate numbers are formatted consistently.
    """
    # Generate random lowercase letters + digits + single trailing letter
    prefix = "".join(random.choices(string.ascii_lowercase, k=3))
    digits = "".join(random.choices(string.digits, k=3))
    suffix = random.choice(string.ascii_lowercase)
    plate_input = f"  {prefix}  {digits}{suffix}  "
    expected_normalized = f"{prefix.upper()}{digits} {suffix.upper()}"

    # Create truck with lowercase and extra spaces
    data = {
        "plate_number": plate_input,
        "make": "Mercedes",
        "model": "Actros",
        "status": "Idle",
    }
    response = client.post(
        f"{settings.API_V1_STR}/trucks/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    # Should be formatted: uppercase, space before trailing letters
    assert content["plate_number"] == expected_normalized


def test_read_truck(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test getting a truck by ID."""
    truck = create_random_truck(db)
    response = client.get(
        f"{settings.API_V1_STR}/trucks/{truck.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["plate_number"] == truck.plate_number
    assert content["make"] == truck.make
    assert content["model"] == truck.model
    assert content["id"] == str(truck.id)


def test_read_truck_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when truck doesn't exist."""
    response = client.get(
        f"{settings.API_V1_STR}/trucks/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Truck not found"


def test_read_trucks(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test listing all trucks."""
    create_random_truck(db)
    create_random_truck(db)
    response = client.get(
        f"{settings.API_V1_STR}/trucks/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert "count" in content
    assert len(content["data"]) >= 2


def test_update_truck(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test updating a truck."""
    truck = create_random_truck(db)
    data = {"status": "In Transit"}
    response = client.patch(
        f"{settings.API_V1_STR}/trucks/{truck.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["status"] == TruckStatus.in_transit.value
    assert content["id"] == str(truck.id)


def test_update_truck_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when updating non-existent truck."""
    data = {"status": "Maintenance"}
    response = client.patch(
        f"{settings.API_V1_STR}/trucks/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Truck not found"


def test_update_truck_duplicate_plate(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that updating to an existing plate number fails."""
    truck1 = create_random_truck(db)
    truck2 = create_random_truck(db)

    # Try to update truck2 with truck1's plate
    data = {"plate_number": truck1.plate_number}
    response = client.patch(
        f"{settings.API_V1_STR}/trucks/{truck2.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "Truck with this plate already exists"


def test_delete_truck(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test deleting a truck."""
    truck = create_random_truck(db)
    response = client.delete(
        f"{settings.API_V1_STR}/trucks/{truck.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["message"] == "Truck deleted successfully"


def test_delete_truck_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when deleting non-existent truck."""
    response = client.delete(
        f"{settings.API_V1_STR}/trucks/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Truck not found"


# ============================================================================
# Story 3.3: Asset Health History Tests
# ============================================================================


def test_maintenance_history_empty(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Story 3.3: Truck with no maintenance events returns empty list and zero cost.
    """
    truck = create_random_truck(db)
    response = client.get(
        f"{settings.API_V1_STR}/trucks/{truck.id}/maintenance-history",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["data"] == []
    assert content["count"] == 0
    assert float(content["total_maintenance_cost"]) == 0.00


def test_maintenance_history_with_events(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Story 3.3 - Scenario 1: View maintenance history for a truck.
    Given I am viewing a truck
    When I request maintenance history
    Then I see past maintenance events with Date, Garage, Cost, Description.
    """
    truck = create_random_truck(db)
    user = create_random_user(db)

    event1 = create_maintenance_event(
        db, truck, user,
        cost=Decimal("30000.00"),
        garage_name="AutoFix Garage",
        description="Engine overhaul",
    )
    event2 = create_maintenance_event(
        db, truck, user,
        cost=Decimal("15000.00"),
        garage_name="TyrePro",
        description="Tyre replacement",
    )

    response = client.get(
        f"{settings.API_V1_STR}/trucks/{truck.id}/maintenance-history",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] == 2
    assert len(content["data"]) == 2

    # Verify events contain expected fields
    garages = [e["garage_name"] for e in content["data"]]
    assert "AutoFix Garage" in garages
    assert "TyrePro" in garages

    # Each event should have expense data nested
    for event in content["data"]:
        assert "expense" in event
        assert event["expense"] is not None
        assert "amount" in event["expense"]


def test_maintenance_history_total_cost(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Story 3.3: Total Maintenance Cost summary is correct.
    """
    truck = create_random_truck(db)
    user = create_random_user(db)

    create_maintenance_event(db, truck, user, cost=Decimal("50000.00"))
    create_maintenance_event(db, truck, user, cost=Decimal("25000.00"))
    create_maintenance_event(db, truck, user, cost=Decimal("10000.00"))

    response = client.get(
        f"{settings.API_V1_STR}/trucks/{truck.id}/maintenance-history",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] == 3
    assert float(content["total_maintenance_cost"]) == 85000.00


def test_maintenance_history_truck_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Story 3.3: 404 when truck does not exist."""
    response = client.get(
        f"{settings.API_V1_STR}/trucks/{uuid.uuid4()}/maintenance-history",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Truck not found"


def test_maintenance_history_isolated_per_truck(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Story 3.3: Maintenance history only shows events for the requested truck."""
    truck_a = create_random_truck(db)
    truck_b = create_random_truck(db)
    user = create_random_user(db)

    create_maintenance_event(db, truck_a, user, cost=Decimal("40000.00"), garage_name="Garage A")
    create_maintenance_event(db, truck_b, user, cost=Decimal("20000.00"), garage_name="Garage B")

    # Request history for truck_a
    response = client.get(
        f"{settings.API_V1_STR}/trucks/{truck_a.id}/maintenance-history",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] == 1
    assert content["data"][0]["garage_name"] == "Garage A"
    assert float(content["total_maintenance_cost"]) == 40000.00


# ============================================================================
# Cross-table registration uniqueness tests
# ============================================================================


def test_create_truck_rejects_trailer_plate(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    A truck cannot be registered with a plate number that belongs to an existing trailer.
    """
    trailer = create_random_trailer(db)

    data = {
        "plate_number": trailer.plate_number,
        "make": "Mercedes",
        "model": "Actros",
        "status": "Idle",
    }
    response = client.post(
        f"{settings.API_V1_STR}/trucks/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "A trailer with this registration number already exists"


def test_create_truck_rejects_trailer_plate_with_different_spacing(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Cross-check is case/space insensitive: if trailer has "AB 1234",
    truck with "AB1234" is also rejected.
    """
    trailer = create_random_trailer(db)

    # Strip spaces from trailer's plate to create a differently-spaced version
    raw_plate = trailer.plate_number.replace(" ", "")

    data = {
        "plate_number": raw_plate,
        "make": "Mercedes",
        "model": "Actros",
        "status": "Idle",
    }
    response = client.post(
        f"{settings.API_V1_STR}/trucks/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "A trailer with this registration number already exists"


def test_update_truck_rejects_trailer_plate(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Updating a truck's plate to an existing trailer's plate is rejected.
    """
    truck = create_random_truck(db)
    trailer = create_random_trailer(db)

    data = {"plate_number": trailer.plate_number}
    response = client.patch(
        f"{settings.API_V1_STR}/trucks/{truck.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "A trailer with this registration number already exists"
