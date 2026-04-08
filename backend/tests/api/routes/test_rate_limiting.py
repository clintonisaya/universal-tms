"""Tests for rate limiting - Story 9.3 API Rate Limiting"""

from fastapi.testclient import TestClient

from app.core.config import settings


def test_login_rate_limit_returns_429(client: TestClient) -> None:
    """Exceeding the login rate limit returns 429 Too Many Requests."""
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": "wrongpassword",
    }
    # Exceed the 5/minute limit
    for _ in range(5):
        client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)

    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 429
    assert "Retry-After" in r.headers


def test_normal_login_within_limits(client: TestClient) -> None:
    """A single successful login stays within rate limits."""
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200
    assert "access_token" in r.json()
