from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import OAuth2PasswordRequestForm

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.core import security
from app.core.config import settings
from app.models import Message, Token, UserPublic

router = APIRouter(tags=["login"])


@router.post("/login/access-token")
def login_access_token(
    response: Response,
    session: SessionDep,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests.
    Sets HTTP-Only cookie and returns token in response body.
    """
    user = crud.authenticate(
        session=session, username=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires, role=user.role.value
    )
    # Set HTTP-Only cookie
    security.set_auth_cookie(response, access_token)
    return Token(access_token=access_token)


@router.get("/login/test-token", response_model=UserPublic)
def test_token(current_user: CurrentUser) -> Any:
    """
    Test access token
    """
    return current_user


@router.post("/logout", response_model=Message)
def logout(response: Response) -> Message:
    """
    Logout by clearing the access_token cookie.
    """
    security.clear_auth_cookie(response)
    return Message(message="Logged out successfully")
