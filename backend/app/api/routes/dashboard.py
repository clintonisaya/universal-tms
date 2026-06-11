"""Dashboard Stats API — thin HTTP adapter.

Aggregated metrics for the dashboard KPI cards, charts, and recent activity.
All calculation logic lives in app.modules.reporting.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.cache import dashboard_cache
from app.core.config import settings
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
from app.modules.reporting import (
    ACTIVE_TRIP_STATUSES,
    APPROVED_EXPENSE_STATUSES,
    CLOSED_TRIP_STATUSES,
    FINISHED_TRIP_STATUSES,
    bucket_status_counts,
    merge_profit_trend,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

CACHE_PREFIX = "dashboard:"


def _build_stats(session: SessionDep) -> dict[str, Any]:
    """Heavy aggregate queries – called only on cache miss."""

    # --- Trucks ---
    total_trucks = session.exec(select(func.count()).select_from(Truck)).one()

    truck_status_rows = session.exec(
        select(Truck.status, func.count()).group_by(Truck.status)
    ).all()
    trucks_by_status = bucket_status_counts(truck_status_rows)

    # --- Trucks with waybills not yet offloaded (true "in transit" count) ---
    trucks_with_waybill = session.exec(
        select(func.count(func.distinct(Trip.truck_id)))
        .where(Trip.waybill_id.isnot(None))
        .where(Trip.status.notin_(FINISHED_TRIP_STATUSES))
    ).one()

    trucks_in_transit = trucks_with_waybill
    trucks_idle = trucks_by_status.get(TruckStatus.idle.value, 0)
    trucks_maintenance = trucks_by_status.get(TruckStatus.maintenance.value, 0)
    trucks_at_border = trucks_by_status.get(TruckStatus.at_border.value, 0)

    # --- Trips ---
    total_trips = session.exec(select(func.count()).select_from(Trip)).one()

    trip_status_rows = session.exec(
        select(Trip.status, func.count()).group_by(Trip.status)
    ).all()
    trips_by_status = bucket_status_counts(trip_status_rows)

    completed_trips = trips_by_status.get(TripStatus.completed.value, 0)
    in_transit_trips = trips_by_status.get(TripStatus.in_transit.value, 0)

    # --- Drivers ---
    total_drivers = session.exec(select(func.count()).select_from(Driver)).one()
    active_drivers = session.exec(
        select(func.count()).select_from(Driver).where(Driver.status == DriverStatus.active)
    ).one()

    # --- Expenses / Approvals ---
    pending_manager_query = (
        select(func.count())
        .select_from(ExpenseRequest)
        .outerjoin(Trip, ExpenseRequest.trip_id == Trip.id)
        .where(ExpenseRequest.status == ExpenseStatus.pending_manager)
        .where(
            (ExpenseRequest.trip_id.is_(None)) | (Trip.status.notin_(CLOSED_TRIP_STATUSES))
        )
    )
    pending_manager = session.exec(pending_manager_query).one()

    pending_finance_query = (
        select(func.count())
        .select_from(ExpenseRequest)
        .outerjoin(Trip, ExpenseRequest.trip_id == Trip.id)
        .where(ExpenseRequest.status == ExpenseStatus.pending_finance)
        .where(
            (ExpenseRequest.trip_id.is_(None)) | (Trip.status.notin_(CLOSED_TRIP_STATUSES))
        )
    )
    pending_finance = session.exec(pending_finance_query).one()

    total_paid_amount = session.exec(
        select(func.coalesce(func.sum(ExpenseRequest.amount), 0))
        .where(ExpenseRequest.status.in_(APPROVED_EXPENSE_STATUSES))
    ).one()

    # --- Profit Trend (Last 30 Days) ---
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    _revenue_date = func.coalesce(Trip.dispatch_date, Trip.end_date, Trip.created_at)

    daily_wb_subq = (
        select(Trip.waybill_id, func.date(_revenue_date).label("date"))
        .where(Trip.waybill_id.isnot(None))
        .where(Trip.status.in_(ACTIVE_TRIP_STATUSES))
        .where(_revenue_date >= thirty_days_ago)
        .distinct()
    ).subquery()
    revenue_stmt = (
        select(daily_wb_subq.c.date, func.sum(Waybill.agreed_rate).label("revenue"))
        .join(daily_wb_subq, Waybill.id == daily_wb_subq.c.waybill_id)
        .group_by(daily_wb_subq.c.date)
    )
    revenue_rows = session.exec(revenue_stmt).all()

    expense_stmt = (
        select(
            func.date(func.coalesce(ExpenseRequest.approved_at, ExpenseRequest.payment_date, ExpenseRequest.created_at)).label("date"),
            func.sum(ExpenseRequest.amount).label("expense"),
        )
        .where(ExpenseRequest.status.in_(APPROVED_EXPENSE_STATUSES))
        .where(func.coalesce(ExpenseRequest.approved_at, ExpenseRequest.payment_date, ExpenseRequest.created_at) >= thirty_days_ago)
        .group_by(func.date(func.coalesce(ExpenseRequest.approved_at, ExpenseRequest.payment_date, ExpenseRequest.created_at)))
    )
    expense_rows = session.exec(expense_stmt).all()

    profit_trend = merge_profit_trend(revenue_rows, expense_rows)

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
        "pending_approvals": pending_manager,
        "pending_manager": pending_manager,
        "pending_finance": pending_finance,
        "total_paid_amount": float(total_paid_amount),
        "profit_trend": profit_trend,
    }


@router.get("/stats")
def get_dashboard_stats(
    session: SessionDep,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """Return aggregated dashboard statistics.

    All authenticated users can call this endpoint;
    role-based filtering is handled on the frontend.
    Results are cached for DASHBOARD_CACHE_TTL seconds.
    """
    ttl = settings.DASHBOARD_CACHE_TTL
    if ttl <= 0:
        return _build_stats(session)

    return dashboard_cache.get_or_set(
        f"{CACHE_PREFIX}stats",
        lambda: _build_stats(session),
        ttl=ttl,
    )


def invalidate_dashboard_cache() -> None:
    """Call this after creating/updating a Trip or Expense."""
    dashboard_cache.invalidate_prefix(CACHE_PREFIX)
