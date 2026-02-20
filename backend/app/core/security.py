from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Response
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import settings

password_hash = PasswordHash(
    (
        Argon2Hasher(),
        BcryptHasher(),
    )
)


ALGORITHM = "HS256"


def create_access_token(
    subject: str | Any, expires_delta: timedelta, role: str | None = None
) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode: dict[str, Any] = {"exp": expire, "sub": str(subject)}
    if role:
        to_encode["role"] = role
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(
    plain_password: str, hashed_password: str
) -> tuple[bool, str | None]:
    return password_hash.verify_and_update(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return password_hash.hash(password)


def set_auth_cookie(response: Response, token: str) -> None:
    """Set HTTP-Only access_token cookie."""
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="none" if settings.ENVIRONMENT != "local" else "lax",
        secure=settings.ENVIRONMENT != "local",  # Secure in non-local envs
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    """Clear the access_token cookie."""
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="none" if settings.ENVIRONMENT != "local" else "lax",
        secure=settings.ENVIRONMENT != "local",
        path="/",
    )
