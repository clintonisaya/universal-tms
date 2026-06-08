"""Financial Pulse Read Model.

Pure aggregation functions for the financial pulse dashboard.  Callers
supply pre-fetched row data (from SQLAlchemy queries); these functions
handle quarter bucketing, TZS normalisation, monthly aggregation, and
expense-category breakdowns.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from .helpers import ALL_EXPENSE_CATEGORIES, normalize_to_tzs

# ---------------------------------------------------------------------------
# Quarter definitions
# ---------------------------------------------------------------------------

QUARTERS: list[dict[str, Any]] = [
    {"label": "Q1", "months": [1, 2, 3]},
    {"label": "Q2", "months": [4, 5, 6]},
    {"label": "Q3", "months": [7, 8, 9]},
    {"label": "Q4", "months": [10, 11, 12]},
]


def _quarter_index(month: int) -> int:
    """Return 0-based quarter index for a month (1-12)."""
    return (month - 1) // 3


# ---------------------------------------------------------------------------
# Revenue aggregation
# ---------------------------------------------------------------------------

def aggregate_quarterly_revenue(
    revenue_rows: list[Any],
    default_rate: Decimal,
) -> list[Decimal]:
    """Bucket revenue rows into 4 quarterly totals (TZS).

    Each row must have ``.date`` (date/datetime or ISO string) and
    ``.agreed_rate`` / ``.currency`` attributes.
    """
    quarter_revenue = [Decimal("0")] * 4
    for row in revenue_rows:
        month = _extract_month(row.date)
        qi = _quarter_index(month)
        rate_tzs = normalize_to_tzs(
            Decimal(str(row.agreed_rate)), row.currency, None, default_rate,
        )
        quarter_revenue[qi] += rate_tzs
    return quarter_revenue


def aggregate_quarterly_expenses(
    expense_rows: list[Any],
    default_rate: Decimal,
) -> list[Decimal]:
    """Bucket expense rows into 4 quarterly totals (TZS).

    Each row must have ``.date``, ``.amount``, ``.currency``, and
    ``.exchange_rate`` attributes.
    """
    quarter_expense = [Decimal("0")] * 4
    for row in expense_rows:
        month = _extract_month(row.date)
        qi = _quarter_index(month)
        amt_tzs = normalize_to_tzs(
            row.amount, row.currency, row.exchange_rate, default_rate,
        )
        quarter_expense[qi] += amt_tzs
    return quarter_expense


def build_quarterly_trend(
    quarter_revenue: list[Decimal],
    quarter_expense: list[Decimal],
    year: int,
) -> list[dict[str, Any]]:
    """Merge revenue and expense quarter arrays into the trend response."""
    trend = []
    for i, q in enumerate(QUARTERS):
        revenue = quarter_revenue[i]
        expense = quarter_expense[i]
        profit = revenue - expense
        month_names = "-".join(
            datetime(year, m, 1).strftime("%b") for m in q["months"]
        )
        trend.append({
            "quarter": q["label"],
            "label": f"{q['label']} ({month_names})",
            "profit": float(profit),
            "revenue": float(revenue),
            "expense": float(expense),
        })
    return trend


# ---------------------------------------------------------------------------
# Monthly stats
# ---------------------------------------------------------------------------

def aggregate_monthly_revenue(
    revenue_rows: list[Any],
    default_rate: Decimal,
) -> Decimal:
    """Sum waybill rates into a single TZS total.

    Each row must have ``.agreed_rate`` and ``.currency``.
    """
    total = Decimal("0")
    for row in revenue_rows:
        total += normalize_to_tzs(
            Decimal(str(row.agreed_rate)), row.currency, None, default_rate,
        )
    return total


def aggregate_monthly_expenses(
    expense_rows: list[Any],
    default_rate: Decimal,
) -> Decimal:
    """Sum expense amounts into a single TZS total.

    Each row must have ``.amount``, ``.currency``, and ``.exchange_rate``.
    """
    total = Decimal("0")
    for row in expense_rows:
        total += normalize_to_tzs(
            row.amount, row.currency, row.exchange_rate, default_rate,
        )
    return total


def build_monthly_stats(
    income: Decimal,
    expenses: Decimal,
    month_label: str,
) -> dict[str, Any]:
    """Build the ``monthly_stats`` response object."""
    return {
        "income": float(income),
        "expenses": float(expenses),
        "net_profit": float(income - expenses),
        "month": month_label,
    }


# ---------------------------------------------------------------------------
# Expense breakdown by category
# ---------------------------------------------------------------------------

def aggregate_expense_breakdown(
    breakdown_rows: list[Any],
    default_rate: Decimal,
) -> list[dict[str, Any]]:
    """Group expenses by category and return a sorted breakdown list.

    Each row must have ``.category``, ``.amount``, ``.currency``, and
    ``.exchange_rate``.  All known categories are included even when zero.
    """
    category_totals: dict[str, Decimal] = {}
    for row in breakdown_rows:
        cat = row.category.value if hasattr(row.category, "value") else str(row.category)
        amt_tzs = normalize_to_tzs(row.amount, row.currency, row.exchange_rate, default_rate)
        category_totals[cat] = category_totals.get(cat, Decimal("0")) + amt_tzs

    breakdown = [
        {"category": cat, "amount": float(amt)}
        for cat, amt in category_totals.items()
    ]

    # Ensure all categories appear even if 0
    existing_cats = {e["category"] for e in breakdown}
    for cat in ALL_EXPENSE_CATEGORIES:
        if cat not in existing_cats:
            breakdown.append({"category": cat, "amount": 0.0})

    breakdown.sort(key=lambda x: x["amount"], reverse=True)
    return breakdown


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_month(date_value: Any) -> int:
    """Extract the month (1-12) from a date, datetime, or ISO string."""
    if hasattr(date_value, "month"):
        return date_value.month
    # String fallback: "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS"
    s = str(date_value)
    return int(s[5:7])
