"""
Utility functions for vehicle status tests.
"""
import random
import string

from sqlmodel import Session

from app.models import VehicleStatus, VehicleStatusCreate


def random_vehicle_status_name() -> str:
    """Generate a random vehicle status name."""
    return "Status_" + "".join(random.choices(string.ascii_lowercase, k=6))


def create_random_vehicle_status(db: Session) -> VehicleStatus:
    """Create a random vehicle status in the database."""
    status_in = VehicleStatusCreate(
        name=random_vehicle_status_name(),
        description="Test vehicle status",
        is_active=True,
    )
    status = VehicleStatus.model_validate(status_in)
    db.add(status)
    db.commit()
    db.refresh(status)
    return status
