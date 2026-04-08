"use client";

import { StatusBadge, type ColorKey } from "./StatusBadge";
import type { TripStatus } from "@/types/trip";

const TRIP_STATUS_COLOR_KEYS: Record<TripStatus, ColorKey> = {
  Waiting:                              "gray",
  Dispatched:                           "blue",
  "Arrived at Loading Point":           "orange",
  Loading:                              "orange",
  Loaded:                               "orange",
  "In Transit":                         "blue",
  "At Border":                          "orange",
  "Arrived at Destination":             "cyan",
  Offloading:                           "cyan",
  Offloaded:                            "cyan",
  "Returning Empty":                    "blue",
  Breakdown:                            "red",
  "Waiting (Return)":                   "blue",
  "Dispatched (Return)":                "blue",
  "Arrived at Loading Point (Return)":  "orange",
  "Loading (Return)":                   "orange",
  "Loaded (Return)":                    "orange",
  "In Transit (Return)":                "blue",
  "At Border (Return)":                 "orange",
  "Arrived at Destination (Return)":    "cyan",
  "Offloading (Return)":                "cyan",
  "Offloaded (Return)":                 "cyan",
  "Arrived at Yard":                    "cyan",
  "Waiting for PODs":                   "orange",
  Completed:                            "green",
  Cancelled:                            "red",
};

interface TripStatusTagProps {
  status: TripStatus;
  isDelayed?: boolean;
}

export function TripStatusTag({ status, isDelayed }: TripStatusTagProps) {
  const badge = (
    <StatusBadge
      status={status}
      colorKey={TRIP_STATUS_COLOR_KEYS[status] ?? "gray"}
    />
  );

  // P2: avoid unnecessary wrapper when there is no delayed badge
  if (!isDelayed) return badge;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {badge}
      <StatusBadge status="Delayed" colorKey="orange" />
    </span>
  );
}
