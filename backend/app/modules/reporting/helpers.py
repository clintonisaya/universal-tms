"""Shared constants and pure calculation helpers for Reporting Read Models.

These functions are stateless and testable without a database.  They centralise
currency normalisation, duration calculation, revenue-date attribution,
border-location resolution, and the approved-expense / active-trip status lists
that every report needs.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Status constants
# ---------------------------------------------------------------------------

# Trip statuses whose waybill revenue should be counted.
# Covers the full go-leg and return-leg lifecycle, plus end states.
ACTIVE_TRIP_STATUSES: list[str] = [
    "Arrived at Loading Point",
    "Loading",
    "Loaded",
    "In Transit",
    "At Border",
    "Arrived at Destination",
    "Offloading",
    "Offloaded",
    "Returning Empty",
    "Dispatched (Return)",
    "Arrived at Loading Point (Return)",
    "Loading (Return)",
    "Loaded (Return)",
    "In Transit (Return)",
    "At Border (Return)",
    "Arrived at Destination (Return)",
    "Offloading (Return)",
    "Offloaded (Return)",
    "Arrived at Yard",
    "Waiting for PODs",
    "Completed",
]

# Expense statuses that count as "approved" for financial reporting.
APPROVED_EXPENSE_STATUSES: list[str] = [
    "Pending Finance",
    "Paid",
]

# Closed trip statuses used to exclude expenses linked to finished trips.
CLOSED_TRIP_STATUSES: list[str] = [
    "Completed",
    "Cancelled",
]

# Trip statuses where the truck has been offloaded or the journey is finished.
# Used to count "trucks in transit" — trucks with a waybill that have NOT
# reached any of these statuses are considered still in transit.
FINISHED_TRIP_STATUSES: list[str] = [
    "Offloaded",
    "Offloaded (Return)",
    "Arrived at Yard",
    "Waiting for PODs",
    "Completed",
    "Cancelled",
]

# All known expense categories for display completeness.
ALL_EXPENSE_CATEGORIES: list[str] = [
    "Fuel",
    "Allowance",
    "Maintenance",
    "Office",
    "Border",
    "Other",
]

# ---------------------------------------------------------------------------
# Currency normalisation
# ---------------------------------------------------------------------------

def normalize_to_tzs(
    amount: Decimal,
    currency: str,
    exchange_rate: Decimal | None,
    default_rate: Decimal,
) -> Decimal:
    """Convert an amount to TZS.

    If the amount is already TZS it is returned unchanged.  For foreign
    currencies the stored *exchange_rate* is used when it is a realistic value
    (> 1); otherwise *default_rate* is the fallback.  This mirrors the
    frontend ``resolveRate()`` guard (``if (ownRate && ownRate > 1)``).
    """
    if currency == "TZS":
        return amount
    rate = exchange_rate if (exchange_rate and exchange_rate > Decimal("1")) else default_rate
    return amount * rate


# ---------------------------------------------------------------------------
# Duration helpers
# ---------------------------------------------------------------------------

def calc_trip_duration_days(trip: Any) -> int:
    """Return the go-leg duration in days (minimum 1).

    Prefers the stored ``trip_duration_days`` (authoritative, set at
    completion).  Falls back to dispatch_date > start_date > created_at
    through arrival_return_date > end_date > now.
    """
    if trip.trip_duration_days is not None:
        return max(1, trip.trip_duration_days)

    start = trip.dispatch_date or trip.start_date or trip.created_at
    if not start:
        return 1
    end = trip.arrival_return_date or trip.end_date or datetime.now(timezone.utc)
    start = _ensure_utc(start)
    end = _ensure_utc(end)
    return max(1, (end - start).days + 1)


def calc_return_duration_days(trip: Any) -> int:
    """Return the return-leg duration in days (0 when no return leg)."""
    if not trip.return_waybill_id or not trip.dispatch_return_date:
        return 0
    ret_start = _ensure_utc(trip.dispatch_return_date)
    ret_end = _ensure_utc(trip.arrival_return_date or datetime.now(timezone.utc))
    return max(1, (ret_end - ret_start).days + 1)


def calc_durations(trip: Any) -> tuple[int, int]:
    """Convenience wrapper returning ``(go_days, return_days)``."""
    return calc_trip_duration_days(trip), calc_return_duration_days(trip)


# ---------------------------------------------------------------------------
# Revenue-date attribution
# ---------------------------------------------------------------------------

def revenue_date(trip: Any) -> datetime | None:
    """Pick the best revenue-recognition date for a trip.

    Preference order: dispatch_date > end_date > created_at.
    """
    return trip.dispatch_date or trip.end_date or trip.created_at


# ---------------------------------------------------------------------------
# Border-location resolution
# ---------------------------------------------------------------------------

def resolve_border_location(
    crossings: list[dict[str, Any]],
    trip_status: str,
) -> str | None:
    """Derive the display border location from actual crossing records.

    Only returns a value when the trip is at/near a border.  Prefers the
    first GO crossing with ``arrived_side_a_at`` recorded; falls back to
    the first planned GO crossing; returns ``None`` when not at a border.
    """
    at_border = trip_status in ("At Border", "At Border (Return)")
    if not at_border:
        return None

    go_crossings = [c for c in crossings if c.get("direction") == "go"]
    for c in go_crossings:
        if c.get("arrived_side_a_at"):
            return c.get("border_display_name") or "\u2014"
    if go_crossings:
        return go_crossings[0].get("border_display_name") or "\u2014"
    return "\u2014"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _ensure_utc(dt: datetime) -> datetime:
    """Attach UTC tzinfo if the datetime is naive."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
