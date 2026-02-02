"""
Tests for Driver Registry Management - Story 1.5
Tests CRUD operations and duplicate prevention.
"""
import random
import string
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import DriverStatus
from tests.utils.driver import create_random_driver


def test_create_driver(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """
    Scenario 1: Register Driver
    Given I am a Fleet Manager
    When I submit the "New Driver" form with valid data
    Then the driver is saved
    And default status is "Active"
    """
    license_num = "DL-" + "".join(random.choices(string.digits, k=6))
    data = {
        "full_name": "John Doe",
        "license_number": license_num,
        "phone_number": "+254700000000",
    }
    response = client.post(
        f"{settings.API_V1_STR}/drivers/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["full_name"] == data["full_name"]
    assert content["license_number"] == license_num  # Normalized
    assert content["phone_number"] == data["phone_number"]
    assert content["status"] == "Active"  # Default status
    assert "id" in content
    assert "created_at" in content


def test_create_driver_duplicate_license(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Test that duplicate license numbers are rejected.
    """
    driver = create_random_driver(db)

    data = {
        "full_name": "Another Driver",
        "license_number": driver.license_number,
        "phone_number": "+254711111111",
    }
    response = client.post(
        f"{settings.API_V1_STR}/drivers/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "Driver with this license number already exists"


def test_read_driver(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test getting a driver by ID."""
    driver = create_random_driver(db)
    response = client.get(
        f"{settings.API_V1_STR}/drivers/{driver.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["full_name"] == driver.full_name
    assert content["license_number"] == driver.license_number
    assert content["id"] == str(driver.id)


def test_read_driver_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when driver doesn't exist."""
    response = client.get(
        f"{settings.API_V1_STR}/drivers/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Driver not found"


def test_read_drivers(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Scenario 2: Listing
    Given multiple drivers exist
    When I view the Driver Registry
    Then I see all drivers with their current status
    """
    create_random_driver(db)
    create_random_driver(db)
    response = client.get(
        f"{settings.API_V1_STR}/drivers/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert "count" in content
    assert len(content["data"]) >= 2
    # Verify status is included
    for driver in content["data"]:
        assert "status" in driver


def test_update_driver(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test updating a driver."""
    driver = create_random_driver(db)
    data = {"status": "On Trip"}
    response = client.patch(
        f"{settings.API_V1_STR}/drivers/{driver.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["status"] == DriverStatus.on_trip.value
    assert content["id"] == str(driver.id)


def test_update_driver_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when updating non-existent driver."""
    data = {"status": "Inactive"}
    response = client.patch(
        f"{settings.API_V1_STR}/drivers/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Driver not found"


def test_update_driver_duplicate_license(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that updating to an existing license number fails."""
    driver1 = create_random_driver(db)
    driver2 = create_random_driver(db)

    data = {"license_number": driver1.license_number}
    response = client.patch(
        f"{settings.API_V1_STR}/drivers/{driver2.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "Driver with this license number already exists"


def test_delete_driver(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test deleting a driver."""
    driver = create_random_driver(db)
    response = client.delete(
        f"{settings.API_V1_STR}/drivers/{driver.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["message"] == "Driver deleted successfully"


def test_delete_driver_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when deleting non-existent driver."""
    response = client.delete(
        f"{settings.API_V1_STR}/drivers/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Driver not found"
