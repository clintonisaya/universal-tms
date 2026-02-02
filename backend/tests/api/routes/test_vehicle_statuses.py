"""
Tests for Vehicle Status Management - Story 2.8: Transport Master Data
Tests CRUD operations and duplicate prevention for vehicle statuses.
"""
import random
import string
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.vehicle_status import create_random_vehicle_status


def _random_status_name() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase, k=6))
    return f"Status_{suffix}"


def test_create_vehicle_status(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """
    Scenario 3: Manage Vehicle Statuses
    Given I am on the settings page
    When I add a status "Waiting Offloading"
    Then it becomes available for Trip status updates.
    """
    status_name = _random_status_name()
    data = {
        "name": status_name,
        "description": "Vehicle is waiting for inspection clearance",
        "is_active": True,
    }
    response = client.post(
        f"{settings.API_V1_STR}/vehicle-statuses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == status_name
    assert content["description"] == data["description"]
    assert content["is_active"] is True
    assert "id" in content
    assert "created_at" in content


def test_create_vehicle_status_duplicate(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that duplicate name is rejected."""
    status = create_random_vehicle_status(db)
    data = {"name": status.name, "description": "Duplicate"}
    response = client.post(
        f"{settings.API_V1_STR}/vehicle-statuses/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_create_vehicle_status_duplicate_case_insensitive(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test that duplicate check is case-insensitive."""
    name = _random_status_name()
    data1 = {"name": name}
    response1 = client.post(
        f"{settings.API_V1_STR}/vehicle-statuses/",
        headers=superuser_token_headers,
        json=data1,
    )
    assert response1.status_code == 200

    data2 = {"name": name.lower()}
    response2 = client.post(
        f"{settings.API_V1_STR}/vehicle-statuses/",
        headers=superuser_token_headers,
        json=data2,
    )
    assert response2.status_code == 400


def test_read_vehicle_status(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test getting a vehicle status by ID."""
    status = create_random_vehicle_status(db)
    response = client.get(
        f"{settings.API_V1_STR}/vehicle-statuses/{status.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == status.name
    assert content["id"] == str(status.id)


def test_read_vehicle_status_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when vehicle status doesn't exist."""
    response = client.get(
        f"{settings.API_V1_STR}/vehicle-statuses/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Vehicle status not found"


def test_read_vehicle_statuses(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test listing all vehicle statuses."""
    create_random_vehicle_status(db)
    create_random_vehicle_status(db)
    response = client.get(
        f"{settings.API_V1_STR}/vehicle-statuses/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert "count" in content
    assert len(content["data"]) >= 2


def test_read_vehicle_statuses_active_only(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test filtering by active_only."""
    status = create_random_vehicle_status(db)

    response = client.get(
        f"{settings.API_V1_STR}/vehicle-statuses/?active_only=true",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    # All returned should be active
    for s in content["data"]:
        assert s["is_active"] is True


def test_update_vehicle_status(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test updating a vehicle status."""
    status = create_random_vehicle_status(db)
    data = {"description": "Updated description", "is_active": False}
    response = client.patch(
        f"{settings.API_V1_STR}/vehicle-statuses/{status.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["description"] == "Updated description"
    assert content["is_active"] is False
    assert content["id"] == str(status.id)


def test_update_vehicle_status_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when updating non-existent vehicle status."""
    data = {"description": "Updated"}
    response = client.patch(
        f"{settings.API_V1_STR}/vehicle-statuses/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404


def test_update_vehicle_status_duplicate_name(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that updating to a duplicate name fails."""
    s1 = create_random_vehicle_status(db)
    s2 = create_random_vehicle_status(db)

    data = {"name": s1.name}
    response = client.patch(
        f"{settings.API_V1_STR}/vehicle-statuses/{s2.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400


def test_delete_vehicle_status(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test deleting a vehicle status."""
    status = create_random_vehicle_status(db)
    response = client.delete(
        f"{settings.API_V1_STR}/vehicle-statuses/{status.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Vehicle status deleted successfully"


def test_delete_vehicle_status_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when deleting non-existent vehicle status."""
    response = client.delete(
        f"{settings.API_V1_STR}/vehicle-statuses/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
