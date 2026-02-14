from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Query
from sqlmodel import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Trip,
    TripStatus,
    Waybill,
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
    Get comprehensive waybill tracking report (WakaWaka Style).
    Joins Waybill -> Trip -> Truck -> Driver -> Trailer for a high-density flat view.
    """
    # Base query with joins
    base_query = (
        select(Waybill, Trip, Truck, Driver, Trailer)
        .outerjoin(Trip, Waybill.id == Trip.waybill_id)
        .outerjoin(Truck, Trip.truck_id == Truck.id)
        .outerjoin(Driver, Trip.driver_id == Driver.id)
        .outerjoin(Trailer, Trip.trailer_id == Trailer.id)
    )

    # Paginated query
    statement = (
        base_query
        .order_by(Waybill.created_at.desc())
        .offset(skip)
        .limit(limit)
    )

    results = session.exec(statement).all()
    
    report_data = []
    for waybill, trip, truck, driver, trailer in results:
        # Mock calculations for Mileage/Fuel until real IoT/GPS is integrated
        mileage = 0
        fuel_consumption = 0
        duration_days = 0
        
        if trip:
            if trip.status == "In Transit":
                mileage = 150 # Mock value
                fuel_consumption = 45.5 # Mock value
            
            # Calculate Duration
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
                duration_days = max(1, delta.days + 1)

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
            "duration_days": duration_days,
            
            # 7. Risk
            "risk_level": waybill.risk_level,
            
            # Meta
            "start_date": trip.start_date if trip else None,
        }
        report_data.append(row)

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
    """Convert USD to TZS using stored exchange rate or default."""
    if currency == "TZS":
        return amount
    # USD - use stored rate or default
    rate = exchange_rate if exchange_rate else default_rate
    return amount * rate


@router.get("/financial-pulse")
def get_financial_pulse(
    session: SessionDep,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """
    Financial Pulse Dashboard Data - Story 2.22

    Returns:
    - daily_trend: Daily Net Profit for the last 30 days
    - monthly_stats: Income vs Expenses for current month
    - expense_breakdown: Expenses by category (Approved + Paid)

    All values normalized to TZS (Base Currency).
    """
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    default_rate = get_current_exchange_rate(session)

    # ============================================================
    # 1. DAILY PROFIT TREND (Last 30 Days)
    # ============================================================

    # Daily Revenue from Waybills linked to active/completed Trips
    revenue_stmt = (
        select(
            func.date(Trip.created_at).label("date"),
            Waybill.agreed_rate,
            Waybill.currency,
        )
        .join(Waybill, Waybill.id == Trip.waybill_id)
        .where(Trip.created_at >= thirty_days_ago)
        .where(Trip.status.in_([
            TripStatus.loading.value,
            TripStatus.in_transit.value,
            TripStatus.at_border.value,
            TripStatus.offloaded.value,
            TripStatus.returned.value,
            TripStatus.waiting_for_pods.value,
            TripStatus.completed.value,
        ]))
    )
    revenue_rows = session.exec(revenue_stmt).all()

    # Daily Expenses (Approved: Pending Finance + Paid)
    # Use approved_at > payment_date > created_at for the date
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
            func.coalesce(ExpenseRequest.approved_at, ExpenseRequest.payment_date, ExpenseRequest.created_at) >= thirty_days_ago
        )
    )
    expense_rows = session.exec(expense_stmt).all()

    # Aggregate by date
    daily_revenue: dict[str, Decimal] = {}
    for row in revenue_rows:
        d_str = str(row.date)
        rate_tzs = normalize_to_tzs(Decimal(str(row.agreed_rate)), row.currency, None, default_rate)
        daily_revenue[d_str] = daily_revenue.get(d_str, Decimal("0")) + rate_tzs

    daily_expense: dict[str, Decimal] = {}
    for row in expense_rows:
        d_str = str(row.date)
        amt_tzs = normalize_to_tzs(row.amount, row.currency, row.exchange_rate, default_rate)
        daily_expense[d_str] = daily_expense.get(d_str, Decimal("0")) + amt_tzs

    # Build daily trend with all dates in range
    daily_trend = []
    for i in range(30):
        d = (thirty_days_ago + timedelta(days=i)).date()
        d_str = str(d)
        revenue = daily_revenue.get(d_str, Decimal("0"))
        expense = daily_expense.get(d_str, Decimal("0"))
        profit = revenue - expense
        daily_trend.append({
            "date": d_str,
            "profit": float(profit),
            "revenue": float(revenue),
            "expense": float(expense),
        })

    # ============================================================
    # 2. MONTHLY STATS (Income vs Expenses for Current Month)
    # ============================================================

    # Monthly Revenue from Waybills
    monthly_revenue_stmt = (
        select(
            Waybill.agreed_rate,
            Waybill.currency,
        )
        .join(Trip, Waybill.id == Trip.waybill_id)
        .where(Trip.created_at >= current_month_start)
        .where(Trip.status.in_([
            TripStatus.loading.value,
            TripStatus.in_transit.value,
            TripStatus.at_border.value,
            TripStatus.offloaded.value,
            TripStatus.returned.value,
            TripStatus.waiting_for_pods.value,
            TripStatus.completed.value,
        ]))
    )
    monthly_revenue_rows = session.exec(monthly_revenue_stmt).all()

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
        "daily_trend": daily_trend,
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

    # Get trips with waybills
    trips_stmt = (
        select(Trip, Waybill)
        .join(Waybill, Waybill.id == Trip.waybill_id)
        .order_by(Trip.created_at.desc())
    )
    trip_rows = session.exec(trips_stmt).all()

    # Get all approved expenses grouped by trip (Pending Finance + Paid)
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

    # Build expense totals per trip
    trip_expenses: dict[str, Decimal] = {}
    for row in expense_rows:
        trip_id = str(row.trip_id)
        amt_tzs = normalize_to_tzs(row.amount, row.currency, row.exchange_rate, default_rate)
        trip_expenses[trip_id] = trip_expenses.get(trip_id, Decimal("0")) + amt_tzs

    # Build profitability data
    profitability_data = []
    for trip, waybill in trip_rows:
        trip_id = str(trip.id)

        # Income from waybill (normalized to TZS)
        income = normalize_to_tzs(
            Decimal(str(waybill.agreed_rate)),
            waybill.currency,
            None,
            default_rate
        )

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
    total_profit = total_income - total_expenses_sum
    avg_margin = (total_profit / total_income * 100) if total_income > 0 else 0.0
    total_profit_per_day = sum(d["profit_per_day"] for d in profitability_data)

    return {
        "data": paginated,
        "total": total,
        "summary": {
            "total_income": total_income,
            "total_expenses": total_expenses_sum,
            "total_profit": total_profit,
            "average_margin_pct": round(avg_margin, 2),
            "total_profit_per_day": round(total_profit_per_day, 2),
        },
    }
