from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Query
from sqlmodel import func, select
from sqlalchemy import or_
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from sqlalchemy.orm import aliased

from collections import defaultdict

from app.models import (
    BorderPost,
    Trip,
    TripBorderCrossing,
    TripStatus,
    Waybill,
    WaybillStatus,
    Truck,
    Driver,
    Trailer,
    ExpenseRequest,
    ExpenseStatus,
    ExpenseCategory,
    ExchangeRate,
)

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/waybill-tracking")
def get_waybill_tracking_report(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=200, ge=1, le=500, description="Max records to return"),
) -> Any:
    """
    Trip-centric tracking report — one row per trip combining go + return waybill data.
    Unlinked (open, no trip) waybills are appended as separate rows.
    """
    GoWaybill = aliased(Waybill, name="go_waybill")
    ReturnWaybill = aliased(Waybill, name="return_waybill")

    # Trip-centric: one row per trip, left-join both waybills
    trips_stmt = (
        select(Trip, GoWaybill, ReturnWaybill, Truck, Driver, Trailer)
        .outerjoin(GoWaybill, GoWaybill.id == Trip.waybill_id)
        .outerjoin(ReturnWaybill, ReturnWaybill.id == Trip.return_waybill_id)
        .outerjoin(Truck, Truck.id == Trip.truck_id)
        .outerjoin(Driver, Driver.id == Trip.driver_id)
        .outerjoin(Trailer, Trailer.id == Trip.trailer_id)
        .order_by(Trip.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    trip_results = session.execute(trips_stmt).all()

    # Collect linked waybill IDs to find unlinked ones
    linked_ids: list = []
    for row in trip_results:
        trip = row[0]
        if trip.waybill_id:
            linked_ids.append(trip.waybill_id)
        if trip.return_waybill_id:
            linked_ids.append(trip.return_waybill_id)

    # Open waybills not yet dispatched on any trip
    unlinked_stmt = select(Waybill).where(Waybill.status == WaybillStatus.open)
    if linked_ids:
        unlinked_stmt = unlinked_stmt.where(Waybill.id.notin_(linked_ids))
    unlinked_waybills = session.exec(unlinked_stmt).all()

    def calc_durations(trip):
        duration_days = 0
        return_duration_days = 0
        if not trip:
            return duration_days, return_duration_days

        start_date = trip.dispatch_date or trip.start_date or trip.created_at
        if start_date:
            end_date = trip.arrival_return_date or trip.end_date or datetime.now(timezone.utc)
            if start_date.tzinfo is None:
                start_date = start_date.replace(tzinfo=timezone.utc)
            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)
            duration_days = max(1, (end_date - start_date).days + 1)

        if trip.return_waybill_id and trip.dispatch_return_date:
            ret_start = trip.dispatch_return_date
            ret_end = trip.arrival_return_date or datetime.now(timezone.utc)
            if ret_start.tzinfo is None:
                ret_start = ret_start.replace(tzinfo=timezone.utc)
            if ret_end.tzinfo is None:
                ret_end = ret_end.replace(tzinfo=timezone.utc)
            return_duration_days = max(1, (ret_end - ret_start).days + 1)

        return duration_days, return_duration_days

    # --- Bulk-fetch border crossings for all trips (avoid N+1) ---
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

    report_data = []

    # --- Trip rows ---
    for db_row in trip_results:
        trip, go_wb, return_wb, truck, driver, trailer = db_row
        duration_days, return_duration_days = calc_durations(trip)

        def _iso(dt):
            return dt.isoformat() if dt else None

        row = {
            # Unique key for frontend table
            "row_id": str(trip.id),
            # Trip status
            "trip_status": trip.status if trip else "Not Dispatched",
            # IDs
            "trip_id": str(trip.id),
            "trip_number": trip.trip_number,
            # Go waybill
            "waybill_id": str(go_wb.id) if go_wb else None,
            "waybill_number": go_wb.waybill_number if go_wb else None,
            "waybill_status": go_wb.status if go_wb else None,
            "client_name": go_wb.client_name if go_wb else None,
            "cargo_type": go_wb.cargo_type if go_wb else None,
            "cargo_weight": go_wb.weight_kg if go_wb else 0,
            "cargo_description": go_wb.description if go_wb else "",
            "origin": go_wb.origin if go_wb else "",
            "destination": go_wb.destination if go_wb else "",
            "risk_level": go_wb.risk_level if go_wb else "Low",
            # Return waybill (if attached)
            "return_waybill_id": str(trip.return_waybill_id) if trip.return_waybill_id else None,
            "return_waybill_number": return_wb.waybill_number if return_wb else None,
            "return_waybill_status": return_wb.status if return_wb else None,
            "return_client_name": return_wb.client_name if return_wb else None,
            "return_cargo_type": return_wb.cargo_type if return_wb else None,
            "return_cargo_weight": return_wb.weight_kg if return_wb else None,
            "return_origin": return_wb.origin if return_wb else None,
            "return_destination": return_wb.destination if return_wb else None,
            "return_cargo_description": return_wb.description if return_wb else None,
            # Assets — extended
            "truck_plate": truck.plate_number if truck else None,
            "truck_make": truck.make if truck else None,
            "truck_model": truck.model if truck else None,
            "driver_name": driver.full_name if driver else None,
            "driver_license": driver.license_number if driver else None,
            "driver_passport": driver.passport_number if driver else None,
            "driver_phone": driver.phone_number if driver else None,
            "trailer_plate": trailer.plate_number if trailer else None,
            "trailer_type": trailer.type if trailer else None,
            # Location
            "current_location": trip.current_location,
            "border_location": "Kasumbalesa" if trip.status in ("At Border", "At Border (Return)") else None,
            # Duration
            "duration_days": duration_days,
            "return_duration_days": return_duration_days,
            # Meta
            "start_date": trip.start_date.isoformat() if trip.start_date else None,
            # Trip tracking dates
            "dispatch_date": _iso(trip.dispatch_date),
            "arrival_loading_date": _iso(trip.arrival_loading_date),
            "loading_start_date": _iso(trip.loading_start_date),
            "loading_end_date": _iso(trip.loading_end_date),
            "arrival_offloading_date": _iso(trip.arrival_offloading_date),
            "offloading_date": _iso(trip.offloading_date),
            "dispatch_return_date": _iso(trip.dispatch_return_date),
            "arrival_loading_return_date": _iso(trip.arrival_loading_return_date),
            "loading_return_start_date": _iso(trip.loading_return_start_date),
            "loading_return_end_date": _iso(trip.loading_return_end_date),
            "offloading_return_date": _iso(trip.offloading_return_date),
            "arrival_return_date": _iso(trip.arrival_return_date),
            # Client report fields
            "return_empty_container_date": _iso(trip.return_empty_container_date),
            "remarks": trip.remarks,
            "return_remarks": trip.return_remarks,
            # Border crossings (bulk-fetched, no N+1)
            "border_crossings": crossings_by_trip.get(str(trip.id), []),
        }
        report_data.append(row)

    # --- Unlinked waybill rows (no trip yet) ---
    for wb in unlinked_waybills:
        report_data.append({
            "row_id": str(wb.id),
            "trip_status": "Not Dispatched",
            "trip_id": None,
            "trip_number": None,
            "waybill_id": str(wb.id),
            "waybill_number": wb.waybill_number,
            "waybill_status": wb.status,
            "client_name": wb.client_name,
            "cargo_type": wb.cargo_type,
            "cargo_weight": wb.weight_kg,
            "cargo_description": wb.description,
            "origin": wb.origin,
            "destination": wb.destination,
            "risk_level": wb.risk_level,
            "return_waybill_id": None,
            "return_waybill_number": None,
            "return_waybill_status": None,
            "return_client_name": None,
            "return_cargo_type": None,
            "return_cargo_weight": None,
            "return_origin": None,
            "return_destination": None,
            "return_cargo_description": None,
            "truck_plate": None,
            "truck_make": None,
            "truck_model": None,
            "driver_name": None,
            "driver_license": None,
            "driver_passport": None,
            "driver_phone": None,
            "trailer_plate": None,
            "trailer_type": None,
            "current_location": None,
            "border_location": None,
            "duration_days": 0,
            "return_duration_days": 0,
            "start_date": None,
            "dispatch_date": None,
            "arrival_loading_date": None,
            "loading_start_date": None,
            "loading_end_date": None,
            "arrival_offloading_date": None,
            "offloading_date": None,
            "dispatch_return_date": None,
            "arrival_loading_return_date": None,
            "loading_return_start_date": None,
            "loading_return_end_date": None,
            "offloading_return_date": None,
            "arrival_return_date": None,
            "return_empty_container_date": None,
            "remarks": None,
            "return_remarks": None,
            "border_crossings": [],
        })

    return report_data


def get_current_exchange_rate(session: SessionDep) -> Decimal:
    """Get current month's exchange rate, fallback to most recent or default."""
    now = datetime.now(timezone.utc)

    # Try current month
    rate = session.exec(
        select(ExchangeRate)
        .where(ExchangeRate.month == now.month)
        .where(ExchangeRate.year == now.year)
    ).first()

    if rate:
        return rate.rate

    # Try most recent rate
    rate = session.exec(
        select(ExchangeRate)
        .order_by(ExchangeRate.year.desc(), ExchangeRate.month.desc())
        .limit(1)
    ).first()

    if rate:
        return rate.rate

    # Default rate
    return Decimal("2500.00")


def normalize_to_tzs(amount: Decimal, currency: str, exchange_rate: Decimal | None, default_rate: Decimal) -> Decimal:
    """Convert USD to TZS using stored exchange rate or default.

    The stored exchange_rate must be > 1 to be valid (a real TZS/USD rate is
    always > 1, e.g. 2500). Values of 0 or 1 are sentinel/unset values and
    must fall back to default_rate to avoid silently under-converting amounts.
    This mirrors the frontend resolveRate() guard: `if (ownRate && ownRate > 1)`.
    """
    if currency == "TZS":
        return amount
    # Only use the stored rate if it is a real rate (> 1 TZS per foreign unit)
    rate = exchange_rate if (exchange_rate and exchange_rate > Decimal("1")) else default_rate
    return amount * rate


@router.get("/financial-pulse")
def get_financial_pulse(
    session: SessionDep,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """
    Financial Pulse Dashboard Data - Story 2.22

    Returns:
    - quarterly_trend: Monthly Net Profit for the last 3 months (quarterly view)
    - monthly_stats: Income vs Expenses for current month
    - expense_breakdown: Expenses by category (Approved + Paid)

    All values normalized to TZS (Base Currency).
    """
    now = datetime.now(timezone.utc)
    current_year = now.year
    year_start = datetime(current_year, 1, 1, tzinfo=timezone.utc)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    default_rate = get_current_exchange_rate(session)

    # Quarter definitions: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec
    quarters = [
        {"label": "Q1", "months": [1, 2, 3]},
        {"label": "Q2", "months": [4, 5, 6]},
        {"label": "Q3", "months": [7, 8, 9]},
        {"label": "Q4", "months": [10, 11, 12]},
    ]

    # ============================================================
    # 1. QUARTERLY PROFIT TREND (4 quarters of current year)
    # ============================================================

    # Active/completed trip statuses for revenue counting
    _active_statuses = [
        TripStatus.wait_to_load.value,
        TripStatus.loading.value,
        TripStatus.loaded.value,
        TripStatus.in_transit.value,
        TripStatus.at_border.value,
        TripStatus.arrived_at_destination.value,
        TripStatus.offloading.value,
        TripStatus.offloaded.value,
        TripStatus.returning_empty.value,
        TripStatus.dispatch_return.value,
        TripStatus.wait_to_load_return.value,
        TripStatus.loading_return.value,
        TripStatus.loaded_return.value,
        TripStatus.in_transit_return.value,
        TripStatus.at_border_return.value,
        TripStatus.arrived_at_destination_return.value,
        TripStatus.offloading_return.value,
        TripStatus.offloaded_return.value,
        TripStatus.returned.value,
        TripStatus.waiting_for_pods.value,
        TripStatus.completed.value,
    ]

    # Go waybill revenue (current year)
    revenue_stmt = (
        select(
            func.date(Trip.created_at).label("date"),
            Waybill.agreed_rate,
            Waybill.currency,
        )
        .join(Waybill, Waybill.id == Trip.waybill_id)
        .where(Trip.created_at >= year_start)
        .where(Trip.status.in_(_active_statuses))
    )
    # Return waybill revenue (current year) — only trips that have return waybill attached
    return_revenue_stmt = (
        select(
            func.date(Trip.created_at).label("date"),
            Waybill.agreed_rate,
            Waybill.currency,
        )
        .join(Waybill, Waybill.id == Trip.return_waybill_id)
        .where(Trip.return_waybill_id.isnot(None))
        .where(Trip.created_at >= year_start)
        .where(Trip.status.in_(_active_statuses))
    )
    revenue_rows = list(session.exec(revenue_stmt).all()) + list(session.exec(return_revenue_stmt).all())

    # Expenses (Approved: Pending Finance + Paid) for current year
    approved_statuses = [ExpenseStatus.pending_finance.value, ExpenseStatus.paid.value]
    expense_stmt = (
        select(
            func.coalesce(func.date(ExpenseRequest.approved_at), func.date(ExpenseRequest.payment_date), func.date(ExpenseRequest.created_at)).label("date"),
            ExpenseRequest.amount,
            ExpenseRequest.currency,
            ExpenseRequest.exchange_rate,
        )
        .where(ExpenseRequest.status.in_(approved_statuses))
        .where(
            func.coalesce(ExpenseRequest.approved_at, ExpenseRequest.payment_date, ExpenseRequest.created_at) >= year_start
        )
    )
    expense_rows = session.exec(expense_stmt).all()

    # Helper to get quarter index (0-3) from month
    def get_quarter(month: int) -> int:
        return (month - 1) // 3

    # Aggregate by quarter
    quarter_revenue = [Decimal("0")] * 4
    for row in revenue_rows:
        month = int(str(row.date)[5:7])
        qi = get_quarter(month)
        rate_tzs = normalize_to_tzs(Decimal(str(row.agreed_rate)), row.currency, None, default_rate)
        quarter_revenue[qi] += rate_tzs

    quarter_expense = [Decimal("0")] * 4
    for row in expense_rows:
        month = int(str(row.date)[5:7])
        qi = get_quarter(month)
        amt_tzs = normalize_to_tzs(row.amount, row.currency, row.exchange_rate, default_rate)
        quarter_expense[qi] += amt_tzs

    # Build quarterly trend (all 4 quarters)
    quarterly_trend = []
    for i, q in enumerate(quarters):
        revenue = quarter_revenue[i]
        expense = quarter_expense[i]
        profit = revenue - expense
        month_names = "-".join([datetime(current_year, m, 1).strftime("%b") for m in q["months"]])
        quarterly_trend.append({
            "quarter": q["label"],
            "label": f"{q['label']} ({month_names})",
            "profit": float(profit),
            "revenue": float(revenue),
            "expense": float(expense),
        })

    # ============================================================
    # 2. MONTHLY STATS (Income vs Expenses for Current Month)
    # ============================================================

    # Monthly Revenue: go waybills
    monthly_revenue_stmt = (
        select(Waybill.agreed_rate, Waybill.currency)
        .join(Trip, Waybill.id == Trip.waybill_id)
        .where(Trip.created_at >= current_month_start)
        .where(Trip.status.in_(_active_statuses))
    )
    # Monthly Revenue: return waybills
    monthly_return_revenue_stmt = (
        select(Waybill.agreed_rate, Waybill.currency)
        .join(Trip, Waybill.id == Trip.return_waybill_id)
        .where(Trip.return_waybill_id.isnot(None))
        .where(Trip.created_at >= current_month_start)
        .where(Trip.status.in_(_active_statuses))
    )
    monthly_revenue_rows = list(session.exec(monthly_revenue_stmt).all()) + list(session.exec(monthly_return_revenue_stmt).all())

    total_monthly_income = Decimal("0")
    for row in monthly_revenue_rows:
        total_monthly_income += normalize_to_tzs(Decimal(str(row.agreed_rate)), row.currency, None, default_rate)

    # Monthly Expenses (Approved: Pending Finance + Paid)
    monthly_expense_stmt = (
        select(
            ExpenseRequest.amount,
            ExpenseRequest.currency,
            ExpenseRequest.exchange_rate,
        )
        .where(ExpenseRequest.status.in_(approved_statuses))
        .where(
            func.coalesce(ExpenseRequest.approved_at, ExpenseRequest.payment_date, ExpenseRequest.created_at) >= current_month_start
        )
    )
    monthly_expense_rows = session.exec(monthly_expense_stmt).all()

    total_monthly_expense = Decimal("0")
    for row in monthly_expense_rows:
        total_monthly_expense += normalize_to_tzs(row.amount, row.currency, row.exchange_rate, default_rate)

    monthly_stats = {
        "income": float(total_monthly_income),
        "expenses": float(total_monthly_expense),
        "net_profit": float(total_monthly_income - total_monthly_expense),
        "month": now.strftime("%B %Y"),
    }

    # ============================================================
    # 3. EXPENSE BREAKDOWN BY CATEGORY (Approved: Pending Finance + Paid)
    # ============================================================

    expense_breakdown_stmt = (
        select(
            ExpenseRequest.category,
            ExpenseRequest.amount,
            ExpenseRequest.currency,
            ExpenseRequest.exchange_rate,
        )
        .where(ExpenseRequest.status.in_(approved_statuses))
        .where(
            func.coalesce(ExpenseRequest.approved_at, ExpenseRequest.payment_date, ExpenseRequest.created_at) >= current_month_start
        )
    )
    breakdown_rows = session.exec(expense_breakdown_stmt).all()

    category_totals: dict[str, Decimal] = {}
    for row in breakdown_rows:
        cat = row.category.value if hasattr(row.category, "value") else str(row.category)
        amt_tzs = normalize_to_tzs(row.amount, row.currency, row.exchange_rate, default_rate)
        category_totals[cat] = category_totals.get(cat, Decimal("0")) + amt_tzs

    expense_breakdown = [
        {"category": cat, "amount": float(amt)}
        for cat, amt in category_totals.items()
    ]

    # Ensure all categories appear even if 0
    all_categories = ["Fuel", "Allowance", "Maintenance", "Office", "Border", "Other"]
    existing_cats = {e["category"] for e in expense_breakdown}
    for cat in all_categories:
        if cat not in existing_cats:
            expense_breakdown.append({"category": cat, "amount": 0.0})

    # Sort by amount descending
    expense_breakdown.sort(key=lambda x: x["amount"], reverse=True)

    # Debug stats - count total records to help diagnose empty data issues
    total_trips_with_waybills = session.exec(
        select(func.count())
        .select_from(Trip)
        .join(Waybill, Waybill.id == Trip.waybill_id)
    ).one()

    total_approved_expenses = session.exec(
        select(func.count())
        .select_from(ExpenseRequest)
        .where(ExpenseRequest.status.in_(approved_statuses))
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


@router.get("/trip-profitability")
def get_trip_profitability(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    sort_by: str = Query(default="margin", description="Sort by: margin, profit, income, expenses"),
    sort_order: str = Query(default="asc", description="asc or desc"),
) -> dict[str, Any]:
    """
    Trip Profitability Report - Story 2.22

    Returns trips with:
    - Trip Number, Route Name, Client
    - Income (Waybill Amount)
    - Total Expenses (Sum of Approved + Paid Trip Expenses)
    - Net Profit (Income - Expenses)
    - Margin % ((Net Profit / Income) * 100)

    All values normalized to TZS.
    """
    default_rate = get_current_exchange_rate(session)

    # Get trips with go waybills
    trips_stmt = (
        select(Trip, Waybill)
        .join(Waybill, Waybill.id == Trip.waybill_id)
        .order_by(Trip.created_at.desc())
    )
    trip_rows = session.exec(trips_stmt).all()

    # Bulk-fetch return waybills for trips that have one
    return_waybill_ids = [
        trip.return_waybill_id for trip, _ in trip_rows if trip.return_waybill_id
    ]
    return_waybills: dict = {}
    if return_waybill_ids:
        rw_stmt = select(Waybill).where(Waybill.id.in_(return_waybill_ids))
        for rw in session.exec(rw_stmt).all():
            return_waybills[rw.id] = rw

    # Only approved expenses count: Pending Finance (manager-approved) and Paid
    approved_statuses = [ExpenseStatus.pending_finance.value, ExpenseStatus.paid.value]
    expense_stmt = (
        select(
            ExpenseRequest.trip_id,
            ExpenseRequest.amount,
            ExpenseRequest.currency,
            ExpenseRequest.exchange_rate,
        )
        .where(ExpenseRequest.status.in_(approved_statuses))
        .where(ExpenseRequest.trip_id.isnot(None))
    )
    expense_rows = session.exec(expense_stmt).all()

    # Build expense totals per trip — USD amounts normalized to TZS
    trip_expenses: dict[str, Decimal] = {}
    for row in expense_rows:
        trip_id = str(row.trip_id)
        amt_tzs = normalize_to_tzs(row.amount, row.currency, row.exchange_rate, default_rate)
        trip_expenses[trip_id] = trip_expenses.get(trip_id, Decimal("0")) + amt_tzs

    # Approved office expenses (no trip linked) — same filter
    office_expense_stmt = (
        select(
            ExpenseRequest.amount,
            ExpenseRequest.currency,
            ExpenseRequest.exchange_rate,
        )
        .where(ExpenseRequest.status.in_(approved_statuses))
        .where(ExpenseRequest.trip_id.is_(None))
    )
    office_expense_rows = session.exec(office_expense_stmt).all()
    total_office_expenses_tzs = Decimal("0")
    for row in office_expense_rows:
        total_office_expenses_tzs += normalize_to_tzs(row.amount, row.currency, row.exchange_rate, default_rate)

    # Build profitability data
    profitability_data = []
    for trip, go_waybill in trip_rows:
        trip_id = str(trip.id)

        # Income: go waybill + return waybill (if attached)
        income = normalize_to_tzs(
            Decimal(str(go_waybill.agreed_rate)),
            go_waybill.currency,
            None,
            default_rate
        )
        return_waybill = return_waybills.get(trip.return_waybill_id) if trip.return_waybill_id else None
        if return_waybill:
            income += normalize_to_tzs(
                Decimal(str(return_waybill.agreed_rate)),
                return_waybill.currency,
                None,
                default_rate
            )
        waybill = go_waybill  # keep reference for client name below

        # Total approved expenses for this trip
        expenses = trip_expenses.get(trip_id, Decimal("0"))

        # Net Profit
        net_profit = income - expenses

        # Margin %
        margin_pct = (float(net_profit) / float(income) * 100) if income > 0 else 0.0

        # Trip Duration & Profit per Day
        duration_days = 1
        
        # Determine Start Date (Dispatch > Start > Created)
        start_date = trip.dispatch_date or trip.start_date or trip.created_at
        
        if start_date:
            # Determine End Date (Return > End > Now)
            end_date = trip.arrival_return_date or trip.end_date or datetime.now(timezone.utc)
            
            # Ensure aware datetimes for subtraction
            if start_date.tzinfo is None:
                start_date = start_date.replace(tzinfo=timezone.utc)
            if end_date.tzinfo is None:
                end_date = end_date.replace(tzinfo=timezone.utc)
                
            delta = end_date - start_date
            duration_days = max(1, delta.days + 1) # +1 to include partial days as 1 full day, or at least 1 day
        
        profit_per_day = float(net_profit) / duration_days

        profitability_data.append({
            "trip_id": trip_id,
            "trip_number": trip.trip_number,
            "route_name": trip.route_name,
            "client": waybill.client_name,
            "status": trip.status.value if hasattr(trip.status, "value") else str(trip.status),
            "income": float(income),
            "expenses": float(expenses),
            "net_profit": float(net_profit),
            "margin_pct": round(margin_pct, 2),
            "start_date": trip.start_date.isoformat() if trip.start_date else None,
            "profit_per_day": round(profit_per_day, 2),
            "duration_days": duration_days,
        })

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

    # Summary stats
    total_income = sum(d["income"] for d in profitability_data)
    total_expenses_sum = sum(d["expenses"] for d in profitability_data)
    total_profit = total_income - total_expenses_sum - float(total_office_expenses_tzs)
    avg_margin = (total_profit / total_income * 100) if total_income > 0 else 0.0
    total_profit_per_day = sum(d["profit_per_day"] for d in profitability_data)

    return {
        "data": paginated,
        "total": total,
        "summary": {
            "total_income": total_income,
            "total_expenses": total_expenses_sum,
            "total_office_expenses": float(total_office_expenses_tzs),
            "total_profit": total_profit,
            "average_margin_pct": round(avg_margin, 2),
            "total_profit_per_day": round(total_profit_per_day, 2),
        },
    }
