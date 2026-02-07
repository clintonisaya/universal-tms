"""
Exchange Rate Management - Story 2.14: Multi-Currency Support
CRUD endpoints for managing monthly USD→TZS exchange rates.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select, func, and_

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    ExchangeRate,
    ExchangeRateCreate,
    ExchangeRatePublic,
    ExchangeRatesPublic,
    ExchangeRateUpdate,
    Message,
    UserRole,
)

router = APIRouter(prefix="/finance/exchange-rates", tags=["finance"])


def require_finance_role(user: Any) -> None:
    """Only Finance and Admin can manage exchange rates."""
    if user.role not in [UserRole.finance, UserRole.admin]:
        raise HTTPException(
            status_code=403,
            detail="Only Finance or Admin roles can manage exchange rates",
        )


@router.get("/", response_model=ExchangeRatesPublic)
def read_exchange_rates(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Retrieve all exchange rates, ordered by year desc, month desc."""
    count_query = select(func.count()).select_from(ExchangeRate)
    count = session.exec(count_query).one()

    query = (
        select(ExchangeRate)
        .order_by(ExchangeRate.year.desc(), ExchangeRate.month.desc())
        .offset(skip)
        .limit(limit)
    )
    rates = session.exec(query).all()
    return ExchangeRatesPublic(data=rates, count=count)


@router.get("/current", response_model=ExchangeRatePublic | None)
def get_current_rate(
    session: SessionDep,
    current_user: CurrentUser,
    month: int = Query(description="Month (1-12)"),
    year: int = Query(description="Year"),
) -> Any:
    """Get the exchange rate for a specific month/year. Falls back to previous month if not set."""
    # Try exact match
    rate = session.exec(
        select(ExchangeRate).where(
            and_(ExchangeRate.month == month, ExchangeRate.year == year)
        )
    ).first()

    if rate:
        return rate

    # Fallback: get most recent rate before the requested month
    fallback = session.exec(
        select(ExchangeRate)
        .where(
            (ExchangeRate.year < year)
            | (and_(ExchangeRate.year == year, ExchangeRate.month < month))
        )
        .order_by(ExchangeRate.year.desc(), ExchangeRate.month.desc())
        .limit(1)
    ).first()

    if fallback:
        return fallback

    return None


@router.post("/", response_model=ExchangeRatePublic)
def create_exchange_rate(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    rate_in: ExchangeRateCreate,
) -> Any:
    """Create a new exchange rate for a month/year. Only one per month/year allowed."""
    require_finance_role(current_user)

    # Check uniqueness
    existing = session.exec(
        select(ExchangeRate).where(
            and_(
                ExchangeRate.month == rate_in.month,
                ExchangeRate.year == rate_in.year,
            )
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Exchange rate already exists for {rate_in.month}/{rate_in.year}. Use PUT to update.",
        )

    rate = ExchangeRate(**rate_in.model_dump())
    session.add(rate)
    session.commit()
    session.refresh(rate)
    return rate


@router.put("/{id}", response_model=ExchangeRatePublic)
def update_exchange_rate(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    rate_in: ExchangeRateUpdate,
) -> Any:
    """Update an existing exchange rate."""
    require_finance_role(current_user)

    rate = session.get(ExchangeRate, id)
    if not rate:
        raise HTTPException(status_code=404, detail="Exchange rate not found")

    rate.rate = rate_in.rate
    session.add(rate)
    session.commit()
    session.refresh(rate)
    return rate


@router.delete("/{id}")
def delete_exchange_rate(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Message:
    """Delete an exchange rate."""
    require_finance_role(current_user)

    rate = session.get(ExchangeRate, id)
    if not rate:
        raise HTTPException(status_code=404, detail="Exchange rate not found")

    session.delete(rate)
    session.commit()
    return Message(message="Exchange rate deleted successfully")
