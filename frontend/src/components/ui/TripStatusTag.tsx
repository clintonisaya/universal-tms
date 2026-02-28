"use client";

import { Tag } from "antd";
import type { TripStatus } from "@/types/trip";

const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  Waiting: "default",
  Dispatched: "purple",
  "Waiting for Loading": "lime",
  Loading: "gold",
  "In Transit": "processing",
  "At Border": "purple",
  Offloading: "cyan",
  Offloaded: "cyan",
  "Returning to Yard": "processing",
  "Waiting (Return)": "lime",
  "Dispatched (Return)": "purple",
  "Waiting for Loading (Return)": "lime",
  "Loading (Return)": "gold",
  "In Transit (Return)": "processing",
  "At Border (Return)": "purple",
  "Offloading (Return)": "cyan",
  "Arrived at Yard": "geekblue",
  "Waiting for PODs": "warning",
  Completed: "success",
  Cancelled: "error",
};

export function TripStatusTag({ status }: { status: TripStatus }) {
  return <Tag color={TRIP_STATUS_COLORS[status] ?? "default"}>{status}</Tag>;
}
