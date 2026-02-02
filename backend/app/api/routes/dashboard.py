"""
Dashboard Stats API - Aggregated metrics for the dashboard.
Provides role-aware statistics for KPI cards, charts, and recent activity.
"""
from typing import Any

from fastapi import APIRouter
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Driver,
    DriverStatus,
    ExpenseRequest,
    ExpenseStatus,
    Trip,
    TripStatus,
    Truck,
    TruckStatus,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    session: SessionDep,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """
    Return aggregated dashboard statistics.
    All authenticated users can call this endpoint;
    role-based filtering is handled on the frontend.
    """
    # --- Trucks ---
    total_trucks = session.exec(
        select(func.count()).select_from(Truck)
    ).one()

    truck_status_rows = session.exec(
        select(Truck.status, func.count())
        .group_by(Truck.status)
    ).all()
    trucks_by_status: dict[str, int] = {
        str(status): count for status, count in truck_status_rows
    }

    trucks_in_transit = trucks_by_status.get(TruckStatus.in_transit.value, 0)
    trucks_idle = trucks_by_status.get(TruckStatus.idle.value, 0)
    trucks_maintenance = trucks_by_status.get(TruckStatus.maintenance.value, 0)
    trucks_at_border = trucks_by_status.get(TruckStatus.at_border.value, 0)

    # --- Trips ---
    total_trips = session.exec(
        select(func.count()).select_from(Trip)
    ).one()

    trip_status_rows = session.exec(
        select(Trip.status, func.count())
        .group_by(Trip.status)
    ).all()
    trips_by_status: dict[str, int] = {
        str(status): count for status, count in trip_status_rows
    }

    completed_trips = trips_by_status.get(TripStatus.completed.value, 0)
    in_transit_trips = trips_by_status.get(TripStatus.in_transit.value, 0)

    # --- Drivers ---
    total_drivers = session.exec(
        select(func.count()).select_from(Driver)
    ).one()

    active_drivers = session.exec(
        select(func.count()).select_from(Driver)
        .where(Driver.status != DriverStatus.inactive)
    ).one()

    # --- Expenses / Approvals ---
    pending_manager = session.exec(
        select(func.count()).select_from(ExpenseRequest)
        .where(ExpenseRequest.status == ExpenseStatus.pending_manager)
    ).one()

    pending_finance = session.exec(
        select(func.count()).select_from(ExpenseRequest)
        .where(ExpenseRequest.status == ExpenseStatus.pending_finance)
    ).one()

    total_pending = pending_manager + pending_finance

    total_paid_amount = session.exec(
        select(func.coalesce(func.sum(ExpenseRequest.amount), 0))
        .where(ExpenseRequest.status == ExpenseStatus.paid)
    ).one()

    return {
        "total_trucks": total_trucks,
        "trucks_in_transit": trucks_in_transit,
        "trucks_idle": trucks_idle,
        "trucks_maintenance": trucks_maintenance,
        "trucks_at_border": trucks_at_border,
        "trucks_by_status": trucks_by_status,
        "total_trips": total_trips,
        "completed_trips": completed_trips,
        "in_transit_trips": in_transit_trips,
        "trips_by_status": trips_by_status,
        "total_drivers": total_drivers,
        "active_drivers": active_drivers,
        "pending_approvals": total_pending,
        "pending_manager": pending_manager,
        "pending_finance": pending_finance,
        "total_paid_amount": float(total_paid_amount),
    }
