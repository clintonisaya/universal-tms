"""
Story 10.3 - Task 4: Pagination bounds tests.
Ensures list endpoints enforce limit <= 500 and skip >= 0.
"""
from fastapi.testclient import TestClient

from app.core.config import settings


def test_limit_over_500_returns_422_trucks(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Requesting limit > 500 on trucks list returns 422."""
    response = client.get(
        f"{settings.API_V1_STR}/trucks/",
        headers=superuser_token_headers,
        params={"limit": 501},
    )
    assert response.status_code == 422


def test_limit_exactly_500_accepted(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Requesting limit=500 is accepted."""
    response = client.get(
        f"{settings.API_V1_STR}/trucks/",
        headers=superuser_token_headers,
        params={"limit": 500},
    )
    assert response.status_code == 200


def test_limit_99999_returns_422_drivers(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Requesting limit=99999 on drivers list returns 422."""
    response = client.get(
        f"{settings.API_V1_STR}/drivers/",
        headers=superuser_token_headers,
        params={"limit": 99999},
    )
    assert response.status_code == 422


def test_negative_skip_returns_422(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Requesting skip < 0 returns 422."""
    response = client.get(
        f"{settings.API_V1_STR}/trucks/",
        headers=superuser_token_headers,
        params={"skip": -1},
    )
    assert response.status_code == 422


def test_limit_zero_returns_422(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Requesting limit=0 returns 422 (ge=1 constraint)."""
    response = client.get(
        f"{settings.API_V1_STR}/trucks/",
        headers=superuser_token_headers,
        params={"limit": 0},
    )
    assert response.status_code == 422


def test_limit_over_500_expenses(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Requesting limit > 500 on expenses list returns 422."""
    response = client.get(
        f"{settings.API_V1_STR}/expenses/",
        headers=superuser_token_headers,
        params={"limit": 999},
    )
    assert response.status_code == 422


def test_limit_over_500_clients(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Requesting limit > 500 on clients list returns 422."""
    response = client.get(
        f"{settings.API_V1_STR}/clients/",
        headers=superuser_token_headers,
        params={"limit": 600},
    )
    assert response.status_code == 422
