from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from app.models import (
    Driver,
    DriverStatus,
    Trailer,
    TrailerStatus,
    TripStatus,
    Truck,
    TruckStatus,
    WaybillStatus,
)

CLOSED_STATUSES = {TripStatus.completed, TripStatus.cancelled}

RETURN_LEG_STATUSES = {
    TripStatus.waiting_return,
    TripStatus.dispatch_return,
    TripStatus.wait_to_load_return,
    TripStatus.loading_return,
    TripStatus.loaded_return,
    TripStatus.in_transit_return,
    TripStatus.at_border_return,
    TripStatus.arrived_at_destination_return,
    TripStatus.offloading_return,
    TripStatus.offloaded_return,
}

RETURN_LEG_STATUS_ORDER = [
    TripStatus.waiting_return,
    TripStatus.dispatch_return,
    TripStatus.wait_to_load_return,
    TripStatus.loading_return,
    TripStatus.loaded_return,
    TripStatus.in_transit_return,
    TripStatus.at_border_return,
    TripStatus.arrived_at_destination_return,
    TripStatus.offloading_return,
    TripStatus.offloaded_return,
]

TRIP_TO_TRUCK_STATUS = {
    TripStatus.waiting: TruckStatus.waiting,
    TripStatus.dispatch: TruckStatus.dispatch,
    TripStatus.wait_to_load: TruckStatus.wait_to_load,
    TripStatus.loading: TruckStatus.loading,
    TripStatus.loaded: TruckStatus.loading,
    TripStatus.in_transit: TruckStatus.in_transit,
    TripStatus.at_border: TruckStatus.at_border,
    TripStatus.arrived_at_destination: TruckStatus.offloaded,
    TripStatus.offloading: TruckStatus.offloaded,
    TripStatus.offloaded: TruckStatus.offloaded,
    TripStatus.returning_empty: TruckStatus.in_transit,
    TripStatus.waiting_return: TruckStatus.offloaded,
    TripStatus.dispatch_return: TruckStatus.dispatch,
    TripStatus.wait_to_load_return: TruckStatus.wait_to_load,
    TripStatus.loading_return: TruckStatus.loading,
    TripStatus.loaded_return: TruckStatus.loading,
    TripStatus.in_transit_return: TruckStatus.in_transit,
    TripStatus.at_border_return: TruckStatus.at_border,
    TripStatus.arrived_at_destination_return: TruckStatus.offloaded,
    TripStatus.offloading_return: TruckStatus.offloaded,
    TripStatus.offloaded_return: TruckStatus.offloaded,
    TripStatus.returned: TruckStatus.returned,
    TripStatus.waiting_for_pods: TruckStatus.waiting_for_pods,
    TripStatus.completed: TruckStatus.idle,
    TripStatus.cancelled: TruckStatus.idle,
}

TRIP_TO_TRAILER_STATUS = {
    TripStatus.waiting: TrailerStatus.waiting,
    TripStatus.dispatch: TrailerStatus.dispatch,
    TripStatus.wait_to_load: TrailerStatus.wait_to_load,
    TripStatus.loading: TrailerStatus.loading,
    TripStatus.loaded: TrailerStatus.loading,
    TripStatus.in_transit: TrailerStatus.in_transit,
    TripStatus.at_border: TrailerStatus.at_border,
    TripStatus.arrived_at_destination: TrailerStatus.offloaded,
    TripStatus.offloading: TrailerStatus.offloaded,
    TripStatus.offloaded: TrailerStatus.offloaded,
    TripStatus.returning_empty: TrailerStatus.in_transit,
    TripStatus.waiting_return: TrailerStatus.offloaded,
    TripStatus.dispatch_return: TrailerStatus.dispatch,
    TripStatus.wait_to_load_return: TrailerStatus.wait_to_load,
    TripStatus.loading_return: TrailerStatus.loading,
    TripStatus.loaded_return: TrailerStatus.loading,
    TripStatus.in_transit_return: TrailerStatus.in_transit,
    TripStatus.at_border_return: TrailerStatus.at_border,
    TripStatus.arrived_at_destination_return: TrailerStatus.offloaded,
    TripStatus.offloading_return: TrailerStatus.offloaded,
    TripStatus.offloaded_return: TrailerStatus.offloaded,
    TripStatus.returned: TrailerStatus.returned,
    TripStatus.waiting_for_pods: TrailerStatus.waiting_for_pods,
    TripStatus.completed: TrailerStatus.idle,
    TripStatus.cancelled: TrailerStatus.idle,
}

TRIP_TO_GO_WAYBILL_STATUS = {
    TripStatus.waiting: WaybillStatus.open,
    TripStatus.dispatch: WaybillStatus.in_progress,
    TripStatus.wait_to_load: WaybillStatus.in_progress,
    TripStatus.loading: WaybillStatus.in_progress,
    TripStatus.loaded: WaybillStatus.in_progress,
    TripStatus.in_transit: WaybillStatus.in_progress,
    TripStatus.at_border: WaybillStatus.in_progress,
    TripStatus.arrived_at_destination: WaybillStatus.in_progress,
    TripStatus.offloading: WaybillStatus.in_progress,
    TripStatus.offloaded: WaybillStatus.completed,
    TripStatus.returning_empty: WaybillStatus.completed,
    TripStatus.waiting_return: WaybillStatus.completed,
    TripStatus.dispatch_return: WaybillStatus.completed,
    TripStatus.wait_to_load_return: WaybillStatus.completed,
    TripStatus.loading_return: WaybillStatus.completed,
    TripStatus.loaded_return: WaybillStatus.completed,
    TripStatus.in_transit_return: WaybillStatus.completed,
    TripStatus.at_border_return: WaybillStatus.completed,
    TripStatus.arrived_at_destination_return: WaybillStatus.completed,
    TripStatus.offloading_return: WaybillStatus.completed,
    TripStatus.offloaded_return: WaybillStatus.completed,
    TripStatus.returned: WaybillStatus.completed,
    TripStatus.waiting_for_pods: WaybillStatus.completed,
    TripStatus.completed: WaybillStatus.completed,
    TripStatus.cancelled: WaybillStatus.open,
}

TRIP_TO_RETURN_WAYBILL_STATUS = {
    TripStatus.waiting_return: WaybillStatus.open,
    TripStatus.dispatch_return: WaybillStatus.in_progress,
    TripStatus.wait_to_load_return: WaybillStatus.in_progress,
    TripStatus.loading_return: WaybillStatus.in_progress,
    TripStatus.loaded_return: WaybillStatus.in_progress,
    TripStatus.in_transit_return: WaybillStatus.in_progress,
    TripStatus.at_border_return: WaybillStatus.in_progress,
    TripStatus.arrived_at_destination_return: WaybillStatus.in_progress,
    TripStatus.offloading_return: WaybillStatus.in_progress,
    TripStatus.offloaded_return: WaybillStatus.completed,
    TripStatus.returned: WaybillStatus.completed,
    TripStatus.waiting_for_pods: WaybillStatus.completed,
    TripStatus.completed: WaybillStatus.completed,
    TripStatus.cancelled: WaybillStatus.open,
}

_NON_TERMINAL_VALUES: list[str] = [
    TripStatus.waiting.value,
    TripStatus.dispatch.value,
    TripStatus.wait_to_load.value,
    TripStatus.loading.value,
    TripStatus.loaded.value,
    TripStatus.in_transit.value,
    TripStatus.at_border.value,
    TripStatus.arrived_at_destination.value,
    TripStatus.offloading.value,
    TripStatus.offloaded.value,
    TripStatus.returning_empty.value,
    TripStatus.returned.value,
    TripStatus.waiting_for_pods.value,
    TripStatus.waiting_return.value,
    TripStatus.dispatch_return.value,
    TripStatus.wait_to_load_return.value,
    TripStatus.loading_return.value,
    TripStatus.loaded_return.value,
    TripStatus.in_transit_return.value,
    TripStatus.at_border_return.value,
    TripStatus.arrived_at_destination_return.value,
    TripStatus.offloading_return.value,
    TripStatus.offloaded_return.value,
]

VALID_TRANSITIONS: dict[str, list[str]] = {
    TripStatus.waiting.value: [
        TripStatus.dispatch.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.dispatch.value: [
        TripStatus.wait_to_load.value,
        TripStatus.waiting.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.wait_to_load.value: [
        TripStatus.loading.value,
        TripStatus.dispatch.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.loading.value: [
        TripStatus.in_transit.value,
        TripStatus.wait_to_load.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.loaded.value: [
        TripStatus.in_transit.value,
        TripStatus.loading.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.in_transit.value: [
        TripStatus.at_border.value,
        TripStatus.arrived_at_destination.value,
        TripStatus.loaded.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.at_border.value: [
        TripStatus.in_transit.value,
        TripStatus.arrived_at_destination.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.arrived_at_destination.value: [
        TripStatus.offloading.value,
        TripStatus.at_border.value,
        TripStatus.in_transit.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.offloading.value: [
        TripStatus.returning_empty.value,
        TripStatus.arrived_at_destination.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.offloaded.value: [
        TripStatus.returning_empty.value,
        TripStatus.waiting_return.value,
        TripStatus.offloading.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.returning_empty.value: [
        TripStatus.returned.value,
        TripStatus.offloaded.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.returned.value: [
        TripStatus.waiting_for_pods.value,
        TripStatus.waiting_return.value,
        TripStatus.returning_empty.value,
        TripStatus.offloaded_return.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.waiting_for_pods.value: [
        TripStatus.completed.value,
        TripStatus.returned.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.completed.value: [],
    TripStatus.cancelled.value: [],
    TripStatus.breakdown.value: _NON_TERMINAL_VALUES,
    TripStatus.waiting_return.value: [
        TripStatus.dispatch_return.value,
        TripStatus.returned.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.dispatch_return.value: [
        TripStatus.wait_to_load_return.value,
        TripStatus.waiting_return.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.wait_to_load_return.value: [
        TripStatus.loading_return.value,
        TripStatus.dispatch_return.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.loading_return.value: [
        TripStatus.in_transit_return.value,
        TripStatus.wait_to_load_return.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.loaded_return.value: [
        TripStatus.in_transit_return.value,
        TripStatus.loading_return.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.in_transit_return.value: [
        TripStatus.at_border_return.value,
        TripStatus.arrived_at_destination_return.value,
        TripStatus.loaded_return.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.at_border_return.value: [
        TripStatus.in_transit_return.value,
        TripStatus.arrived_at_destination_return.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.arrived_at_destination_return.value: [
        TripStatus.offloading_return.value,
        TripStatus.at_border_return.value,
        TripStatus.in_transit_return.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.offloading_return.value: [
        TripStatus.returned.value,
        TripStatus.arrived_at_destination_return.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
    TripStatus.offloaded_return.value: [
        TripStatus.returned.value,
        TripStatus.offloading_return.value,
        TripStatus.breakdown.value,
        TripStatus.cancelled.value,
    ],
}


class TransportJourneyError(ValueError):
    detail: str

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class InvalidTransitionError(TransportJourneyError):
    pass


class ReturnWaybillRequiredError(TransportJourneyError):
    def __init__(self) -> None:
        super().__init__(
            "Return waybill must be attached before updating to return leg statuses"
        )


@dataclass(frozen=True)
class StatusUpdatePlan:
    status: TripStatus
    update_values: dict[str, Any]


def coerce_trip_status(status: TripStatus | str) -> TripStatus:
    if isinstance(status, TripStatus):
        return status
    return TripStatus(status)


def is_reopen_transition(current: TripStatus | str, requested: TripStatus | str) -> bool:
    current_status = coerce_trip_status(current)
    requested_status = coerce_trip_status(requested)
    return current_status in CLOSED_STATUSES and requested_status not in CLOSED_STATUSES


def validate_status_transition(
    current: TripStatus | str,
    requested: TripStatus | str,
) -> None:
    current_status = coerce_trip_status(current)
    requested_status = coerce_trip_status(requested)
    if current_status == requested_status:
        return

    allowed = VALID_TRANSITIONS.get(current_status.value)
    if allowed is None:
        return
    if requested_status.value not in allowed:
        raise InvalidTransitionError(
            f"Invalid status transition from '{current_status.value}' to '{requested_status.value}'"
        )


def apply_auto_advance(
    requested_status: TripStatus | str,
    update_values: dict[str, Any],
) -> TripStatus:
    status = coerce_trip_status(requested_status)
    if status == TripStatus.loading and update_values.get("loading_end_date"):
        return TripStatus.loaded
    if status == TripStatus.loading_return and update_values.get(
        "loading_return_end_date"
    ):
        return TripStatus.loaded_return
    if status == TripStatus.offloading and update_values.get("offloading_date"):
        return TripStatus.offloaded
    if status == TripStatus.offloading_return and update_values.get(
        "offloading_return_date"
    ):
        return TripStatus.offloaded_return
    if status in (
        TripStatus.returning_empty,
        TripStatus.offloaded_return,
        TripStatus.returned,
    ) and update_values.get("arrival_return_date"):
        return TripStatus.waiting_for_pods
    if status == TripStatus.waiting_for_pods and update_values.get(
        "pods_confirmed_date"
    ):
        return TripStatus.completed
    return status


def plan_status_update(
    *,
    current_status: TripStatus | str,
    requested_status: TripStatus | str,
    update_values: dict[str, Any],
    has_return_waybill: bool,
) -> StatusUpdatePlan:
    current = coerce_trip_status(current_status)
    requested = coerce_trip_status(requested_status)
    if not is_reopen_transition(current, requested):
        validate_status_transition(current, requested)

    values = dict(update_values)
    planned_status = apply_auto_advance(requested, values)
    values["status"] = planned_status.value

    if planned_status in RETURN_LEG_STATUSES and not has_return_waybill:
        raise ReturnWaybillRequiredError()

    return StatusUpdatePlan(status=planned_status, update_values=values)


def apply_status_date_effects(
    *,
    status: TripStatus | str,
    update_values: dict[str, Any],
    existing_dispatch_date: datetime | None = None,
    existing_arrival_return_date: datetime | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    status = coerce_trip_status(status)
    current_time = now or datetime.now(timezone.utc)
    values = dict(update_values)

    if status == TripStatus.dispatch:
        dispatch_dt = values.get("dispatch_date")
        if dispatch_dt:
            values["start_date"] = dispatch_dt

    if status == TripStatus.dispatch_return and "dispatch_return_date" not in values:
        values["dispatch_return_date"] = current_time.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

    if status == TripStatus.completed:
        values["end_date"] = current_time
        dispatch_dt = values.get("dispatch_date") or existing_dispatch_date
        return_dt = values.get("arrival_return_date") or existing_arrival_return_date
        if dispatch_dt and return_dt:
            dispatch_date = (
                dispatch_dt.date() if hasattr(dispatch_dt, "date") else dispatch_dt
            )
            return_date = return_dt.date() if hasattr(return_dt, "date") else return_dt
            values["trip_duration_days"] = (return_date - dispatch_date).days
    elif status == TripStatus.waiting:
        values["end_date"] = None

    values["updated_at"] = current_time
    return values


def is_truck_available(truck: Truck) -> bool:
    return truck.status in (TruckStatus.idle, TruckStatus.offloaded)


def is_trailer_available(trailer: Trailer) -> bool:
    return trailer.status in (TrailerStatus.idle, TrailerStatus.offloaded)


def is_driver_available(driver: Driver) -> bool:
    return driver.status == DriverStatus.active


def truck_status_for_trip(status: TripStatus | str) -> TruckStatus | None:
    return TRIP_TO_TRUCK_STATUS.get(coerce_trip_status(status))


def trailer_status_for_trip(status: TripStatus | str) -> TrailerStatus | None:
    return TRIP_TO_TRAILER_STATUS.get(coerce_trip_status(status))


def driver_status_for_trip(status: TripStatus | str) -> DriverStatus | None:
    status = coerce_trip_status(status)
    if status in (TripStatus.in_transit, TripStatus.in_transit_return):
        return DriverStatus.on_trip
    if status in (TripStatus.completed, TripStatus.cancelled):
        return DriverStatus.active
    return None


def go_waybill_status_for_trip(status: TripStatus | str) -> WaybillStatus | None:
    return TRIP_TO_GO_WAYBILL_STATUS.get(coerce_trip_status(status))


def return_waybill_status_for_trip(status: TripStatus | str) -> WaybillStatus | None:
    return TRIP_TO_RETURN_WAYBILL_STATUS.get(coerce_trip_status(status))


def active_go_waybill_status_for_attached_trip(
    status: TripStatus | str,
) -> WaybillStatus:
    trip_status = coerce_trip_status(status)
    mapped_status = go_waybill_status_for_trip(trip_status) or WaybillStatus.in_progress
    if mapped_status == WaybillStatus.open and trip_status != TripStatus.cancelled:
        return WaybillStatus.in_progress
    return mapped_status


def border_departure_auto_status(
    current_status: TripStatus | str,
    direction: str,
) -> TripStatus | None:
    status = coerce_trip_status(current_status)
    if status == TripStatus.at_border and direction == "go":
        return TripStatus.in_transit
    if status == TripStatus.at_border_return and direction == "return":
        return TripStatus.in_transit_return
    return None


def trip_status_metadata() -> dict[str, Any]:
    return {
        "valid_next_statuses": VALID_TRANSITIONS,
        "all_return_statuses": [status.value for status in RETURN_LEG_STATUS_ORDER],
        "closed_statuses": [
            TripStatus.completed.value,
            TripStatus.cancelled.value,
        ],
    }
