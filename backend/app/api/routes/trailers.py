"""
Trailer Registry Management - Story 1.6
CRUD endpoints for trailer management.
"""
import re
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
from app.models import (
    Message,
    Trailer,
    TrailerCreate,
    TrailerPublic,
    TrailersPublic,
    TrailerUpdate,
)

router = APIRouter(prefix="/trailers", tags=["trailers"])


def normalize_for_comparison(plate: str) -> str:
    """
    Normalize plate number for duplicate comparison.
    Removes all spaces and converts to uppercase.
    """
    return re.sub(r"\s+", "", plate.upper().strip())


def format_plate_number(plate: str) -> str:
    """
    Format plate number for display with space before trailing letters.
    Examples:
        "ZD4040" -> "ZD 4040"
        "T512EVG" -> "T512 EVG"
    """
    # First normalize: remove spaces, uppercase
    cleaned = re.sub(r"\s+", "", plate.upper().strip())

    # Format: add space before trailing letters (after numbers)
    # Pattern: everything up to and including last digit, then letters
    match = re.match(r"^(.+\d)([A-Z]+)$", cleaned)
    if match:
        prefix, suffix = match.groups()
        return f"{prefix} {suffix}"

    # No trailing letters, return as-is
    return cleaned


@router.get("", response_model=TrailersPublic)
def read_trailers(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> Any:
    """
    Retrieve all trailers.
    """
    count_statement = select(func.count()).select_from(Trailer)
    count = session.exec(count_statement).one()
    statement = (
        select(Trailer).order_by(Trailer.created_at.desc()).offset(skip).limit(limit)
    )
    trailers = session.exec(statement).all()
    return TrailersPublic(data=trailers, count=count)


@router.get("/{id}", response_model=TrailerPublic)
def read_trailer(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """
    Get trailer by ID.
    """
    trailer = session.get(Trailer, id)
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")
    return trailer


@router.post("", response_model=TrailerPublic)
def create_trailer(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    trailer_in: TrailerCreate,
) -> Any:
    """
    Create new trailer.
    Prevents duplicates by checking plate_number uniqueness.
    Formats plate number for consistent display.
    """
    # Format plate for storage/display
    formatted_plate = format_plate_number(trailer_in.plate_number)
    # Normalize for comparison
    normalized_plate = normalize_for_comparison(trailer_in.plate_number)

    # Check for duplicate - compare normalized versions (DB-filtered query)
    normalized_col = func.upper(func.replace(Trailer.plate_number, ' ', ''))
    existing_trailer = session.exec(
        select(Trailer).where(normalized_col == normalized_plate)
    ).first()
    if existing_trailer:
        raise HTTPException(
            status_code=400,
            detail="Trailer with this plate already exists",
        )

    # Create trailer with formatted plate number
    trailer_data = trailer_in.model_dump()
    trailer_data["plate_number"] = formatted_plate
    trailer = Trailer.model_validate(trailer_data)
    session.add(trailer)
    commit_or_rollback(session)
    session.refresh(trailer)
    return trailer


@router.patch("/{id}", response_model=TrailerPublic)
def update_trailer(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    trailer_in: TrailerUpdate,
) -> Any:
    """
    Update a trailer.
    Formats plate number if provided.
    """
    trailer = session.get(Trailer, id)
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")

    update_dict = trailer_in.model_dump(exclude_unset=True)

    # If updating plate_number, format and check for duplicates
    if "plate_number" in update_dict:
        formatted_plate = format_plate_number(update_dict["plate_number"])
        normalized_new = normalize_for_comparison(update_dict["plate_number"])
        normalized_current = normalize_for_comparison(trailer.plate_number)

        # Only check duplicates if the plate is actually changing
        if normalized_new != normalized_current:
            normalized_col = func.upper(func.replace(Trailer.plate_number, ' ', ''))
            existing_trailer = session.exec(
                select(Trailer).where(
                    normalized_col == normalized_new,
                    Trailer.id != trailer.id,
                )
            ).first()
            if existing_trailer:
                raise HTTPException(
                    status_code=400,
                    detail="Trailer with this plate already exists",
                )
        update_dict["plate_number"] = formatted_plate

    trailer.sqlmodel_update(update_dict)
    session.add(trailer)
    commit_or_rollback(session)
    session.refresh(trailer)
    return trailer


@router.delete("/{id}")
def delete_trailer(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Message:
    """
    Delete a trailer.
    """
    trailer = session.get(Trailer, id)
    if not trailer:
        raise HTTPException(status_code=404, detail="Trailer not found")
    session.delete(trailer)
    commit_or_rollback(session)
    return Message(message="Trailer deleted successfully")
