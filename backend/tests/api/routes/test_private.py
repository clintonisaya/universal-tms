import random
import string

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.models import User


def test_create_user(client: TestClient, db: Session) -> None:
    suffix = "".join(random.choices(string.ascii_lowercase, k=8))
    username = f"testuser_{suffix}"
    full_name = f"Test User {suffix}"
    r = client.post(
        f"{settings.API_V1_STR}/private/users/",
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
