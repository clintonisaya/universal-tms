"""Reporting Read Model module.

Owns tracking, financial-pulse, profitability, and dashboard calculations.
Route adapters call these functions and translate results into HTTP responses.
"""

from .dashboard_stats import bucket_status_counts, merge_profit_trend
from .financial_pulse import (
    aggregate_expense_breakdown,
    aggregate_monthly_expenses,
    aggregate_monthly_revenue,
    aggregate_quarterly_expenses,
    aggregate_quarterly_revenue,
    build_monthly_stats,
    build_quarterly_trend,
)
from .helpers import (
    ACTIVE_TRIP_STATUSES,
    ALL_EXPENSE_CATEGORIES,
    APPROVED_EXPENSE_STATUSES,
    CLOSED_TRIP_STATUSES,
    FINISHED_TRIP_STATUSES,
    calc_durations,
    calc_return_duration_days,
    calc_trip_duration_days,
    normalize_to_tzs,
    resolve_border_location,
    revenue_date,
)
from .profitability import (
    build_profitability_summary,
    calc_margin_pct,
    calc_trip_income,
    project_profitability_row,
)
from .tracking import project_trip_row, project_unlinked_waybill_row

__all__ = [
    # helpers
    "ACTIVE_TRIP_STATUSES",
    "ALL_EXPENSE_CATEGORIES",
    "APPROVED_EXPENSE_STATUSES",
    "CLOSED_TRIP_STATUSES",
    "FINISHED_TRIP_STATUSES",
    "normalize_to_tzs",
    "calc_trip_duration_days",
    "calc_return_duration_days",
    "calc_durations",
    "revenue_date",
    "resolve_border_location",
    # tracking
    "project_trip_row",
    "project_unlinked_waybill_row",
    # financial pulse
    "aggregate_quarterly_revenue",
    "aggregate_quarterly_expenses",
    "build_quarterly_trend",
    "aggregate_monthly_revenue",
    "aggregate_monthly_expenses",
    "build_monthly_stats",
    "aggregate_expense_breakdown",
    # profitability
    "calc_trip_income",
    "calc_margin_pct",
    "project_profitability_row",
    "build_profitability_summary",
    # dashboard stats
    "bucket_status_counts",
    "merge_profit_trend",
]
