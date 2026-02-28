"use client";

import { Tag } from "antd";
import type { TripStatus } from "@/types/trip";

const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  Waiting: "default",
  Dispatched: "purple",
  "Arrived at Loading Point": "lime",
  Loading: "gold",
  Loaded: "gold",
  "In Transit": "processing",
  "At Border": "purple",
  "Arrived at Destination": "processing",
  Offloading: "cyan",
  Offloaded: "cyan",
  "Returning Empty": "processing",
  "Waiting (Return)": "lime",
  "Dispatched (Return)": "purple",
  "Arrived at Loading Point (Return)": "lime",
  "Loading (Return)": "gold",
  "Loaded (Return)": "gold",
  "In Transit (Return)": "processing",
  "At Border (Return)": "purple",
  "Arrived at Destination (Return)": "processing",
  "Offloading (Return)": "cyan",
  "Offloaded (Return)": "cyan",
  "Arrived at Yard": "geekblue",
  "Waiting for PODs": "warning",
  Completed: "success",
  Cancelled: "error",
};

export function TripStatusTag({ status }: { status: TripStatus }) {
  return <Tag color={TRIP_STATUS_COLORS[status] ?? "default"}>{status}</Tag>;
}
