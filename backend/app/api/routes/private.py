from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import SessionDep, get_current_admin_user
from app.core.db import commit_or_rollback
from app.core.security import get_password_hash
from app.models import (
    User,
    UserPublic,
)

router = APIRouter(tags=["private"], prefix="/private")


class PrivateUserCreate(BaseModel):
    username: str
    password: str
    full_name: str


@router.post("/users/", response_model=UserPublic)
def create_user(
    user_in: PrivateUserCreate,
    session: SessionDep,
    _admin: User = Depends(get_current_admin_user),
) -> Any:
    """
    Create a new user (private/internal endpoint).
    Requires admin authentication.
    """

    user = User(
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
    )

    session.add(user)
    commit_or_rollback(session)

    return user
