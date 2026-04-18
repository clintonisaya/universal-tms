"use client";

import { StatusBadge, type ColorKey } from "./StatusBadge";
import { getWaybillProgressStatus, type WaybillProgressStatus, type WaybillStatus } from "@/types/waybill";

const WAYBILL_STATUS_COLOR_KEYS: Record<WaybillProgressStatus, ColorKey> = {
  Open:          "gray",
  "In Progress": "orange",
  Completed:     "green",
};

export function WaybillStatusTag({ status }: { status: WaybillStatus }) {
  const progressStatus = getWaybillProgressStatus(status);

  return (
    <StatusBadge
      status={progressStatus}
      colorKey={WAYBILL_STATUS_COLOR_KEYS[progressStatus] ?? "gray"}
    />
  );
}
