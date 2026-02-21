"use client";

import { Tag } from "antd";
import type { WaybillStatus } from "@/types/waybill";

const WAYBILL_STATUS_COLORS: Record<WaybillStatus, string> = {
  Open: "default",
  "In Progress": "processing",
  Completed: "success",
  Invoiced: "geekblue",
};

export function WaybillStatusTag({ status }: { status: WaybillStatus }) {
  return <Tag color={WAYBILL_STATUS_COLORS[status]}>{status}</Tag>;
}
