import random
import string
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.country import create_random_country


def _random_country_name() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase, k=6))
    return f"Country_{suffix}"


def _random_country_code() -> str:
    return "".join(random.choices(string.ascii_uppercase, k=2))


def test_create_country(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"name": _random_country_name(), "code": _random_country_code()}
    response = client.post(
        f"{settings.API_V1_STR}/countries/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == data["name"]
    assert content["code"] == data["code"]
    assert "id" in content
    assert "created_at" in content


def test_create_country_duplicate(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    country = create_random_country(db)
    data = {"name": country.name, "code": "XX"}
    response = client.post(
        f"{settings.API_V1_STR}/countries/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_read_country(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    country = create_random_country(db)
    response = client.get(
        f"{settings.API_V1_STR}/countries/{country.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == country.name
    assert content["id"] == str(country.id)


def test_read_country_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/countries/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Country not found"


def test_read_countries(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    create_random_country(db)
    create_random_country(db)
    response = client.get(
        f"{settings.API_V1_STR}/countries/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    assert "count" in content
    assert len(content["data"]) >= 2


def test_update_country(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    country = create_random_country(db)
    data = {"code": "ZZ"}
    response = client.patch(
        f"{settings.API_V1_STR}/countries/{country.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["code"] == "ZZ"
    assert content["id"] == str(country.id)


def test_delete_country(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    country = create_random_country(db)
    response = client.delete(
        f"{settings.API_V1_STR}/countries/{country.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Country deleted successfully"
