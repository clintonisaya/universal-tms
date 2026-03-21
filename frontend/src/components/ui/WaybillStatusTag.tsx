"use client";

import { StatusBadge, type ColorKey } from "./StatusBadge";
import type { WaybillStatus } from "@/types/waybill";

const WAYBILL_STATUS_COLOR_KEYS: Record<WaybillStatus, ColorKey> = {
  Open:          "gray",
  "In Progress": "orange",
  Completed:     "green",
  Invoiced:      "cyan",
};

export function WaybillStatusTag({ status }: { status: WaybillStatus }) {
  return (
    <StatusBadge
      status={status}
      colorKey={WAYBILL_STATUS_COLOR_KEYS[status] ?? "gray"}
    />
  );
}
