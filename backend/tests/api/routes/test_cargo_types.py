"""
Tests for Cargo Type Management - Story 2.8: Transport Master Data
Tests CRUD operations and duplicate prevention for cargo types.
"""
import random
import string
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.cargo_type import create_random_cargo_type


def _random_cargo_name() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase, k=6))
    return f"CargoTest_{suffix}"


def test_create_cargo_type(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """
    Scenario 2: Manage Cargo Types
    Given I am on the settings page
    When I add a cargo type "20' Container"
    Then it appears in the cargo type selector.
    """
    cargo_name = _random_cargo_name()
    data = {
        "name": cargo_name,
        "description": "Large industrial equipment requiring special transport",
    }
    response = client.post(
        f"{settings.API_V1_STR}/cargo-types/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == cargo_name
    assert content["description"] == data["description"]
    assert "id" in content
    assert "created_at" in content


def test_create_cargo_type_duplicate(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that duplicate name is rejected."""
    cargo_type = create_random_cargo_type(db)
    data = {"name": cargo_type.name, "description": "Duplicate"}
    response = client.post(
        f"{settings.API_V1_STR}/cargo-types/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_create_cargo_type_duplicate_case_insensitive(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test that duplicate check is case-insensitive."""
    name = _random_cargo_name()
    data1 = {"name": name}
    response1 = client.post(
        f"{settings.API_V1_STR}/cargo-types/",
        headers=superuser_token_headers,
        json=data1,
    )
    assert response1.status_code == 200

    data2 = {"name": name.lower()}
    response2 = client.post(
        f"{settings.API_V1_STR}/cargo-types/",
        headers=superuser_token_headers,
        json=data2,
    )
    assert response2.status_code == 400


def test_read_cargo_type(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test getting a cargo type by ID."""
    cargo_type = create_random_cargo_type(db)
    response = client.get(
        f"{settings.API_V1_STR}/cargo-types/{cargo_type.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == cargo_type.name
    assert content["id"] == str(cargo_type.id)


def test_read_cargo_type_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when cargo type doesn't exist."""
    response = client.get(
        f"{settings.API_V1_STR}/cargo-types/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Cargo type not found"


def test_read_cargo_types(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test listing all cargo types."""
    create_random_cargo_type(db)
    create_random_cargo_type(db)
    response = client.get(
        f"{settings.API_V1_STR}/cargo-types/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert "count" in content
    assert len(content["data"]) >= 2


def test_update_cargo_type(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test updating a cargo type."""
    cargo_type = create_random_cargo_type(db)
    data = {"description": "Updated description"}
    response = client.patch(
        f"{settings.API_V1_STR}/cargo-types/{cargo_type.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["description"] == "Updated description"
    assert content["id"] == str(cargo_type.id)


def test_update_cargo_type_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when updating non-existent cargo type."""
    data = {"description": "Updated"}
    response = client.patch(
        f"{settings.API_V1_STR}/cargo-types/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404


def test_update_cargo_type_duplicate_name(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that updating to a duplicate name fails."""
    ct1 = create_random_cargo_type(db)
    ct2 = create_random_cargo_type(db)

    data = {"name": ct1.name}
    response = client.patch(
        f"{settings.API_V1_STR}/cargo-types/{ct2.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400


def test_delete_cargo_type(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test deleting a cargo type."""
    cargo_type = create_random_cargo_type(db)
    response = client.delete(
        f"{settings.API_V1_STR}/cargo-types/{cargo_type.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Cargo type deleted successfully"


def test_delete_cargo_type_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when deleting non-existent cargo type."""
    response = client.delete(
        f"{settings.API_V1_STR}/cargo-types/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
