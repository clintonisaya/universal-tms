"""
Utility functions for waybill tests.
"""
import random
import string
from datetime import datetime, timezone
from decimal import Decimal

from sqlmodel import Session

from app.models import Waybill


def random_waybill_number() -> str:
    seq = random.randint(1000, 9999)
    return f"WB-{datetime.now(timezone.utc).year}-{seq}"


def create_random_waybill(db: Session) -> Waybill:
    """Create a random waybill for testing."""
    suffix = "".join(random.choices(string.ascii_lowercase, k=6))
    waybill = Waybill(
        waybill_number=random_waybill_number(),
        client_name=f"Client_{suffix}",
        description=f"Test cargo shipment {suffix}",
        cargo_type="Loose Cargo",
        weight_kg=round(random.uniform(100.0, 50000.0), 2),
        origin="Dar es Salaam",
        destination="Lusaka",
        expected_loading_date=datetime.now(timezone.utc),
        agreed_rate=Decimal("1500.00"),
        currency="USD",
    )
    db.add(waybill)
    db.commit()
    db.refresh(waybill)
    return waybill
