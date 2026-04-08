import random
import string

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import User


def test_create_user_unauthenticated_returns_401(client: TestClient) -> None:
    """Unauthenticated POST to /private/users/ must return 401."""
    suffix = "".join(random.choices(string.ascii_lowercase, k=8))
    r = client.post(
        f"{settings.API_V1_STR}/private/users/",
        json={
            "username": f"testuser_{suffix}",
            "password": "password123",
            "full_name": f"Test User {suffix}",
        },
    )
    assert r.status_code == 401


def test_create_user_normal_user_returns_403(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    """Non-admin authenticated user must get 403."""
    suffix = "".join(random.choices(string.ascii_lowercase, k=8))
    r = client.post(
        f"{settings.API_V1_STR}/private/users/",
        headers=normal_user_token_headers,
        json={
            "username": f"testuser_{suffix}",
            "password": "password123",
            "full_name": f"Test User {suffix}",
        },
    )
    assert r.status_code == 403


def test_create_user_admin_succeeds(
    client: TestClient,
    db: Session,
    superuser_token_headers: dict[str, str],
) -> None:
    """Admin (superuser) POST to /private/users/ must succeed."""
    suffix = "".join(random.choices(string.ascii_lowercase, k=8))
    username = f"testuser_{suffix}"
    full_name = f"Test User {suffix}"
    r = client.post(
        f"{settings.API_V1_STR}/private/users/",
        headers=superuser_token_headers,
        json={
            "username": username,
            "password": "password123",
            "full_name": full_name,
        },
    )
    assert r.status_code == 200

    data = r.json()
    user = db.exec(select(User).where(User.id == data["id"])).first()
    assert user
    assert user.username == username
    assert user.full_name == full_name
