"""
Dashboard Stats API - Aggregated metrics for the dashboard.
Provides role-aware statistics for KPI cards, charts, and recent activity.
"""
from datetime import datetime, timedelta, timezone
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
    Waybill,
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
        status.value if hasattr(status, "value") else str(status): count 
        for status, count in truck_status_rows
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
        status.value if hasattr(status, "value") else str(status): count 
        for status, count in trip_status_rows
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
    # Exclude expenses linked to closed trips (Completed/Cancelled)
    closed_trip_statuses = [TripStatus.completed.value, TripStatus.cancelled.value]

    # Pending Manager: exclude expenses for closed trips
    pending_manager_query = (
        select(func.count())
        .select_from(ExpenseRequest)
        .outerjoin(Trip, ExpenseRequest.trip_id == Trip.id)
        .where(ExpenseRequest.status == ExpenseStatus.pending_manager)
        .where(
            # Include if no trip OR trip is not closed
            (ExpenseRequest.trip_id.is_(None)) | (Trip.status.notin_(closed_trip_statuses))
        )
    )
    pending_manager = session.exec(pending_manager_query).one()

    # Pending Finance: exclude expenses for closed trips
    pending_finance_query = (
        select(func.count())
        .select_from(ExpenseRequest)
        .outerjoin(Trip, ExpenseRequest.trip_id == Trip.id)
        .where(ExpenseRequest.status == ExpenseStatus.pending_finance)
        .where(
            # Include if no trip OR trip is not closed
            (ExpenseRequest.trip_id.is_(None)) | (Trip.status.notin_(closed_trip_statuses))
        )
    )
    pending_finance = session.exec(pending_finance_query).one()

    total_pending = pending_manager + pending_finance

    total_paid_amount = session.exec(
        select(func.coalesce(func.sum(ExpenseRequest.amount), 0))
        .where(ExpenseRequest.status == ExpenseStatus.paid)
    ).one()

    # --- Profit Trend (Last 30 Days) ---
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    # 1. Daily Revenue (from Waybills linked to completed trips)
    revenue_stmt = (
        select(
            func.date(Trip.end_date).label("date"),
            func.sum(Waybill.agreed_rate).label("revenue")
        )
        .join(Waybill, Waybill.id == Trip.waybill_id)
        .where(Trip.status == TripStatus.completed)
        .where(Trip.end_date >= thirty_days_ago)
        .group_by(func.date(Trip.end_date))
    )
    revenue_rows = session.exec(revenue_stmt).all()
    
    # 2. Daily Expenses (Paid)
    expense_stmt = (
        select(
            func.date(ExpenseRequest.payment_date).label("date"),
            func.sum(ExpenseRequest.amount).label("expense")
        )
        .where(ExpenseRequest.status == ExpenseStatus.paid)
        .where(ExpenseRequest.payment_date >= thirty_days_ago)
        .group_by(func.date(ExpenseRequest.payment_date))
    )
    expense_rows = session.exec(expense_stmt).all()
    
    # Merge into trend data
    trend_map = {}
    for r in revenue_rows:
        d_str = str(r.date)
        trend_map[d_str] = {"date": d_str, "profit": float(r.revenue)}
        
    for e in expense_rows:
        d_str = str(e.date)
        if d_str in trend_map:
            trend_map[d_str]["profit"] -= float(e.expense)
        else:
            trend_map[d_str] = {"date": d_str, "profit": -float(e.expense)}
            
    # Sort by date and convert to list
    profit_trend = sorted(trend_map.values(), key=lambda x: x["date"])

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
        "profit_trend": profit_trend,
    }
