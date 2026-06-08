"""Waybill Tracking Read Model.

Pure projection functions that shape trip and waybill data into the
tracking-report row format.  No database queries — callers supply ORM
objects or ``SimpleNamespace`` stand-ins.
"""

from __future__ import annotations

from typing import Any

from .helpers import calc_durations, resolve_border_location


def _iso(dt: Any) -> str | None:
    """Format a datetime as ISO 8601 string, or None."""
    return dt.isoformat() if dt else None


def project_trip_row(
    trip: Any,
    go_waybill: Any,
    return_waybill: Any,
    truck: Any,
    driver: Any,
    trailer: Any,
    crossings: list[dict[str, Any]],
) -> dict[str, Any]:
    """Project a single trip into a tracking-report row dict.

    *crossings* is the pre-fetched list of border crossing dicts for this
    trip (from the bulk-fetch in the route adapter).
    """
    duration_days, return_duration_days = calc_durations(trip)

    return {
        # Unique key for frontend table
        "row_id": str(trip.id),
        # Trip status
        "trip_status": trip.status if trip else "Not Dispatched",
        # IDs
        "trip_id": str(trip.id),
        "trip_number": trip.trip_number,
        # Go waybill
        "waybill_id": str(go_waybill.id) if go_waybill else None,
        "waybill_number": go_waybill.waybill_number if go_waybill else None,
        "waybill_status": go_waybill.status if go_waybill else None,
        "client_name": go_waybill.client_name if go_waybill else None,
        "cargo_type": go_waybill.cargo_type if go_waybill else None,
        "cargo_weight": go_waybill.weight_kg if go_waybill else 0,
        "cargo_description": go_waybill.description if go_waybill else "",
        "origin": go_waybill.origin if go_waybill else "",
        "destination": go_waybill.destination if go_waybill else "",
        "risk_level": go_waybill.risk_level if go_waybill else "Low",
        # Return waybill
        "return_waybill_id": str(trip.return_waybill_id) if trip.return_waybill_id else None,
        "return_waybill_number": return_waybill.waybill_number if return_waybill else None,
        "return_waybill_status": return_waybill.status if return_waybill else None,
        "return_client_name": return_waybill.client_name if return_waybill else None,
        "return_cargo_type": return_waybill.cargo_type if return_waybill else None,
        "return_cargo_weight": return_waybill.weight_kg if return_waybill else None,
        "return_origin": return_waybill.origin if return_waybill else None,
        "return_destination": return_waybill.destination if return_waybill else None,
        "return_cargo_description": return_waybill.description if return_waybill else None,
        # Assets
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
        "border_location": resolve_border_location(crossings, trip.status),
        # Duration
        "duration_days": duration_days,
        "return_duration_days": return_duration_days,
        # Meta
        "start_date": _iso(trip.start_date),
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
        "is_delayed": trip.is_delayed,
        # Border crossings
        "border_crossings": crossings,
    }


def project_unlinked_waybill_row(waybill: Any) -> dict[str, Any]:
    """Project an open waybill (not yet dispatched) into a tracking-report row."""
    return {
        "row_id": str(waybill.id),
        "trip_status": "Not Dispatched",
        "trip_id": None,
        "trip_number": None,
        "waybill_id": str(waybill.id),
        "waybill_number": waybill.waybill_number,
        "waybill_status": waybill.status,
        "client_name": waybill.client_name,
        "cargo_type": waybill.cargo_type,
        "cargo_weight": waybill.weight_kg,
        "cargo_description": waybill.description,
        "origin": waybill.origin,
        "destination": waybill.destination,
        "risk_level": waybill.risk_level,
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
        "is_delayed": False,
        "border_crossings": [],
    }
