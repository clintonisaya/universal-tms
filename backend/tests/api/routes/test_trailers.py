"""
Tests for Trailer Registry Management - Story 1.6
Tests CRUD operations and duplicate prevention.
"""
import random
import string
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import TrailerStatus
from tests.utils.trailer import create_random_trailer


def test_create_trailer(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """
    Scenario 1: Register New Trailer
    Given I am a Fleet Manager
    When I submit the "New Trailer" form with valid data
    Then the trailer is saved to the database
    And it appears in the Table List
    """
    letters = "".join(random.choices(string.ascii_uppercase, k=2))
    digits = "".join(random.choices(string.digits, k=4))
    plate_input = f"{letters} {digits}"
    expected_normalized = f"{letters}{digits}"

    data = {
        "plate_number": plate_input,
        "type": "Flatbed",
        "make": "Hambure",
        "status": "Idle",
    }
    response = client.post(
        f"{settings.API_V1_STR}/trailers/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["plate_number"] == expected_normalized
    assert content["type"] == data["type"]
    assert content["make"] == data["make"]
    assert content["status"] == data["status"]
    assert "id" in content
    assert "created_at" in content


def test_create_trailer_duplicate_plate(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """
    Scenario 2: Prevent Duplicates
    Given "ZD 4040" exists
    When I try to register another trailer with "ZD 4040"
    Then I get an error "Trailer with this plate already exists"
    """
    # Create first trailer
    trailer = create_random_trailer(db)

    # Try to create duplicate
    data = {
        "plate_number": trailer.plate_number,  # Use same plate
        "type": "Box",
        "make": "Krone",
        "status": "Idle",
    }
    response = client.post(
        f"{settings.API_V1_STR}/trailers/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "Trailer with this plate already exists"


def test_create_trailer_duplicate_plate_with_different_spacing(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """
    Test that plates are normalized - "ZD 5050" and "ZD5050" are the same.
    """
    letters = "".join(random.choices(string.ascii_uppercase, k=2))
    digits = "".join(random.choices(string.digits, k=4))
    plate_with_spaces = f"{letters} {digits}"
    plate_no_spaces = f"{letters}{digits}"

    # Create first trailer with spaces
    data1 = {
        "plate_number": plate_with_spaces,
        "type": "Flatbed",
        "make": "Hambure",
        "status": "Idle",
    }
    response1 = client.post(
        f"{settings.API_V1_STR}/trailers/",
        headers=superuser_token_headers,
        json=data1,
    )
    assert response1.status_code == 200

    # Try to create with no spaces - should be duplicate
    data2 = {
        "plate_number": plate_no_spaces,
        "type": "Skeleton",
        "make": "Krone",
        "status": "Idle",
    }
    response2 = client.post(
        f"{settings.API_V1_STR}/trailers/",
        headers=superuser_token_headers,
        json=data2,
    )
    assert response2.status_code == 400
    content2 = response2.json()
    assert content2["detail"] == "Trailer with this plate already exists"


def test_plate_number_normalization(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """
    Test that plate numbers are formatted consistently.
    """
    # Generate random lowercase letters + digits
    letters = "".join(random.choices(string.ascii_lowercase, k=2))
    digits = "".join(random.choices(string.digits, k=4))
    plate_input = f"  {letters}  {digits}  "
    expected_normalized = f"{letters.upper()}{digits}"

    # Create trailer with lowercase and extra spaces
    data = {
        "plate_number": plate_input,
        "type": "Tanker",
        "make": "Hambure",
        "status": "Idle",
    }
    response = client.post(
        f"{settings.API_V1_STR}/trailers/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    # Should be formatted: uppercase, no trailing letters so no space added
    assert content["plate_number"] == expected_normalized


def test_read_trailer(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test getting a trailer by ID."""
    trailer = create_random_trailer(db)
    response = client.get(
        f"{settings.API_V1_STR}/trailers/{trailer.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["plate_number"] == trailer.plate_number
    assert content["make"] == trailer.make
    assert content["id"] == str(trailer.id)


def test_read_trailer_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when trailer doesn't exist."""
    response = client.get(
        f"{settings.API_V1_STR}/trailers/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Trailer not found"


def test_read_trailers(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test listing all trailers."""
    create_random_trailer(db)
    create_random_trailer(db)
    response = client.get(
        f"{settings.API_V1_STR}/trailers/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert "count" in content
    assert len(content["data"]) >= 2


def test_update_trailer(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test updating a trailer."""
    trailer = create_random_trailer(db)
    data = {"status": "In Transit"}
    response = client.patch(
        f"{settings.API_V1_STR}/trailers/{trailer.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["status"] == TrailerStatus.in_transit.value
    assert content["id"] == str(trailer.id)


def test_update_trailer_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when updating non-existent trailer."""
    data = {"status": "Maintenance"}
    response = client.patch(
        f"{settings.API_V1_STR}/trailers/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Trailer not found"


def test_update_trailer_duplicate_plate(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test that updating to an existing plate number fails."""
    trailer1 = create_random_trailer(db)
    trailer2 = create_random_trailer(db)

    # Try to update trailer2 with trailer1's plate
    data = {"plate_number": trailer1.plate_number}
    response = client.patch(
        f"{settings.API_V1_STR}/trailers/{trailer2.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    content = response.json()
    assert content["detail"] == "Trailer with this plate already exists"


def test_delete_trailer(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Test deleting a trailer."""
    trailer = create_random_trailer(db)
    response = client.delete(
        f"{settings.API_V1_STR}/trailers/{trailer.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["message"] == "Trailer deleted successfully"


def test_delete_trailer_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 404 when deleting non-existent trailer."""
    response = client.delete(
        f"{settings.API_V1_STR}/trailers/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Trailer not found"


def test_create_trailer_all_types(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test creating trailers with all available types."""
    base = "".join(random.choices(string.ascii_uppercase, k=2))
    types = ["Flatbed", "Skeleton", "Box", "Tanker"]
    for i, trailer_type in enumerate(types):
        digits = f"{random.randint(1000, 9999)}"
        data = {
            "plate_number": f"{base}{i}{digits}",
            "type": trailer_type,
            "make": "TestMake",
            "status": "Idle",
        }
        response = client.post(
            f"{settings.API_V1_STR}/trailers/",
            headers=superuser_token_headers,
            json=data,
        )
        assert response.status_code == 200
        content = response.json()
        assert content["type"] == trailer_type
