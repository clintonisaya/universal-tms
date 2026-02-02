import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.city import create_random_city
from tests.utils.country import create_random_country


def test_create_city(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    country = create_random_country(db)
    data = {"name": "Lusaka", "country_id": str(country.id)}
    response = client.post(
        f"{settings.API_V1_STR}/cities/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == data["name"]
    assert content["country_id"] == data["country_id"]
    assert "id" in content


def test_create_city_invalid_country(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"name": "Nowhere", "country_id": str(uuid.uuid4())}
    response = client.post(
        f"{settings.API_V1_STR}/cities/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    assert "Country not found" in response.json()["detail"]


def test_read_city(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    city = create_random_city(db)
    response = client.get(
        f"{settings.API_V1_STR}/cities/{city.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == city.name
    assert content["id"] == str(city.id)
    assert content["country_id"] == str(city.country_id)
    assert "country" in content


def test_read_cities(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    create_random_city(db)
    create_random_city(db)
    response = client.get(
        f"{settings.API_V1_STR}/cities/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert "count" in content
    assert len(content["data"]) >= 2


def test_update_city(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    city = create_random_city(db)
    data = {"name": "New Name"}
    response = client.patch(
        f"{settings.API_V1_STR}/cities/{city.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == "New Name"
    assert content["id"] == str(city.id)


def test_delete_city(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    city = create_random_city(db)
    response = client.delete(
        f"{settings.API_V1_STR}/cities/{city.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "City deleted successfully"
