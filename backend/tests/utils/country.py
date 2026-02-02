import uuid
from sqlmodel import Session
from app.models import Country, CountryCreate
from tests.utils.utils import random_lower_string

def create_random_country(db: Session) -> Country:
    name = random_lower_string()
    code = random_lower_string()[:2].upper()
    item_in = CountryCreate(name=name, code=code)
    item = Country.model_validate(item_in)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
