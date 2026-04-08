import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
from app.models import Country, CountryCreate, CountryPublic, CountriesPublic, CountryUpdate, Message

router = APIRouter(prefix="/countries", tags=["countries"])

@router.get("", response_model=CountriesPublic)
def read_countries(
    session: SessionDep, current_user: CurrentUser, skip: int = Query(default=0, ge=0), limit: int = Query(default=100, ge=1, le=500)
) -> Any:
    """
    Retrieve countries.
    """
    count_statement = select(func.count()).select_from(Country)
    count = session.exec(count_statement).one()
    statement = select(Country).offset(skip).limit(limit)
    countries = session.exec(statement).all()
    return CountriesPublic(data=countries, count=count)

@router.get("/{id}", response_model=CountryPublic)
def read_country(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get country by ID.
    """
    country = session.get(Country, id)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    return country

@router.post("", response_model=CountryPublic)
def create_country(
    *, session: SessionDep, current_user: CurrentUser, country_in: CountryCreate
) -> Any:
    """
    Create new country.
    """
    country = session.exec(select(Country).where(Country.name == country_in.name)).first()
    if country:
        raise HTTPException(status_code=400, detail="Country with this name already exists")
    country = Country.model_validate(country_in)
    session.add(country)
    commit_or_rollback(session)
    session.refresh(country)
    return country

@router.patch("/{id}", response_model=CountryPublic)
def update_country(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, country_in: CountryUpdate
) -> Any:
    """
    Update a country.
    """
    country = session.get(Country, id)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    if country_in.name:
         existing_country = session.exec(select(Country).where(Country.name == country_in.name)).first()
         if existing_country and existing_country.id != id:
            raise HTTPException(status_code=400, detail="Country with this name already exists")
    
    update_data = country_in.model_dump(exclude_unset=True)
    country.sqlmodel_update(update_data)
    session.add(country)
    commit_or_rollback(session)
    session.refresh(country)
    return country

@router.delete("/{id}")
def delete_country(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete a country.
    """
    country = session.get(Country, id)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    session.delete(country)
    commit_or_rollback(session)
    return Message(message="Country deleted successfully")
