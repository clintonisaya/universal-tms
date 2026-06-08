from collections.abc import Callable, Generator
from typing import Annotated

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app.core import security
from app.core.config import settings
from app.core.db import engine
from app.models import TokenPayload, User, UserRole
from app.modules.permissions import has_full_access, has_permission

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False,  # Don't auto-raise, we'll check cookie too
)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str | None, Depends(reusable_oauth2)]


def get_token_from_header_or_cookie(
    token_header: TokenDep,
    access_token: Annotated[str | None, Cookie()] = None,
) -> str:
    """Extract token from Authorization header or cookie."""
    token = token_header or access_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token


def get_current_user(
    session: SessionDep,
    token: Annotated[str, Depends(get_token_from_header_or_cookie)],
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user


def get_current_admin_user(current_user: CurrentUser) -> User:
    """Validate user has admin role OR is superuser."""
    if has_full_access(current_user):
        return current_user
    raise HTTPException(
        status_code=403, detail="The user doesn't have enough privileges"
    )


def get_current_manager_or_admin(current_user: CurrentUser) -> User:
    """Validate user has admin OR manager role."""
    if has_full_access(current_user):
        return current_user
    if current_user.role not in [UserRole.admin, UserRole.manager]:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user


def assert_user_has_permission(
    current_user: User,
    permission: str,
    *,
    detail: str = "Not enough permissions",
) -> None:
    if not has_permission(current_user, permission):
        raise HTTPException(status_code=403, detail=detail)


def require_permission(
    permission: str,
    *,
    detail: str = "Not enough permissions",
) -> Callable[[User], User]:
    def dependency(current_user: CurrentUser) -> User:
        assert_user_has_permission(current_user, permission, detail=detail)
        return current_user

    return dependency

