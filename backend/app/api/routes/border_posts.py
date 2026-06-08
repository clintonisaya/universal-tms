"""
Border Post Management - Story 2.26: Border Crossing Tracking
CRUD endpoints for system-managed border post pairs.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep, assert_user_has_permission
from app.core.db import commit_or_rollback
from app.modules.permissions import Permission
from app.models import (
    BorderPost,
    BorderPostCreate,
    BorderPostPublic,
    BorderPostsPublic,
    BorderPostUpdate,
    Message,
)
from app.modules.master_data import DuplicateNameError, check_duplicate_name, filtered_list_query

router = APIRouter(prefix="/border-posts", tags=["border-posts"])


@router.get("", response_model=BorderPostsPublic)
def read_border_posts(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=500),
    active_only: bool = Query(default=False, description="Filter to active border posts only"),
) -> Any:
    """Retrieve all border posts."""
    return filtered_list_query(
        session, BorderPost,
        skip=skip, limit=limit,
        active_only=active_only,
        order_fields=("display_name",),
    )


@router.get("/{id}", response_model=BorderPostPublic)
def read_border_post(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """Get border post by ID."""
    border_post = session.get(BorderPost, id)
    if not border_post:
        raise HTTPException(status_code=404, detail="Border post not found")
    return border_post


@router.post("", response_model=BorderPostPublic)
def create_border_post(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    border_post_in: BorderPostCreate,
) -> Any:
    """Create a new border post. Requires admin or manager role."""
    assert_user_has_permission(
        current_user,
        Permission.SETTINGS_BORDER_POSTS,
        detail="Only admin or manager can manage border posts",
    )

    try:
        check_duplicate_name(session, BorderPost, border_post_in.display_name, name_field="display_name")
    except DuplicateNameError as e:
        raise HTTPException(status_code=400, detail=str(e))

    border_post = BorderPost.model_validate(border_post_in)
    session.add(border_post)
    commit_or_rollback(session)
    session.refresh(border_post)
    return border_post


@router.patch("/{id}", response_model=BorderPostPublic)
def update_border_post(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    border_post_in: BorderPostUpdate,
) -> Any:
    """Update a border post. Requires admin or manager role."""
    assert_user_has_permission(
        current_user,
        Permission.SETTINGS_BORDER_POSTS,
        detail="Only admin or manager can manage border posts",
    )

    border_post = session.get(BorderPost, id)
    if not border_post:
        raise HTTPException(status_code=404, detail="Border post not found")

    update_data = border_post_in.model_dump(exclude_unset=True)

    if "display_name" in update_data:
        try:
            check_duplicate_name(session, BorderPost, update_data["display_name"], name_field="display_name", exclude_id=id)
        except DuplicateNameError as e:
            raise HTTPException(status_code=400, detail=str(e))

    border_post.sqlmodel_update(update_data)
    session.add(border_post)
    commit_or_rollback(session)
    session.refresh(border_post)
    return border_post


@router.delete("/{id}", status_code=204)
def delete_border_post(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> None:
    """
    Delete a border post.
    Soft-deletes (sets is_active=False) if crossing records exist;
    hard-deletes if no crossings have been recorded.
    Requires admin role.
    """
    assert_user_has_permission(
        current_user,
        Permission.SETTINGS_BORDER_POSTS,
        detail="Only admin can delete border posts",
    )

    border_post = session.get(BorderPost, id)
    if not border_post:
        raise HTTPException(status_code=404, detail="Border post not found")

    # Import here to avoid circular imports at module level
    from app.models import TripBorderCrossing
    has_crossings = session.exec(
        select(TripBorderCrossing).where(TripBorderCrossing.border_post_id == id).limit(1)
    ).first()

    if has_crossings:
        # Soft delete — crossing records must be preserved for audit
        border_post.is_active = False
        session.add(border_post)
        commit_or_rollback(session)
        return

    session.delete(border_post)
    commit_or_rollback(session)
