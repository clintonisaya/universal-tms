import logging
from datetime import datetime

from sqlalchemy import text
from sqlmodel import Session, select

from app.models import Trip

logger = logging.getLogger(__name__)


def generate_trip_number(
    session: Session,
    plate_number: str,
    *,
    now: datetime | None = None,
) -> str:
    """Generate a unique Trip number scoped to truck and year."""
    sanitized_plate = plate_number.replace(" ", "").upper()
    year = (now or datetime.now()).year

    session.execute(text("SELECT pg_advisory_xact_lock(1001)"))

    pattern = f"{sanitized_plate}-{year}%"
    statement = (
        select(Trip.trip_number)
        .where(Trip.trip_number.like(pattern))
        .order_by(Trip.trip_number.desc())
        .limit(1)
    )
    last_trip_number = session.exec(statement).first()

    sequence = 1
    if last_trip_number:
        try:
            sequence = int(last_trip_number[-3:]) + 1
        except ValueError:
            logger.error("Failed to parse last trip number: %s", last_trip_number)

    return f"{sanitized_plate}-{year}{sequence:03d}"
