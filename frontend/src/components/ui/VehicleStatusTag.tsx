"use client";

import { StatusBadge, type ColorKey } from "./StatusBadge";

const VEHICLE_STATUS_COLOR_KEYS: Record<string, ColorKey> = {
  Idle:               "gray",
  Loading:            "orange",
  "In Transit":       "blue",
  "At Border":        "orange",
  Offloaded:          "cyan",
  Returned:           "gray",
  "Waiting for PODs": "orange",
  Maintenance:        "orange",
};

export function VehicleStatusTag({ status }: { status: string }) {
  // P4: guard against null/undefined from API before status is populated
  if (!status) return null;
  return (
    <StatusBadge
      status={status}
      colorKey={VEHICLE_STATUS_COLOR_KEYS[status] ?? "gray"}
    />
  );
}
