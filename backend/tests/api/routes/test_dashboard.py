"""
Tests for Dashboard Stats endpoint.
"""
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings


def test_dashboard_stats_authenticated(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Dashboard stats returns expected keys for authenticated user."""
    response = client.get(
        f"{settings.API_V1_STR}/dashboard/stats",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_trucks" in data
    assert "trucks_in_transit" in data
    assert "completed_trips" in data
    assert "pending_approvals" in data
    assert "total_paid_amount" in data
    assert "trucks_by_status" in data
    assert "trips_by_status" in data
    assert isinstance(data["total_trucks"], int)
    assert isinstance(data["pending_approvals"], int)


def test_dashboard_stats_unauthenticated() -> None:
    """Dashboard stats rejects unauthenticated requests."""
    from app.main import app
    with TestClient(app, cookies={}) as fresh_client:
        response = fresh_client.get(f"{settings.API_V1_STR}/dashboard/stats")
        assert response.status_code in (401, 403)
