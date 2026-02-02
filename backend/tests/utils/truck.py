"""
Utility functions for truck tests.
"""
import random
import string

from sqlmodel import Session

from app.models import Truck, TruckCreate, TruckStatus


def random_plate_number() -> str:
    """Generate a random plate number (formatted with space before suffix)."""
    letters = "".join(random.choices(string.ascii_uppercase, k=3))
    numbers = "".join(random.choices(string.digits, k=3))
    suffix = random.choice(string.ascii_uppercase)
    # Return with space before trailing letter (formatted)
    return f"{letters}{numbers} {suffix}"


def create_random_truck(db: Session) -> Truck:
    """Create a random truck in the database with normalized plate."""
    truck_in = TruckCreate(
        plate_number=random_plate_number(),
        make="Mercedes",
        model="Actros",
        status=TruckStatus.idle,
    )
    truck = Truck.model_validate(truck_in)
    db.add(truck)
    db.commit()
    db.refresh(truck)
    return truck
