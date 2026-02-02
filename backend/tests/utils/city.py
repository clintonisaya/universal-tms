from sqlmodel import Session
from app.models import City, CityCreate
from tests.utils.utils import random_lower_string
from tests.utils.country import create_random_country

def create_random_city(db: Session) -> City:
    country = create_random_country(db)
    name = random_lower_string()
    item_in = CityCreate(name=name, country_id=country.id)
    item = City.model_validate(item_in)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
