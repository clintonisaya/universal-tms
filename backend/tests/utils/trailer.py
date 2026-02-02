"""
Utility functions for trailer tests.
"""
import random
import string

from sqlmodel import Session

from app.models import Trailer, TrailerCreate, TrailerStatus, TrailerType


def random_plate_number() -> str:
    """Generate a random plate number (formatted with space before suffix)."""
    letters = "".join(random.choices(string.ascii_uppercase, k=2))
    numbers = "".join(random.choices(string.digits, k=4))
    # Return formatted plate
    return f"{letters} {numbers}"


def create_random_trailer(db: Session) -> Trailer:
    """Create a random trailer in the database."""
    trailer_in = TrailerCreate(
        plate_number=random_plate_number(),
        type=TrailerType.flatbed,
        make="Hambure",
        status=TrailerStatus.idle,
    )
    trailer = Trailer.model_validate(trailer_in)
    db.add(trailer)
    db.commit()
    db.refresh(trailer)
    return trailer
