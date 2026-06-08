"""Dashboard Stats Read Model.

Pure aggregation functions for the dashboard statistics endpoint.
Callers supply pre-fetched row data; these functions handle status
bucketing and profit-trend merging.
"""

from __future__ import annotations

from typing import Any


def bucket_status_counts(rows: list[Any]) -> dict[str, int]:
    """Convert ``(status, count)`` rows into a ``{status_str: count}`` dict.

    Handles both enum and plain-string status values.
    """
    result: dict[str, int] = {}
    for status, count in rows:
        key = status.value if hasattr(status, "value") else str(status)
        result[key] = count
    return result


def merge_profit_trend(
    revenue_rows: list[Any],
    expense_rows: list[Any],
) -> list[dict[str, Any]]:
    """Merge daily revenue and expense rows into a sorted profit-trend list.

    Revenue rows must have ``.date`` and ``.revenue`` attributes.
    Expense rows must have ``.date`` and ``.expense`` attributes.

    Returns a list of ``{"date": "YYYY-MM-DD", "profit": float}`` sorted
    by date ascending.
    """
    trend_map: dict[str, dict[str, Any]] = {}

    for r in revenue_rows:
        d_str = str(r.date)
        trend_map[d_str] = {"date": d_str, "profit": float(r.revenue)}

    for e in expense_rows:
        d_str = str(e.date)
        if d_str in trend_map:
            trend_map[d_str]["profit"] -= float(e.expense)
        else:
            trend_map[d_str] = {"date": d_str, "profit": -float(e.expense)}

    return sorted(trend_map.values(), key=lambda x: x["date"])
