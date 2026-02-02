from typing import Any
from fastapi import APIRouter
from sqlmodel import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.models import Trip, Waybill, Truck, Driver, Trailer

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/waybill-tracking")
def get_waybill_tracking_report(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """
    Get comprehensive waybill tracking report (WakaWaka Style).
    Joins Waybill -> Trip -> Truck -> Driver -> Trailer for a high-density flat view.
    """
    # Optimized query with eager loading
    statement = (
        select(Waybill, Trip, Truck, Driver, Trailer)
        .outerjoin(Trip, Waybill.id == Trip.waybill_id)
        .outerjoin(Truck, Trip.truck_id == Truck.id)
        .outerjoin(Driver, Trip.driver_id == Driver.id)
        .outerjoin(Trailer, Trip.trailer_id == Trailer.id)
        .order_by(Waybill.created_at.desc())
    )
    
    results = session.exec(statement).all()
    
    report_data = []
    for waybill, trip, truck, driver, trailer in results:
        # Mock calculations for Mileage/Fuel/Risk until real IoT/GPS is integrated
        mileage = 0
        fuel_consumption = 0
        risk_level = "Low"
        
        if trip and trip.status == "In Transit":
            mileage = 150 # Mock value
            fuel_consumption = 45.5 # Mock value
            risk_level = "Medium" # Mock value

        row = {
            # 1. Status Plls
            "waybill_status": waybill.status,
            "trip_status": trip.status if trip else "Not Dispatched",
            
            # 2. IDs
            "waybill_id": str(waybill.id),
            "waybill_number": waybill.waybill_number,
            "trip_id": str(trip.id) if trip else None,
            "trip_number": trip.trip_number if trip else None,
            
            # 3. Entity Info
            "client_name": waybill.client_name,
            "cargo_type": waybill.cargo_type,
            "cargo_weight": waybill.weight_kg,
            "cargo_description": waybill.description,
            
            # 4. Route Info
            "origin": waybill.origin,
            "destination": waybill.destination,
            "current_location": trip.current_location if trip else None,
            "border_location": "Kasumbalesa" if trip and trip.status == "At Border" else None, # Mock logic
            
            # 5. Asset Info
            "truck_plate": truck.plate_number if truck else None,
            "driver_name": driver.full_name if driver else None,
            "trailer_plate": trailer.plate_number if trailer else None,
            
            # 6. Metrics (Calculated/Mocked)
            "mileage_km": mileage,
            "fuel_consumption_liters": fuel_consumption,
            
            # 7. Risk
            "risk_level": risk_level,
            
            # Meta
            "start_date": trip.start_date if trip else None,
        }
        report_data.append(row)
        
    return report_data
