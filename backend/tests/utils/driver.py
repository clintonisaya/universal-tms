"""
Utility functions for driver tests.
"""
import random
import string

from sqlmodel import Session

from app.models import Driver, DriverCreate, DriverStatus


def random_license_number() -> str:
    """Generate a random license number."""
    prefix = "DL"
    numbers = "".join(random.choices(string.digits, k=6))
    return f"{prefix}-{numbers}"


def random_phone_number() -> str:
    """Generate a random Kenyan phone number."""
    return f"+2547{''.join(random.choices(string.digits, k=8))}"


def create_random_driver(db: Session) -> Driver:
    """Create a random driver in the database."""
    driver_in = DriverCreate(
        full_name=f"Driver {''.join(random.choices(string.ascii_uppercase, k=5))}",
        license_number=random_license_number(),
        phone_number=random_phone_number(),
        status=DriverStatus.active,
    )
    driver = Driver.model_validate(driver_in)
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver
