"use client";

import { Divider, Steps, Collapse, Timeline, Typography } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { TripStatus, Trip } from "@/types/trip";
import {
  STATUS_ORDER,
  TRIP_PIPELINE_STEPS,
} from "@/constants/tripStatuses";

const { Text } = Typography;

// Map any TripStatus to its nearest pipeline step index
function getPipelineStepIndex(status: TripStatus | undefined): number {
  if (!status) return 0;
  if (status === "Breakdown") return 0;
  const direct = TRIP_PIPELINE_STEPS.indexOf(status);
  if (direct >= 0) return direct;
  if (["Dispatched", "Arrived at Loading Point", "At Border", "Arrived at Destination", "Loaded"].includes(status)) return 2;
  if (["Offloaded", "Returning Empty", "Waiting (Return)"].includes(status)) return 3;
  if ([
    "Dispatched (Return)", "Arrived at Loading Point (Return)", "Loading (Return)", "Loaded (Return)",
    "In Transit (Return)", "At Border (Return)", "Arrived at Destination (Return)",
    "Offloading (Return)", "Offloaded (Return)", "Arrived at Yard",
  ].includes(status)) return 4;
  return 0;
}

function getStatusDate(trip: Trip | null, status: TripStatus): string | null {
  if (!trip) return null;
  switch (status) {
    case "Waiting":                            return trip.created_at;
    case "Dispatched":                         return trip.dispatch_date;
    case "Arrived at Loading Point":           return trip.arrival_loading_date;
    case "Loading":                            return trip.loading_end_date;
    case "Loaded":                             return trip.loading_end_date;
    case "Arrived at Destination":             return trip.arrival_offloading_date;
    case "Offloading":                         return trip.offloading_date;
    case "Offloaded":                          return trip.offloading_date;
    case "Returning Empty":                    return trip.arrival_return_date;
    case "Dispatched (Return)":                return (trip as any).dispatch_return_date;
    case "Arrived at Loading Point (Return)":  return (trip as any).arrival_loading_return_date;
    case "Loading (Return)":                   return (trip as any).loading_return_end_date;
    case "Loaded (Return)":                    return (trip as any).loading_return_end_date;
    case "Arrived at Destination (Return)":    return (trip as any).arrival_destination_return_date;
    case "Offloading (Return)":                return (trip as any).offloading_return_date;
    case "Offloaded (Return)":                 return (trip as any).offloading_return_date;
    case "Arrived at Yard":                    return trip.arrival_return_date;
    case "Completed":                          return trip.end_date;
    default:                                   return null;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return dayjs(dateStr).format("DD/MM/YYYY");
}

interface StatusTimelineProps {
  currentStatus: TripStatus | undefined;
  tripData: Trip | null;
}

export function StatusTimeline({ currentStatus, tripData }: StatusTimelineProps) {
  // Build timeline items
  const currentIdx = STATUS_ORDER.indexOf(currentStatus as TripStatus);
  const timelineItems: any[] = [];

  for (let i = 0; i <= currentIdx && i < STATUS_ORDER.length; i++) {
    const status = STATUS_ORDER[i];
    const date = getStatusDate(tripData, status);
    const isCompleted = i < currentIdx || (i === currentIdx && currentStatus !== "Waiting");

    let extraDates = "";
    if (status === "Loading" && tripData && (tripData as any).loading_start_date) {
      extraDates = `Started: ${formatDate((tripData as any).loading_start_date)}`;
    }
    if (status === "Offloading" && tripData && tripData.arrival_offloading_date) {
      extraDates = `Arrival: ${formatDate(tripData.arrival_offloading_date)}`;
    }

    timelineItems.push({
      icon: isCompleted ? (
        <CheckCircleOutlined style={{ fontSize: 14, color: "var(--color-green)" }} />
      ) : (
        <ClockCircleOutlined style={{ fontSize: 14, color: "var(--color-orange)" }} />
      ),
      content: (
        <div>
          <Text strong style={{ fontSize: "var(--font-sm)" }}>{status}</Text>
          {date && (
            <Text type="secondary" style={{ display: "block" }}>
              {formatDate(date)}
            </Text>
          )}
          {extraDates && (
            <Text type="secondary" style={{ display: "block" }}>
              {extraDates}
            </Text>
          )}
        </div>
      ),
    });
  }

  // Trip duration
  let tripDuration: string | null = null;
  if (tripData) {
    const dispatch = tripData.dispatch_date;
    const dispatchReturn = (tripData as any).dispatch_return_date;
    const returnDate = tripData.arrival_return_date;

    let overall: string | null = null;
    if (dispatch) {
      const end = returnDate || dayjs().format("YYYY-MM-DD");
      const days = dayjs(end).diff(dayjs(dispatch), "day");
      overall = `${days}d overall`;
    } else if (tripData.trip_duration_days != null) {
      overall = `${tripData.trip_duration_days}d overall`;
    }

    let returnLeg: string | null = null;
    if (dispatchReturn && tripData.return_waybill_id) {
      const end = returnDate || dayjs().format("YYYY-MM-DD");
      const days = dayjs(end).diff(dayjs(dispatchReturn), "day");
      returnLeg = `${days}d return`;
    }

    if (overall && returnLeg) tripDuration = `${overall} · ${returnLeg}`;
    else tripDuration = overall;
  }

  return (
    <>
      {/* Pipeline steps indicator */}
      <Steps
        size="small"
        current={getPipelineStepIndex(currentStatus)}
        status={currentStatus === "Cancelled" || currentStatus === "Breakdown" ? "error" : "process"}
        style={{ marginBottom: 16 }}
        items={TRIP_PIPELINE_STEPS.map((s, i) => {
          const idx = getPipelineStepIndex(currentStatus);
          return {
            title: s,
            status: (currentStatus === "Cancelled" || currentStatus === "Breakdown") && i === idx
              ? "error"
              : i < idx
                ? "finish"
                : i === idx
                  ? "process"
                  : "wait",
          };
        })}
      />
      <Divider style={{ margin: "8px 0 12px" }} />

      {/* Status History Timeline */}
      {timelineItems.length > 0 && (
        <Collapse
          size="small"
          style={{ marginBottom: 12 }}
          items={[{
            key: "history",
            label: (
              <span>
                <Text strong style={{ fontSize: "var(--font-sm)" }}>Status History</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({timelineItems.length} entries{tripDuration ? ` · ${tripDuration}` : ""})
                </Text>
              </span>
            ),
            children: (
              <div style={{ maxHeight: 220, overflowY: "auto", paddingRight: 4 }}>
                <Timeline items={timelineItems} style={{ paddingTop: 8 }} />
              </div>
            ),
          }]}
        />
      )}
    </>
  );
}
