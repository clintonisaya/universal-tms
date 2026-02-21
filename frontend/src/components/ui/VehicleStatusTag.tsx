"use client";

import { Tag } from "antd";

const VEHICLE_STATUS_COLORS: Record<string, string> = {
  Idle: "success",
  Loading: "cyan",
  "In Transit": "processing",
  "At Border": "gold",
  Offloaded: "purple",
  Returned: "default",
  "Waiting for PODs": "warning",
  Maintenance: "warning",
};

export function VehicleStatusTag({ status }: { status: string }) {
  return <Tag color={VEHICLE_STATUS_COLORS[status] ?? "default"}>{status}</Tag>;
}
