import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import City, CityCreate, CityPublic, CitiesPublic, CityUpdate, Message, Country

router = APIRouter(prefix="/cities", tags=["cities"])

@router.get("", response_model=CitiesPublic)
def read_cities(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve cities.
    """
    count_statement = select(func.count()).select_from(City)
    count = session.exec(count_statement).one()
    statement = select(City).offset(skip).limit(limit)
    cities = session.exec(statement).all()
    return CitiesPublic(data=cities, count=count)

@router.get("/{id}", response_model=CityPublic)
def read_city(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get city by ID.
    """
    city = session.get(City, id)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    return city

@router.post("", response_model=CityPublic)
def create_city(
    *, session: SessionDep, current_user: CurrentUser, city_in: CityCreate
) -> Any:
    """
    Create new city.
    """
    # Verify country exists
    country = session.get(Country, city_in.country_id)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
        
    city = City.model_validate(city_in)
    session.add(city)
    session.commit()
    session.refresh(city)
    return city

@router.patch("/{id}", response_model=CityPublic)
def update_city(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, city_in: CityUpdate
) -> Any:
    """
    Update a city.
    """
    city = session.get(City, id)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    
    if city_in.country_id:
        country = session.get(Country, city_in.country_id)
        if not country:
            raise HTTPException(status_code=404, detail="Country not found")

    update_data = city_in.model_dump(exclude_unset=True)
    city.sqlmodel_update(update_data)
    session.add(city)
    session.commit()
    session.refresh(city)
    return city

@router.delete("/{id}")
def delete_city(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete a city.
    """
    city = session.get(City, id)
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    session.delete(city)
    session.commit()
    return Message(message="City deleted successfully")
