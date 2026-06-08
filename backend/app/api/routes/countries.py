import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
from app.models import Country, CountryCreate, CountryPublic, CountriesPublic, CountryUpdate, Message
from app.modules.master_data import DuplicateNameError, check_duplicate_name, filtered_list_query

router = APIRouter(prefix="/countries", tags=["countries"])

@router.get("", response_model=CountriesPublic)
def read_countries(
    session: SessionDep, current_user: CurrentUser, skip: int = Query(default=0, ge=0), limit: int = Query(default=100, ge=1, le=500)
) -> Any:
    """
    Retrieve countries.
    """
    return filtered_list_query(session, Country, skip=skip, limit=limit)

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
    try:
        check_duplicate_name(session, Country, country_in.name)
    except DuplicateNameError as e:
        raise HTTPException(status_code=400, detail=str(e))
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
        try:
            check_duplicate_name(session, Country, country_in.name, exclude_id=id)
        except DuplicateNameError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    update_data = country_in.model_dump(exclude_unset=True)
    country.sqlmodel_update(update_data)
    session.add(country)
    commit_or_rollback(session)
    session.refresh(country)
    return country

@router.delete("/{id}", status_code=204)
def delete_country(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> None:
    """
    Delete a country.
    """
    country = session.get(Country, id)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    session.delete(country)
    commit_or_rollback(session)
