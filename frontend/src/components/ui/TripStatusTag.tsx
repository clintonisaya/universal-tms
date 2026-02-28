"use client";

import { Tag } from "antd";
import type { TripStatus } from "@/types/trip";

const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  Waiting: "default",
  Dispatch: "purple",
  "Wait to Load": "lime",
  Loading: "gold",
  "In Transit": "processing",
  "At Border": "purple",
  Offloading: "cyan",
  Offloaded: "cyan",
  "On Way Return": "processing",
  "Waiting (Return)": "lime",
  "Dispatch (Return)": "purple",
  "Wait to Load (Return)": "lime",
  "Loading (Return)": "gold",
  "In Transit (Return)": "processing",
  "At Border (Return)": "purple",
  "Offloading (Return)": "cyan",
  Returned: "geekblue",
  "Waiting for PODs": "warning",
  Completed: "success",
  Cancelled: "error",
};

export function TripStatusTag({ status }: { status: TripStatus }) {
  return <Tag color={TRIP_STATUS_COLORS[status] ?? "default"}>{status}</Tag>;
}
