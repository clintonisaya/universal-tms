"""
Border Post Management - Story 2.26: Border Crossing Tracking
CRUD endpoints for system-managed border post pairs.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
from app.models import (
    BorderPost,
    BorderPostCreate,
    BorderPostPublic,
    BorderPostsPublic,
    BorderPostUpdate,
    Message,
    UserRole,
)

def _has_permission(user, permission: str) -> bool:
    """Check granular permission — admin/superuser bypasses all checks."""
    if user.is_superuser or user.role == UserRole.admin:
        return True
    return permission in (user.permissions or [])

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
    query = select(BorderPost)
    if active_only:
        query = query.where(BorderPost.is_active == True)

    count_statement = select(func.count()).select_from(query.subquery())
    count = session.exec(count_statement).one()

    query = query.order_by(BorderPost.display_name).offset(skip).limit(limit)
    border_posts = session.exec(query).all()

    return BorderPostsPublic(data=border_posts, count=count)


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
    if not _has_permission(current_user, "settings:border-posts"):
        raise HTTPException(status_code=403, detail="Only admin or manager can manage border posts")

    # Check for duplicate display name
    existing = session.exec(
        select(BorderPost).where(BorderPost.display_name == border_post_in.display_name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Border post with this display name already exists")

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
    if not _has_permission(current_user, "settings:border-posts"):
        raise HTTPException(status_code=403, detail="Only admin or manager can manage border posts")

    border_post = session.get(BorderPost, id)
    if not border_post:
        raise HTTPException(status_code=404, detail="Border post not found")

    update_data = border_post_in.model_dump(exclude_unset=True)
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
    if not _has_permission(current_user, "settings:border-posts"):
        raise HTTPException(status_code=403, detail="Only admin can delete border posts")

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
