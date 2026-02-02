"""Tests for user role functionality - Story 1.2"""

from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate, UserRole
from tests.utils.utils import random_username, random_lower_string


def test_create_user_with_ops_role(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """AC1: Create user with Ops role"""
    username = random_username()
    password = random_lower_string()
    data = {"username": username, "password": password, "role": "ops"}
    r = client.post(
        f"{settings.API_V1_STR}/users/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    created_user = r.json()
    assert created_user["username"] == username
    assert created_user["role"] == "ops"


def test_create_user_with_manager_role(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """AC1: Create user with Manager role"""
    username = random_username()
    password = random_lower_string()
    data = {"username": username, "password": password, "role": "manager"}
    r = client.post(
        f"{settings.API_V1_STR}/users/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    created_user = r.json()
    assert created_user["role"] == "manager"


def test_create_user_with_finance_role(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """AC1: Create user with Finance role"""
    username = random_username()
    password = random_lower_string()
    data = {"username": username, "password": password, "role": "finance"}
    r = client.post(
        f"{settings.API_V1_STR}/users/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    created_user = r.json()
    assert created_user["role"] == "finance"


def test_create_user_with_admin_role(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """AC1: Create user with Admin role"""
    username = random_username()
    password = random_lower_string()
    data = {"username": username, "password": password, "role": "admin"}
    r = client.post(
        f"{settings.API_V1_STR}/users/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    created_user = r.json()
    assert created_user["role"] == "admin"


def test_create_user_default_role_is_ops(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """When no role specified, default to ops"""
    username = random_username()
    password = random_lower_string()
    data = {"username": username, "password": password}
    r = client.post(
        f"{settings.API_V1_STR}/users/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    created_user = r.json()
    assert created_user["role"] == "ops"


def test_create_user_with_invalid_role(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Invalid role should be rejected"""
    username = random_username()
    password = random_lower_string()
    data = {"username": username, "password": password, "role": "invalid_role"}
    r = client.post(
        f"{settings.API_V1_STR}/users/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 422  # Validation error


def test_duplicate_username_rejected(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """AC2: Cannot create user with duplicate username"""
    username = random_username()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password)
    crud.create_user(session=db, user_create=user_in)

    data = {"username": username, "password": password, "role": "ops"}
    r = client.post(
        f"{settings.API_V1_STR}/users/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 400
    assert "already exists" in r.json()["detail"]


def test_new_user_can_login_immediately(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """AC3: New user can log in immediately after creation"""
    username = random_username()
    password = random_lower_string()
    data = {"username": username, "password": password, "role": "manager"}

    # Create user
    r = client.post(
        f"{settings.API_V1_STR}/users/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200

    # Immediately try to login
    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200
    tokens = r.json()
    assert "access_token" in tokens
    assert tokens["token_type"] == "bearer"


def test_user_role_returned_in_get_users(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Role should be included when listing users"""
    r = client.get(f"{settings.API_V1_STR}/users/", headers=superuser_token_headers)
    assert r.status_code == 200
    users = r.json()
    assert "data" in users
    # All users should have a role field
    for user in users["data"]:
        assert "role" in user


def test_user_role_returned_in_get_me(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Role should be included in /users/me response"""
    r = client.get(f"{settings.API_V1_STR}/users/me", headers=superuser_token_headers)
    assert r.status_code == 200
    user = r.json()
    assert "role" in user
