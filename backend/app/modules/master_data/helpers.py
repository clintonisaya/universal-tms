"""Master Data Catalog helpers.

Owns shared CRUD mechanics for simple reference-list route modules:
duplicate-name validation, filtered list queries with pagination,
and common error types.  Route adapters call these functions instead
of repeating the same query patterns in every catalog route.
"""

from __future__ import annotations

from typing import Any, TypeVar
from uuid import UUID

from fastapi import HTTPException
from sqlmodel import SQLModel, Session, col, func, select


# ---------------------------------------------------------------------------
# Error types
# ---------------------------------------------------------------------------


class MasterDataError(ValueError):
    """Base error for master data violations."""
    detail: str

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class DuplicateNameError(MasterDataError):
    """Raised when a create/update would produce a duplicate name."""


class NotFoundError(MasterDataError):
    """Raised when the requested entity does not exist."""


# ---------------------------------------------------------------------------
# Type variable for SQLModel table classes
# ---------------------------------------------------------------------------

T = TypeVar("T", bound=SQLModel)


# ---------------------------------------------------------------------------
# Duplicate name checking
# ---------------------------------------------------------------------------


def check_duplicate_name(
    session: Session,
    model: type[T],
    name: str,
    name_field: str = "name",
    exclude_id: UUID | None = None,
) -> None:
    """Check for case-insensitive duplicate name in a catalog table.

    Args:
        session: Active database session.
        model: The SQLModel table class (e.g. CargoType, VehicleStatus).
        name: The proposed name value.
        name_field: The column to check (default ``"name"``).
        exclude_id: When updating, the ID of the record being updated
            so it is not matched against itself.

    Raises:
        DuplicateNameError: If another record with the same
            (case-insensitive) name already exists.
    """
    field = getattr(model, name_field)
    existing = session.exec(
        select(model).where(col(field).ilike(name))
    ).first()
    if existing is not None and getattr(existing, "id", None) != exclude_id:
        raise DuplicateNameError(
            f"{model.__name__} with this name already exists"
        )


# ---------------------------------------------------------------------------
# Filtered list query
# ---------------------------------------------------------------------------


def filtered_list_query(
    session: Session,
    model: type[T],
    *,
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    category: str | None = None,
    category_field: str = "category",
    active_field: str = "is_active",
    order_fields: tuple[str, ...] = ("name",),
) -> dict[str, Any]:
    """Execute a filtered, paginated list query for a catalog table.

    Builds and executes a SELECT with optional ``is_active`` and
    ``category`` filters, offset/limit pagination, and configurable
    ordering.

    Args:
        session: Active database session.
        model: The SQLModel table class.
        skip: Number of rows to skip (offset).
        limit: Maximum rows to return.
        active_only: When *True*, filter to rows where ``is_active``
            is ``True``.  Ignored when the model has no ``is_active``
            column.
        category: Optional category value to filter on.  Ignored when
            *None* or when the model has no ``category`` column.
        category_field: Column name for the category filter.
        active_field: Column name for the active filter.
        order_fields: Column names to order by (ascending).

    Returns:
        ``{"data": [...], "count": int}``
    """
    query = select(model)

    # Active-only filter
    if active_only and hasattr(model, active_field):
        query = query.where(getattr(model, active_field) == True)  # noqa: E712

    # Category filter
    if category is not None and hasattr(model, category_field):
        query = query.where(getattr(model, category_field) == category)

    # Count
    count = session.exec(
        select(func.count()).select_from(query.subquery())
    ).one()

    # Order
    order_cols = [getattr(model, f) for f in order_fields]
    query = query.order_by(*order_cols)

    # Pagination
    query = query.offset(skip).limit(limit)
    rows = list(session.exec(query).all())

    return {"data": rows, "count": count}
