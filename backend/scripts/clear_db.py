import logging
import sys
from pathlib import Path

# Add the backend directory to sys.path to allow imports from app
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from sqlmodel import Session, delete

from app.core.db import engine, init_db
from app.models import (
    CargoType,
    City,
    Country,
    Driver,
    ExpenseRequest,
    Item,
    MaintenanceEvent,
    Trailer,
    Trip,
    Truck,
    User,
    VehicleStatus,
    Waybill,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clear_data() -> None:
    logger.info("Clearing test database...")
    with Session(engine) as session:
        # Delete in order respecting foreign key constraints
        # Child tables first
        logger.info("Deleting MaintenanceEvent...")
        session.execute(delete(MaintenanceEvent))
        logger.info("Deleting ExpenseRequest...")
        session.execute(delete(ExpenseRequest))
        logger.info("Deleting Trip...")
        session.execute(delete(Trip))
        logger.info("Deleting Waybill...")
        session.execute(delete(Waybill))
        logger.info("Deleting Item...")
        session.execute(delete(Item))
        logger.info("Deleting Truck...")
        session.execute(delete(Truck))
        logger.info("Deleting Driver...")
        session.execute(delete(Driver))
        logger.info("Deleting Trailer...")
        session.execute(delete(Trailer))
        
        # Then master data
        logger.info("Deleting City...")
        session.execute(delete(City))
        logger.info("Deleting Country...")
        session.execute(delete(Country))
        logger.info("Deleting CargoType...")
        session.execute(delete(CargoType))
        logger.info("Deleting VehicleStatus...")
        session.execute(delete(VehicleStatus))
        
        # Finally Users (careful if there are other dependencies)
        # We might want to keep the superuser or just re-init DB afterwards
        logger.info("Deleting User...")
        session.execute(delete(User))
        
        session.commit()
    logger.info("Database cleared.")

def main() -> None:
    clear_data()
    # Optionally re-init basic data like superuser
    # logger.info("Re-initializing basic data...")
    # init()

if __name__ == "__main__":
    main()
