"""Tests for login functionality - Story 1.2 username-based auth, Story 1.3 secure auth"""

import jwt
from fastapi.testclient import TestClient
from pwdlib.hashers.bcrypt import BcryptHasher
from sqlmodel import Session

from app.core.config import settings
from app.core.security import get_password_hash, verify_password, ALGORITHM
from app.crud import create_user
from app.models import User, UserCreate, UserRole
from tests.utils.utils import random_username, random_lower_string


def test_get_access_token(client: TestClient) -> None:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    assert r.status_code == 200
    assert "access_token" in tokens
    assert tokens["access_token"]


def test_get_access_token_incorrect_password(client: TestClient) -> None:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": "incorrect",
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 400


def test_get_access_token_incorrect_username(client: TestClient) -> None:
    login_data = {
        "username": "nonexistentuser",
        "password": "somepassword",
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 400


def test_use_access_token(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.post(
        f"{settings.API_V1_STR}/login/test-token",
        headers=superuser_token_headers,
    )
    result = r.json()
    assert r.status_code == 200
    assert "username" in result


def test_login_with_bcrypt_password_upgrades_to_argon2(
    client: TestClient, db: Session
) -> None:
    """Test that logging in with a bcrypt password hash upgrades it to argon2."""
    username = random_username()
    password = random_lower_string()

    # Create a bcrypt hash directly (simulating legacy password)
    bcrypt_hasher = BcryptHasher()
    bcrypt_hash = bcrypt_hasher.hash(password)
    assert bcrypt_hash.startswith("$2")  # bcrypt hashes start with $2

    user = User(username=username, hashed_password=bcrypt_hash, is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    assert user.hashed_password.startswith("$2")

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200
    tokens = r.json()
    assert "access_token" in tokens

    db.refresh(user)

    # Verify the hash was upgraded to argon2
    assert user.hashed_password.startswith("$argon2")

    verified, updated_hash = verify_password(password, user.hashed_password)
    assert verified
    # Should not need another update since it's already argon2
    assert updated_hash is None


def test_login_with_argon2_password_keeps_hash(client: TestClient, db: Session) -> None:
    """Test that logging in with an argon2 password hash does not update it."""
    username = random_username()
    password = random_lower_string()

    # Create an argon2 hash (current default)
    argon2_hash = get_password_hash(password)
    assert argon2_hash.startswith("$argon2")

    # Create user with argon2 hash
    user = User(username=username, hashed_password=argon2_hash, is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)

    original_hash = user.hashed_password

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200
    tokens = r.json()
    assert "access_token" in tokens

    db.refresh(user)

    assert user.hashed_password == original_hash
    assert user.hashed_password.startswith("$argon2")


def test_login_inactive_user(client: TestClient, db: Session) -> None:
    """Test that inactive users cannot login."""
    username = random_username()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password, is_active=False)
    create_user(session=db, user_create=user_in)

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 400
    assert r.json()["detail"] == "Inactive user"


# Story 1.3: Secure Authentication Tests

def test_access_token_contains_role_claim(client: TestClient, db: Session) -> None:
    """Test that JWT access token contains the user's role claim."""
    username = random_username()
    password = random_lower_string()
    user_in = UserCreate(username=username, password=password, role=UserRole.manager)
    create_user(session=db, user_create=user_in)

    login_data = {"username": username, "password": password}
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200

    tokens = r.json()
    access_token = tokens["access_token"]

    # Decode the token and verify role is present
    payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    assert "role" in payload
    assert payload["role"] == "manager"


def test_access_token_contains_role_for_superuser(client: TestClient) -> None:
    """Test that superuser's JWT contains admin role."""
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200

    tokens = r.json()
    access_token = tokens["access_token"]

    # Decode the token and verify role is present
    payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    assert "role" in payload
    assert payload["role"] == "admin"


def test_login_sets_httponly_cookie(client: TestClient) -> None:
    """Test that login sets an HTTP-Only cookie with the access token."""
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200

    # Check cookie is set
    assert "access_token" in r.cookies
    cookie = r.cookies.get("access_token")
    assert cookie is not None


def test_logout_clears_cookie(client: TestClient) -> None:
    """Test that logout clears the access_token cookie."""
    # First login
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200

    # Now logout
    r = client.post(f"{settings.API_V1_STR}/logout")
    assert r.status_code == 200
    assert r.json()["message"] == "Logged out successfully"

    # Cookie should be cleared (set to empty or deleted)
    # TestClient may show empty string for cleared cookies
    cookie_value = r.cookies.get("access_token", "")
    assert cookie_value == "" or "access_token" not in r.cookies


def test_cookie_auth_access_protected_route(client: TestClient) -> None:
    """Test that cookie-based auth works for protected routes."""
    # Login to get cookie
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 200

    # Access protected route using cookie (no Authorization header)
    r = client.post(f"{settings.API_V1_STR}/login/test-token")
    assert r.status_code == 200
    assert r.json()["username"] == settings.FIRST_SUPERUSER


def test_invalid_login_no_cookie(client: TestClient) -> None:
    """Test that invalid login does not set any cookie."""
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": "wrongpassword",
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    assert r.status_code == 400

    # No cookie should be set
    assert "access_token" not in r.cookies
