"""Reports API — thin HTTP adapters for Reporting Read Models.

Query construction, pagination, and response serialization live here.
All calculation and projection logic lives in app.modules.reporting.
"""

import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Query
from sqlalchemy import or_
from sqlalchemy.orm import aliased
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    BorderPost,
    Driver,
    ExchangeRate,
    ExpenseRequest,
    Trailer,
    Trip,
    TripBorderCrossing,
    Truck,
    Waybill,
    WaybillStatus,
)
from app.modules.reporting import (
    ACTIVE_TRIP_STATUSES,
    APPROVED_EXPENSE_STATUSES,
    aggregate_expense_breakdown,
    aggregate_monthly_expenses,
    aggregate_monthly_revenue,
    aggregate_quarterly_expenses,
    aggregate_quarterly_revenue,
    build_monthly_stats,
    build_profitability_summary,
    build_quarterly_trend,
    normalize_to_tzs,
    project_profitability_row,
    project_trip_row,
    project_unlinked_waybill_row,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


# ---------------------------------------------------------------------------
# Shared helpers (DB-coupled — stay in the route adapter)
# ---------------------------------------------------------------------------

def get_current_exchange_rate(session: SessionDep) -> Decimal:
    """Get current month's exchange rate, fallback to most recent or default."""
    now = datetime.now(timezone.utc)

    rate = session.exec(
        select(ExchangeRate)
        .where(ExchangeRate.month == now.month)
        .where(ExchangeRate.year == now.year)
    ).first()
    if rate:
        return rate.rate

    rate = session.exec(
        select(ExchangeRate)
        .order_by(ExchangeRate.year.desc(), ExchangeRate.month.desc())
        .limit(1)
    ).first()
    if rate:
        return rate.rate

    logger.warning(
        "No exchange rate found for %s-%s. Using fallback rate of 2500.00",
        now.year, now.month,
    )
    return Decimal("2500.00")


# ---------------------------------------------------------------------------
# Waybill Tracking Report
# ---------------------------------------------------------------------------

@router.get("/waybill-tracking")
def get_waybill_tracking_report(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=50, ge=1, le=500, description="Max records to return"),
    search: str | None = Query(default=None, description="Search by truck plate or driver name"),
    status: str | None = Query(default=None, description="Filter by trip status"),
    export: bool = Query(default=False, description="If true, return all matching records (ignore skip/limit)"),
) -> Any:
    """Trip-centric tracking report — one row per trip combining go + return waybill data."""
    GoWaybill = aliased(Waybill, name="go_waybill")
    ReturnWaybill = aliased(Waybill, name="return_waybill")

    base_stmt = (
        select(Trip, GoWaybill, ReturnWaybill, Truck, Driver, Trailer)
        .outerjoin(GoWaybill, GoWaybill.id == Trip.waybill_id)
        .outerjoin(ReturnWaybill, ReturnWaybill.id == Trip.return_waybill_id)
        .outerjoin(Truck, Truck.id == Trip.truck_id)
        .outerjoin(Driver, Driver.id == Trip.driver_id)
        .outerjoin(Trailer, Trailer.id == Trip.trailer_id)
    )

    if search:
        search_term = f"%{search}%"
        base_stmt = base_stmt.where(
            or_(
                Truck.plate_number.ilike(search_term),
                Driver.full_name.ilike(search_term),
                GoWaybill.waybill_number.ilike(search_term),
                ReturnWaybill.waybill_number.ilike(search_term),
                Trip.trip_number.ilike(search_term),
                GoWaybill.client_name.ilike(search_term),
                ReturnWaybill.client_name.ilike(search_term),
                Trailer.plate_number.ilike(search_term),
            )
        )

    if status:
        base_stmt = base_stmt.where(Trip.status == status)

    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total_count = session.execute(count_stmt).scalar() or 0

    trips_stmt = base_stmt.order_by(Trip.created_at.desc())
    if not export:
        trips_stmt = trips_stmt.offset(skip).limit(limit)

    trip_results = session.execute(trips_stmt).all()

    # Collect linked waybill IDs for unlinked detection
    linked_ids: list = []
    for row in trip_results:
        trip = row[0]
        if trip.waybill_id:
            linked_ids.append(trip.waybill_id)
        if trip.return_waybill_id:
            linked_ids.append(trip.return_waybill_id)

    # Open waybills not yet dispatched (only when no filters active)
    unlinked_waybills = []
    if not search and not status:
        unlinked_stmt = select(Waybill).where(Waybill.status == WaybillStatus.open)
        if linked_ids:
            unlinked_stmt = unlinked_stmt.where(Waybill.id.notin_(linked_ids))
        unlinked_waybills = session.exec(unlinked_stmt).all()

    # Bulk-fetch border crossings (avoid N+1)
    from collections import defaultdict
    trip_ids = [str(row[0].id) for row in trip_results]
    crossings_by_trip: dict[str, list] = defaultdict(list)
    if trip_ids:
        crossings_stmt = (
            select(TripBorderCrossing, BorderPost)
            .join(BorderPost, BorderPost.id == TripBorderCrossing.border_post_id)
            .where(TripBorderCrossing.trip_id.in_(trip_ids))
            .order_by(TripBorderCrossing.trip_id, TripBorderCrossing.direction, TripBorderCrossing.created_at)
        )
        for crossing, bp in session.execute(crossings_stmt).all():
            crossings_by_trip[str(crossing.trip_id)].append({
                "border_post_id": str(crossing.border_post_id),
                "border_display_name": bp.display_name,
                "side_a_name": bp.side_a_name,
                "side_b_name": bp.side_b_name,
                "direction": crossing.direction,
                "arrived_side_a_at": crossing.arrived_side_a_at.isoformat() if crossing.arrived_side_a_at else None,
                "documents_submitted_side_a_at": crossing.documents_submitted_side_a_at.isoformat() if crossing.documents_submitted_side_a_at else None,
                "documents_cleared_side_a_at": crossing.documents_cleared_side_a_at.isoformat() if crossing.documents_cleared_side_a_at else None,
                "arrived_side_b_at": crossing.arrived_side_b_at.isoformat() if crossing.arrived_side_b_at else None,
                "departed_border_at": crossing.departed_border_at.isoformat() if crossing.departed_border_at else None,
            })

    # Project rows using the reporting module
    report_data = []
    for db_row in trip_results:
        trip, go_wb, return_wb, truck, driver, trailer = db_row
        report_data.append(
            project_trip_row(
                trip, go_wb, return_wb, truck, driver, trailer,
                crossings_by_trip.get(str(trip.id), []),
            )
        )

    for wb in unlinked_waybills:
        report_data.append(project_unlinked_waybill_row(wb))

    unlinked_count = len(unlinked_waybills) if not search and not status else 0
    return {"data": report_data, "count": total_count + unlinked_count}


# ---------------------------------------------------------------------------
# Financial Pulse
# ---------------------------------------------------------------------------

@router.get("/financial-pulse")
def get_financial_pulse(
    session: SessionDep,
    current_user: CurrentUser,
    month: str | None = Query(default=None, description="Month to view in YYYY-MM format (defaults to current month)"),
) -> dict[str, Any]:
    """Financial Pulse Dashboard Data.

    Returns quarterly_trend, monthly_stats, and expense_breakdown,
    all normalised to TZS.
    """
    now = datetime.now(timezone.utc)
    current_year = now.year
    year_start = datetime(current_year, 1, 1, tzinfo=timezone.utc)

    # Parse the month parameter or default to current month
    if month:
        try:
            selected = datetime.strptime(month, "%Y-%m")
            selected_month_start = selected.replace(day=1, hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
            selected_month_label = selected.strftime("%B %Y")
        except ValueError:
            selected_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            selected_month_label = now.strftime("%B %Y")
    else:
        selected_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        selected_month_label = now.strftime("%B %Y")

    # Compute next month start for range queries
    next_month_start = (selected_month_start + timedelta(days=32)).replace(day=1)

    default_rate = get_current_exchange_rate(session)

    # Revenue date attribution
    _rev_date = func.coalesce(Trip.dispatch_date, Trip.end_date, Trip.created_at)

    # --- Quarterly revenue (go waybills) ---
    go_trip_subq = (
        select(
            Trip.waybill_id,
            func.max(func.date(_rev_date)).label("date"),
        )
        .where(Trip.waybill_id.isnot(None))
        .where(_rev_date >= year_start)
        .where(Trip.status.in_(ACTIVE_TRIP_STATUSES))
        .group_by(Trip.waybill_id)
    ).subquery()
    revenue_stmt = (
        select(go_trip_subq.c.date, Waybill.agreed_rate, Waybill.currency)
        .join(go_trip_subq, Waybill.id == go_trip_subq.c.waybill_id)
    )
    # Return waybill revenue
    return_trip_subq = (
        select(
            Trip.return_waybill_id,
            func.max(func.date(_rev_date)).label("date"),
        )
        .where(Trip.return_waybill_id.isnot(None))
        .where(_rev_date >= year_start)
        .where(Trip.status.in_(ACTIVE_TRIP_STATUSES))
        .group_by(Trip.return_waybill_id)
    ).subquery()
    return_revenue_stmt = (
        select(return_trip_subq.c.date, Waybill.agreed_rate, Waybill.currency)
        .join(return_trip_subq, Waybill.id == return_trip_subq.c.return_waybill_id)
    )
    revenue_rows = list(session.exec(revenue_stmt).all()) + list(session.exec(return_revenue_stmt).all())

    # --- Approved expenses (current year) ---
    expense_stmt = (
        select(
            func.coalesce(func.date(ExpenseRequest.approved_at), func.date(ExpenseRequest.payment_date), func.date(ExpenseRequest.created_at)).label("date"),
            ExpenseRequest.amount,
            ExpenseRequest.currency,
            ExpenseRequest.exchange_rate,
        )
        .where(ExpenseRequest.status.in_(APPROVED_EXPENSE_STATUSES))
        .where(
            func.coalesce(ExpenseRequest.approved_at, ExpenseRequest.payment_date, ExpenseRequest.created_at) >= year_start
        )
    )
    expense_rows = session.exec(expense_stmt).all()

    # --- Quarterly trend ---
    quarter_revenue = aggregate_quarterly_revenue(revenue_rows, default_rate)
    quarter_expense = aggregate_quarterly_expenses(expense_rows, default_rate)
    quarterly_trend = build_quarterly_trend(quarter_revenue, quarter_expense, current_year)

    # --- Monthly stats ---
    monthly_go_stmt = (
        select(Waybill.agreed_rate, Waybill.currency)
        .where(
            Waybill.id.in_(
                select(Trip.waybill_id)
                .where(Trip.waybill_id.isnot(None))
                .where(_rev_date >= selected_month_start)
                .where(_rev_date < next_month_start)
                .where(Trip.status.in_(ACTIVE_TRIP_STATUSES))
            )
        )
    )
    monthly_return_stmt = (
        select(Waybill.agreed_rate, Waybill.currency)
        .where(
            Waybill.id.in_(
                select(Trip.return_waybill_id)
                .where(Trip.return_waybill_id.isnot(None))
                .where(_rev_date >= selected_month_start)
                .where(_rev_date < next_month_start)
                .where(Trip.status.in_(ACTIVE_TRIP_STATUSES))
            )
        )
    )
    monthly_revenue_rows = list(session.exec(monthly_go_stmt).all()) + list(session.exec(monthly_return_stmt).all())
    total_monthly_income = aggregate_monthly_revenue(monthly_revenue_rows, default_rate)

    monthly_expense_stmt = (
        select(ExpenseRequest.amount, ExpenseRequest.currency, ExpenseRequest.exchange_rate)
        .where(ExpenseRequest.status.in_(APPROVED_EXPENSE_STATUSES))
        .where(
            func.coalesce(ExpenseRequest.approved_at, ExpenseRequest.payment_date, ExpenseRequest.created_at) >= selected_month_start
        )
        .where(
            func.coalesce(ExpenseRequest.approved_at, ExpenseRequest.payment_date, ExpenseRequest.created_at) < next_month_start
        )
    )
    monthly_expense_rows = session.exec(monthly_expense_stmt).all()
    total_monthly_expense = aggregate_monthly_expenses(monthly_expense_rows, default_rate)

    monthly_stats = build_monthly_stats(
        total_monthly_income, total_monthly_expense, selected_month_label,
    )

    # --- Expense breakdown by category ---
    expense_breakdown_stmt = (
        select(ExpenseRequest.category, ExpenseRequest.amount, ExpenseRequest.currency, ExpenseRequest.exchange_rate)
        .where(ExpenseRequest.status.in_(APPROVED_EXPENSE_STATUSES))
        .where(
            func.coalesce(ExpenseRequest.approved_at, ExpenseRequest.payment_date, ExpenseRequest.created_at) >= selected_month_start
        )
        .where(
            func.coalesce(ExpenseRequest.approved_at, ExpenseRequest.payment_date, ExpenseRequest.created_at) < next_month_start
        )
    )
    breakdown_rows = session.exec(expense_breakdown_stmt).all()
    expense_breakdown = aggregate_expense_breakdown(breakdown_rows, default_rate)

    # Debug stats
    total_trips_with_waybills = session.exec(
        select(func.count()).select_from(Trip).join(Waybill, Waybill.id == Trip.waybill_id)
    ).one()
    total_approved_expenses = session.exec(
        select(func.count()).select_from(ExpenseRequest).where(ExpenseRequest.status.in_(APPROVED_EXPENSE_STATUSES))
    ).one()

    return {
        "quarterly_trend": quarterly_trend,
        "monthly_stats": monthly_stats,
        "expense_breakdown": expense_breakdown,
        "_debug": {
            "total_trips_with_waybills": total_trips_with_waybills,
            "total_approved_expenses": total_approved_expenses,
            "revenue_rows_count": len(revenue_rows),
            "expense_rows_count": len(expense_rows),
            "default_exchange_rate": float(default_rate),
        },
    }


# ---------------------------------------------------------------------------
# Trip Profitability
# ---------------------------------------------------------------------------

@router.get("/trip-profitability")
def get_trip_profitability(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    sort_by: str = Query(default="margin", description="Sort by: margin, profit, income, expenses"),
    sort_order: str = Query(default="asc", description="asc or desc"),
) -> dict[str, Any]:
    """Trip Profitability Report.

    Returns trips with income, expenses, net profit, margin %, and
    profit-per-day, all normalised to TZS.
    """
    default_rate = get_current_exchange_rate(session)

    # Get trips with go waybills
    trips_stmt = (
        select(Trip, Waybill)
        .join(Waybill, Waybill.id == Trip.waybill_id)
        .order_by(Trip.created_at.desc())
    )
    trip_rows = session.exec(trips_stmt).all()

    # Bulk-fetch return waybills
    return_waybill_ids = [trip.return_waybill_id for trip, _ in trip_rows if trip.return_waybill_id]
    return_waybills: dict = {}
    if return_waybill_ids:
        rw_stmt = select(Waybill).where(Waybill.id.in_(return_waybill_ids))
        for rw in session.exec(rw_stmt).all():
            return_waybills[rw.id] = rw

    # Approved expenses per trip
    expense_stmt = (
        select(ExpenseRequest.trip_id, ExpenseRequest.amount, ExpenseRequest.currency, ExpenseRequest.exchange_rate)
        .where(ExpenseRequest.status.in_(APPROVED_EXPENSE_STATUSES))
        .where(ExpenseRequest.trip_id.isnot(None))
    )
    expense_rows = session.exec(expense_stmt).all()

    trip_expenses: dict[str, Decimal] = {}
    for row in expense_rows:
        trip_id = str(row.trip_id)
        amt_tzs = normalize_to_tzs(row.amount, row.currency, row.exchange_rate, default_rate)
        trip_expenses[trip_id] = trip_expenses.get(trip_id, Decimal("0")) + amt_tzs

    # Office expenses (no trip linked)
    office_expense_stmt = (
        select(ExpenseRequest.amount, ExpenseRequest.currency, ExpenseRequest.exchange_rate)
        .where(ExpenseRequest.status.in_(APPROVED_EXPENSE_STATUSES))
        .where(ExpenseRequest.trip_id.is_(None))
    )
    office_expense_rows = session.exec(office_expense_stmt).all()
    total_office_expenses_tzs = Decimal("0")
    for row in office_expense_rows:
        total_office_expenses_tzs += normalize_to_tzs(row.amount, row.currency, row.exchange_rate, default_rate)

    # Project rows using the reporting module
    profitability_data = []
    for trip, go_waybill in trip_rows:
        trip_id = str(trip.id)
        return_wb = return_waybills.get(trip.return_waybill_id) if trip.return_waybill_id else None
        profitability_data.append(
            project_profitability_row(
                trip, go_waybill, return_wb,
                trip_expenses.get(trip_id, Decimal("0")),
                default_rate,
            )
        )

    # Sort
    sort_key_map = {
        "margin": "margin_pct",
        "profit": "net_profit",
        "income": "income",
        "expenses": "expenses",
        "trip_number": "trip_number",
        "profit_per_day": "profit_per_day",
    }
    sort_field = sort_key_map.get(sort_by, "margin_pct")
    reverse = sort_order.lower() == "desc"
    profitability_data.sort(key=lambda x: x.get(sort_field, 0), reverse=reverse)

    # Pagination
    total = len(profitability_data)
    paginated = profitability_data[skip:skip + limit]

    summary = build_profitability_summary(profitability_data, float(total_office_expenses_tzs))

    return {"data": paginated, "total": total, "summary": summary}
