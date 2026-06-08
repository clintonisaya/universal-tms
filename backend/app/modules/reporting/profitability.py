"""Trip Profitability Read Model.

Pure projection and aggregation functions for the trip profitability
report.  Callers supply pre-fetched ORM objects; these functions handle
income calculation, expense aggregation, margin computation, and
profit-per-day calculation.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from .helpers import (
    calc_return_duration_days,
    calc_trip_duration_days,
    normalize_to_tzs,
)


def calc_trip_income(
    go_waybill: Any,
    return_waybill: Any | None,
    default_rate: Decimal,
) -> Decimal:
    """Calculate total trip income in TZS (go + return waybill rates)."""
    income = normalize_to_tzs(
        Decimal(str(go_waybill.agreed_rate)),
        go_waybill.currency,
        None,
        default_rate,
    )
    if return_waybill:
        income += normalize_to_tzs(
            Decimal(str(return_waybill.agreed_rate)),
            return_waybill.currency,
            None,
            default_rate,
        )
    return income


def calc_margin_pct(net_profit: float, income: float) -> float:
    """Calculate margin percentage.  Returns 0.0 when income is zero."""
    if income <= 0:
        return 0.0
    return (net_profit / income) * 100


def project_profitability_row(
    trip: Any,
    go_waybill: Any,
    return_waybill: Any | None,
    trip_expenses_tzs: Decimal,
    default_rate: Decimal,
) -> dict[str, Any]:
    """Project a single trip into a profitability-report row dict.

    *trip_expenses_tzs* is the pre-aggregated approved expense total for
    this trip, already normalised to TZS.
    """
    income = calc_trip_income(go_waybill, return_waybill, default_rate)
    net_profit = income - trip_expenses_tzs

    duration_days = calc_trip_duration_days(trip)
    return_duration_days = calc_return_duration_days(trip)

    profit_per_day = float(net_profit) / duration_days if duration_days else 0.0

    status = trip.status.value if hasattr(trip.status, "value") else str(trip.status)

    return {
        "trip_id": str(trip.id),
        "trip_number": trip.trip_number,
        "route_name": trip.route_name,
        "client": go_waybill.client_name,
        "status": status,
        "income": float(income),
        "expenses": float(trip_expenses_tzs),
        "net_profit": float(net_profit),
        "margin_pct": round(calc_margin_pct(float(net_profit), float(income)), 2),
        "start_date": trip.start_date.isoformat() if trip.start_date else None,
        "profit_per_day": round(profit_per_day, 2),
        "duration_days": duration_days,
        "return_duration_days": return_duration_days,
    }


def build_profitability_summary(
    all_rows: list[dict[str, Any]],
    total_office_expenses_tzs: float,
) -> dict[str, Any]:
    """Compute summary statistics across all profitability rows.

    Office expenses are reported separately and NOT subtracted from
    total_profit (that would double-count them).
    """
    total_income = sum(d["income"] for d in all_rows)
    total_expenses = sum(d["expenses"] for d in all_rows)
    total_profit = total_income - total_expenses
    avg_margin = (total_profit / total_income * 100) if total_income > 0 else 0.0
    total_profit_per_day = sum(d["profit_per_day"] for d in all_rows)

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "total_office_expenses": total_office_expenses_tzs,
        "total_profit": total_profit,
        "average_margin_pct": round(avg_margin, 2),
        "total_profit_per_day": round(total_profit_per_day, 2),
    }
