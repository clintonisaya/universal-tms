"""
Utility functions for cargo type tests.
"""
import random
import string

from sqlmodel import Session

from app.models import CargoType, CargoTypeCreate


def random_cargo_type_name() -> str:
    """Generate a random cargo type name."""
    return "Cargo_" + "".join(random.choices(string.ascii_lowercase, k=6))


def create_random_cargo_type(db: Session) -> CargoType:
    """Create a random cargo type in the database."""
    cargo_type_in = CargoTypeCreate(
        name=random_cargo_type_name(),
        description="Test cargo type",
    )
    cargo_type = CargoType.model_validate(cargo_type_in)
    db.add(cargo_type)
    db.commit()
    db.refresh(cargo_type)
    return cargo_type
