"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  Space,
  message,
  Divider,
  Row,
  Col,
  Alert,
  DatePicker,
  Timeline,
  Typography,
  Steps,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { TripUpdate, TripStatus, Trip } from "@/types/trip";
import type { Country } from "@/types/location";

const { Text } = Typography;

// Go leg statuses — only shown when no return waybill attached
const GO_STATUSES: TripStatus[] = [
  "Dispatch",
  "Wait to Load",
  "Loading",
  "In Transit",
  "At Border",
  "Offloading",
  // "Offloaded" is auto-set when offloading_date is filled — not manually selectable
  "On Way Return",
];

// Return leg statuses — only shown when return_waybill_id is set
const RETURN_STATUSES: TripStatus[] = [
  "Waiting (Return)",
  "Dispatch (Return)",
  "Wait to Load (Return)",
  "Loading (Return)",
  "In Transit (Return)",
  "At Border (Return)",
  "Offloading (Return)",
  // "On Way Return" is auto-set when offloading_return_date is filled — not manually selectable here
];

// Terminal statuses — always visible regardless of direction
const TERMINAL_STATUSES: TripStatus[] = [
  "Returned",
  // "Waiting for PODs" is auto-set when arrival_return_date is filled — not manually selectable
  "Completed",
  "Cancelled",
];

const CLOSED_STATUSES: TripStatus[] = ["Completed", "Cancelled"];

// Status order for timeline display — full lifecycle including return leg
const STATUS_ORDER: TripStatus[] = [
  "Waiting",
  "Dispatch",
  "Wait to Load",
  "Loading",
  "In Transit",
  "At Border",
  "Offloading",
  "Offloaded",
  "On Way Return",
  "Waiting (Return)",
  "Dispatch (Return)",
  "Wait to Load (Return)",
  "Loading (Return)",
  "In Transit (Return)",
  "At Border (Return)",
  "Offloading (Return)",
  "Returned",
  "Waiting for PODs",
  "Completed",
];

// Simplified pipeline for the Steps progress indicator (AC-2)
const TRIP_PIPELINE_STEPS: TripStatus[] = [
  "Waiting",
  "Loading",
  "In Transit",
  "Offloading",
  "Waiting for PODs",
  "Completed",
];

// Map any TripStatus to its nearest pipeline step index
function getPipelineStepIndex(status: TripStatus | undefined): number {
  if (!status) return 0;
  const direct = TRIP_PIPELINE_STEPS.indexOf(status);
  if (direct >= 0) return direct;
  // Map intermediate/return statuses to nearest pipeline step
  if (["Dispatch", "Wait to Load", "At Border"].includes(status)) return 2; // In Transit area
  if (["Offloaded", "On Way Return", "Waiting (Return)"].includes(status)) return 3; // Post-offloading pre-return
  if (["Dispatch (Return)", "Wait to Load (Return)", "Loading (Return)", "In Transit (Return)", "At Border (Return)", "Offloading (Return)", "Returned"].includes(status)) return 4; // Post-offloading
  return 0;
}

interface UpdateTripStatusModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tripId: string;
  initialValues?: Partial<TripUpdate & { status: string; return_waybill_id?: string | null }>;
}

// Helper to get the date label for a status from trip data
function getStatusDate(trip: Trip | null, status: TripStatus): string | null {
  if (!trip) return null;
  switch (status) {
    case "Waiting":      return trip.created_at;
    case "Dispatch":     return trip.dispatch_date;
    case "Wait to Load": return trip.arrival_loading_date;
    case "Loading":      return trip.loading_end_date;
    case "Offloading":   return trip.offloading_date;
    case "Offloaded":      return trip.offloading_date;
    case "On Way Return":  return trip.arrival_return_date;
    case "Dispatch (Return)":    return (trip as any).dispatch_return_date;
    case "Wait to Load (Return)": return (trip as any).arrival_loading_return_date;
    case "Loading (Return)":     return (trip as any).loading_return_end_date;
    case "Offloading (Return)":  return (trip as any).offloading_return_date;
    case "Returned":     return trip.arrival_return_date;
    case "Completed":    return trip.end_date;
    default:             return null;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return dayjs(dateStr).format("DD/MM/YYYY");
}

export function UpdateTripStatusModal({
  open,
  onClose,
  onSuccess,
  tripId,
  initialValues,
}: UpdateTripStatusModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TripStatus | null>(null);
  const [tripData, setTripData] = useState<Trip | null>(null);
  // Border crossing sub-form state (Story 2.26)
  const [nextBorder, setNextBorder] = useState<any | null>(null);
  const [existingCrossing, setExistingCrossing] = useState<any | null>(null);
  const [loadingBorder, setLoadingBorder] = useState(false);

  const currentStatus = initialValues?.status as TripStatus | undefined;
  const hasReturnWaybill = !!initialValues?.return_waybill_id;
  const isTripClosed = currentStatus && CLOSED_STATUSES.includes(currentStatus);
  const isReopening = isTripClosed && selectedStatus && !CLOSED_STATUSES.includes(selectedStatus);

  // Go leg: show go statuses + terminals. Return leg: show return statuses + terminals.
  const TRIP_STATUSES: TripStatus[] = hasReturnWaybill
    ? [...RETURN_STATUSES, ...TERMINAL_STATUSES]
    : [...GO_STATUSES, ...TERMINAL_STATUSES];

  useEffect(() => {
    if (open) {
      fetchResources();
      fetchTripData();
      form.resetFields();
      setNextBorder(null);
      setExistingCrossing(null);
      if (initialValues) {
        const location = initialValues.current_location || "";
        const parts = location.split(",").map((s) => s.trim());
        form.setFieldsValue({
          status: initialValues.status,
          city: parts[0] || "",
          country: parts.length > 1 ? parts.slice(1).join(", ") : "",
        });
        setSelectedStatus(initialValues.status as TripStatus);
        // If the trip is already at a border when the modal opens, load border data immediately
        if (initialValues.status === "At Border" || initialValues.status === "At Border (Return)") {
          fetchBorderData(initialValues.status as TripStatus);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues, form]);

  // Pre-fill dates when status changes or tripData loads
  useEffect(() => {
    if (selectedStatus && tripData) {
        const fields: any = {};
        
        if (selectedStatus === "Dispatch" && tripData.dispatch_date) {
            fields.dispatch_date = dayjs(tripData.dispatch_date);
        }
        if (selectedStatus === "Wait to Load" && tripData.arrival_loading_date) {
            fields.arrival_loading_date = dayjs(tripData.arrival_loading_date);
        }
        if (selectedStatus === "Loading") {
            if (tripData.loading_start_date) fields.loading_start_date = dayjs(tripData.loading_start_date);
            if (tripData.loading_end_date) fields.loading_end_date = dayjs(tripData.loading_end_date);
        }
        if (selectedStatus === "Offloading") {
            if (tripData.arrival_offloading_date) fields.arrival_offloading_date = dayjs(tripData.arrival_offloading_date);
            if (tripData.offloading_date) fields.offloading_date = dayjs(tripData.offloading_date);
        }
        if (selectedStatus === "Dispatch (Return)" && (tripData as any).dispatch_return_date) {
            fields.dispatch_return_date = dayjs((tripData as any).dispatch_return_date);
        }
        if ((selectedStatus === "On Way Return" || selectedStatus === "Returned") && tripData.arrival_return_date) {
            fields.arrival_return_date = dayjs(tripData.arrival_return_date);
        }
        if (selectedStatus === "Offloading (Return)" && (tripData as any).offloading_return_date) {
            fields.offloading_return_date = dayjs((tripData as any).offloading_return_date);
        }
        if (selectedStatus === "Wait to Load (Return)" && (tripData as any).arrival_loading_return_date) {
            fields.arrival_loading_return_date = dayjs((tripData as any).arrival_loading_return_date);
        }
        if (selectedStatus === "Loading (Return)") {
            if ((tripData as any).loading_return_start_date) fields.loading_return_start_date = dayjs((tripData as any).loading_return_start_date);
            if ((tripData as any).loading_return_end_date) fields.loading_return_end_date = dayjs((tripData as any).loading_return_end_date);
        }
        if (selectedStatus === "In Transit (Return)" && (tripData as any).loading_return_end_date) {
            fields.loading_return_end_date = dayjs((tripData as any).loading_return_end_date);
        }
        if ((tripData as any).return_empty_container_date) {
            fields.return_empty_container_date = dayjs((tripData as any).return_empty_container_date);
        }
        if ((tripData as any).remarks) {
            fields.remarks = (tripData as any).remarks;
        }
        if ((tripData as any).return_remarks) {
            fields.return_remarks = (tripData as any).return_remarks;
        }

        form.setFieldsValue(fields);
    }
  }, [selectedStatus, tripData, form]);

  const fetchBorderData = async (status: TripStatus) => {
    const isAtBorder = status === "At Border" || status === "At Border (Return)";
    if (!isAtBorder) {
      setNextBorder(null);
      setExistingCrossing(null);
      return;
    }
    const direction = status === "At Border" ? "go" : "return";
    setLoadingBorder(true);
    try {
      const [nextRes, crossingsRes] = await Promise.all([
        fetch(`/api/v1/trips/${tripId}/next-border?direction=${direction}`, { credentials: "include" }),
        fetch(`/api/v1/trips/${tripId}/border-crossings`, { credentials: "include" }),
      ]);
      const nextData = nextRes.ok ? await nextRes.json() : null;
      setNextBorder(nextData || null);
      if (nextData && crossingsRes.ok) {
        const crossings: any[] = await crossingsRes.json();
        const match = crossings.find(
          (c) => c.border_post_id === nextData.id && c.direction === direction
        );
        setExistingCrossing(match || null);
        // Pre-fill the 7 date fields if existing crossing found
        if (match) {
          const fields: any = {};
          const dateFields = [
            "arrived_side_a_at",
            "documents_submitted_side_a_at",
            "documents_cleared_side_a_at",
            "arrived_side_b_at",
            "departed_border_at",
          ];
          dateFields.forEach((f) => {
            if (match[f]) fields[`border_${f}`] = dayjs(match[f]);
          });
          form.setFieldsValue(fields);
        }
      } else {
        setExistingCrossing(null);
      }
    } catch {
      setNextBorder(null);
      setExistingCrossing(null);
    } finally {
      setLoadingBorder(false);
    }
  };

  const handleStatusChange = (value: TripStatus) => {
    setSelectedStatus(value);
    fetchBorderData(value);
  };

  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const res = await fetch("/api/v1/countries", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCountries(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch resources", err);
    } finally {
      setLoadingResources(false);
    }
  };

  const fetchTripData = async () => {
    try {
      const res = await fetch(`/api/v1/trips/${tripId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTripData(data);
      }
    } catch {
      // silently fail - timeline just won't show dates
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      // Story 2.26: If at border with a next border, upsert crossing first
      if (nextBorder && (selectedStatus === "At Border" || selectedStatus === "At Border (Return)")) {
        const direction = selectedStatus === "At Border" ? "go" : "return";
        const dateFields = [
          "arrived_side_a_at",
          "documents_submitted_side_a_at",
          "documents_cleared_side_a_at",
          "arrived_side_b_at",
          "departed_border_at",
        ];
        const crossingPayload: any = { direction };
        dateFields.forEach((f) => {
          const val = values[`border_${f}`];
          if (val) crossingPayload[f] = val.format("YYYY-MM-DD");
        });
        await fetch(`/api/v1/trips/${tripId}/border-crossings/${nextBorder.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(crossingPayload),
        });
      }

      const city = (values.city || "").trim();
      const country = (values.country || "").trim();
      let current_location: string | null = null;
      if (city && country) {
        current_location = `${city}, ${country}`;
      } else if (city) {
        current_location = city;
      } else if (country) {
        current_location = country;
      }

      // If departed_border_at was filled, the backend already auto-advanced the trip
      // to In Transit / In Transit (Return). Use that advanced status in the PATCH
      // so we don't overwrite the auto-advance back to "At Border".
      let effectiveStatus: TripStatus = values.status;
      if (values.border_departed_border_at) {
        if (selectedStatus === "At Border") effectiveStatus = "In Transit";
        else if (selectedStatus === "At Border (Return)") effectiveStatus = "In Transit (Return)";
      }

      const payload: TripUpdate = {
        status: effectiveStatus,
        current_location,
      };

      // Add date fields based on selected status
      if (values.dispatch_date) {
        payload.dispatch_date = values.dispatch_date.format("YYYY-MM-DD");
      }
      if (values.arrival_loading_date) {
        payload.arrival_loading_date = values.arrival_loading_date.format("YYYY-MM-DD");
      }
      if (values.loading_start_date) {
        payload.loading_start_date = values.loading_start_date.format("YYYY-MM-DD");
      }
      if (values.loading_end_date) {
        payload.loading_end_date = values.loading_end_date.format("YYYY-MM-DD");
      }
      if (values.arrival_offloading_date) {
        payload.arrival_offloading_date = values.arrival_offloading_date.format("YYYY-MM-DD");
      }
      if (values.offloading_date) {
        payload.offloading_date = values.offloading_date.format("YYYY-MM-DD");
      }
      if (values.offloading_return_date) {
        payload.offloading_return_date = values.offloading_return_date.format("YYYY-MM-DD");
      }
      if (values.arrival_return_date) {
        payload.arrival_return_date = values.arrival_return_date.format("YYYY-MM-DD");
      }
      if (values.dispatch_return_date) {
        payload.dispatch_return_date = values.dispatch_return_date.format("YYYY-MM-DD");
      }
      if (values.arrival_loading_return_date) {
        payload.arrival_loading_return_date = values.arrival_loading_return_date.format("YYYY-MM-DD");
      }
      if (values.loading_return_start_date) {
        payload.loading_return_start_date = values.loading_return_start_date.format("YYYY-MM-DD");
      }
      if (values.loading_return_end_date) {
        payload.loading_return_end_date = values.loading_return_end_date.format("YYYY-MM-DD");
      }
      if (values.return_empty_container_date) {
        payload.return_empty_container_date = values.return_empty_container_date.format("YYYY-MM-DD");
      }
      if (values.remarks !== undefined) {
        payload.remarks = values.remarks || null;
      }
      if (values.return_remarks !== undefined) {
        payload.return_remarks = values.return_remarks || null;
      }

      const response = await fetch(`/api/v1/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        message.success("Trip status updated successfully!");
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update trip");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // Build timeline items from trip data showing completed statuses
  const getTimelineItems = () => {
    if (!tripData) return [];

    const currentIdx = STATUS_ORDER.indexOf(currentStatus as TripStatus);
    const items: any[] = [];

    for (let i = 0; i <= currentIdx && i < STATUS_ORDER.length; i++) {
      const status = STATUS_ORDER[i];
      const date = getStatusDate(tripData, status);
      const isCompleted = i < currentIdx || (i === currentIdx && currentStatus !== "Waiting");

      // Show extra date details for statuses with multiple dates
      let extraDates = "";
      if (status === "Loading" && tripData.loading_start_date) {
        extraDates = `Started: ${formatDate(tripData.loading_start_date)}`;
      }
      if (status === "Offloading" && tripData.arrival_offloading_date) {
        extraDates = `Arrival: ${formatDate(tripData.arrival_offloading_date)}`;
      }

      items.push({
        icon: isCompleted ? (
          <CheckCircleOutlined style={{ fontSize: 14, color: "#52c41a" }} />
        ) : (
          <ClockCircleOutlined style={{ fontSize: 14, color: "#faad14" }} />
        ),
        content: (
          <div>
            <Text strong style={{ fontSize: 13 }}>{status}</Text>
            {date && (
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                {formatDate(date)}
              </Text>
            )}
            {extraDates && (
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                {extraDates}
              </Text>
            )}
          </div>
        ),
      });
    }

    return items;
  };

  // Calculate trip duration display — overall + return leg separately
  const getTripDuration = () => {
    if (!tripData) return null;
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

    if (overall && returnLeg) return `${overall} · ${returnLeg}`;
    return overall;
  };

  const timelineItems = getTimelineItems();
  const tripDuration = getTripDuration();

  return (
    <Modal
      title="Update Trip Status"
      open={open}
      onCancel={onClose}
      footer={null}
      confirmLoading={loadingResources}
      width={800}
      forceRender
    >
      {/* AC-2: Status flow pipeline indicator */}
      <Steps
        size="small"
        current={getPipelineStepIndex(currentStatus)}
        status={currentStatus === "Cancelled" ? "error" : "process"}
        style={{ marginBottom: 16 }}
        items={TRIP_PIPELINE_STEPS.map((s, i) => {
          const idx = getPipelineStepIndex(currentStatus);
          return {
            title: s,
            status: currentStatus === "Cancelled" && i === idx
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

      {/* Previous Status Timeline */}
      {timelineItems.length > 0 && (
        <>
          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ fontSize: 13 }}>Status History</Text>
            {tripDuration && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                Trip Duration: {tripDuration}
              </Text>
            )}
          </div>
          <Timeline items={timelineItems} style={{ marginBottom: 8, paddingTop: 8 }} />
          <Divider style={{ margin: "8px 0 16px" }} />
        </>
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {isTripClosed && (
          <Alert
            title={`Trip is currently ${currentStatus}`}
            description="Only Manager or Admin can reopen this trip."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {isReopening && (
          <Alert
            title="Reopening Trip"
            description={`You are about to change this trip from "${currentStatus}" to "${selectedStatus}".`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          name="status"
          label="New Status"
          rules={[{ required: true, message: "Please select a status" }]}
        >
          <Select placeholder="Select status" onChange={handleStatusChange}>
            {TRIP_STATUSES.map((status) => (
              <Select.Option key={status} value={status}>
                {status}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Border Crossing Sub-Form (Story 2.26) */}
        {(selectedStatus === "At Border" || selectedStatus === "At Border (Return)") && (
          <div style={{ marginBottom: 12 }}>
            {loadingBorder ? (
              <Alert title="Loading next border..." type="info" showIcon />
            ) : nextBorder ? (
              <>
                <Alert
                  title={
                    <span>
                      <strong>Border Crossing: </strong>{nextBorder.display_name}
                    </span>
                  }
                  description={
                    selectedStatus === "At Border"
                      ? `Going: ${nextBorder.side_a_name} → ${nextBorder.side_b_name}`
                      : `Returning: ${nextBorder.side_b_name} → ${nextBorder.side_a_name}`
                  }
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                />
                <Divider style={{ margin: "8px 0" }}>
                  Border Dates — {selectedStatus === "At Border" ? nextBorder.side_a_name : nextBorder.side_b_name}
                </Divider>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      name="border_arrived_side_a_at"
                      label={`Arrived at ${selectedStatus === "At Border" ? nextBorder.side_a_name : nextBorder.side_b_name}`}
                    >
                      <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="border_documents_submitted_side_a_at"
                      label={`Documents Submitted at ${selectedStatus === "At Border" ? nextBorder.side_a_name : nextBorder.side_b_name}`}
                    >
                      <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="border_documents_cleared_side_a_at"
                      label={`Documents Cleared at ${selectedStatus === "At Border" ? nextBorder.side_a_name : nextBorder.side_b_name}`}
                    >
                      <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Divider style={{ margin: "8px 0" }}>
                  Crossing
                </Divider>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      name="border_arrived_side_b_at"
                      label={`Crossed ${selectedStatus === "At Border" ? nextBorder.side_a_name : nextBorder.side_b_name} (= Arrive at ${selectedStatus === "At Border" ? nextBorder.side_b_name : nextBorder.side_a_name})`}
                    >
                      <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="border_departed_border_at" label="Departed Border Zone">
                      <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            ) : (
              <Alert
                title="No border crossings declared for this waybill"
                description="Add borders to the waybill to track crossing timestamps."
                type="info"
                showIcon
              />
            )}
          </div>
        )}

        {/* Dispatch Date */}
        {selectedStatus === "Dispatch" && (
          <Form.Item
            name="dispatch_date"
            label="Dispatch Date"
            rules={[{ required: true, message: "Please enter dispatch date" }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              placeholder="Select dispatch date"
            />
          </Form.Item>
        )}

        {/* Wait to Load — Arrival at Loading Point */}
        {selectedStatus === "Wait to Load" && (
          <Form.Item
            name="arrival_loading_date"
            label="Arrival at Loading Point"
            rules={[{ required: true, message: "Please enter arrival date" }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              placeholder="Date arrived at loading point"
            />
          </Form.Item>
        )}

        {/* Loading Dates — Start and End */}
        {selectedStatus === "Loading" && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="loading_start_date"
                label="Loading Start Date"
                rules={[{ required: true, message: "Required" }]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: "100%" }}
                  placeholder="Loading started"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="loading_end_date"
                label="Loading End Date"
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: "100%" }}
                  placeholder="Loading completed"
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* Offloading Dates */}
        {selectedStatus === "Offloading" && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="arrival_offloading_date"
                label="Arrival at Offloading"
                rules={[{ required: true, message: "Required" }]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: "100%" }}
                  placeholder="Arrival date"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="offloading_date"
                label="Offloading Date"
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: "100%" }}
                  placeholder="Offloading date"
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* On Way Return — arrival date (no return waybill; auto-advances to Waiting for PODs) */}
        {selectedStatus === "On Way Return" && (
          <Form.Item
            name="arrival_return_date"
            label="Arrival at Yard"
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              placeholder="Date truck arrived back (auto-advances to Waiting for PODs)"
            />
          </Form.Item>
        )}

        {/* Return Date */}
        {selectedStatus === "Returned" && (
          <Form.Item
            name="arrival_return_date"
            label="Arrival at Yard"
            rules={[{ required: true, message: "Please enter return date" }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              placeholder="Date truck returned to yard"
            />
          </Form.Item>
        )}

        {/* Dispatch (Return) Date */}
        {selectedStatus === "Dispatch (Return)" && (
          <Form.Item
            name="dispatch_return_date"
            label="Dispatch Date (Return)"
            rules={[{ required: true, message: "Please enter return dispatch date" }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              placeholder="Date dispatched for return journey"
            />
          </Form.Item>
        )}

        {/* Offloading (Return) — return cargo delivered at client destination */}
        {selectedStatus === "Offloading (Return)" && (
          <Form.Item
            name="offloading_return_date"
            label="Return Offloading Date"
            rules={[{ required: true, message: "Please enter return offloading date" }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              placeholder="Date return cargo was offloaded at client destination"
            />
          </Form.Item>
        )}

        {/* Wait to Load (Return) — Arrival at Return Loading Point */}
        {selectedStatus === "Wait to Load (Return)" && (
          <Form.Item
            name="arrival_loading_return_date"
            label="Arrival at Return Loading Point"
            rules={[{ required: true, message: "Please enter arrival date" }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              placeholder="Date arrived at return loading point"
            />
          </Form.Item>
        )}

        {/* Loading (Return) — Start and End */}
        {selectedStatus === "Loading (Return)" && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="loading_return_start_date"
                label="Return Loading Start"
                rules={[{ required: true, message: "Required" }]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: "100%" }}
                  placeholder="Return loading started"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="loading_return_end_date" label="Return Loading End">
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: "100%" }}
                  placeholder="Return loading completed"
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* In Transit (Return) — loading end date if not already set */}
        {selectedStatus === "In Transit (Return)" && (
          <Form.Item name="loading_return_end_date" label="Return Loading Completed">
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              placeholder="Return loading completed"
            />
          </Form.Item>
        )}

        {/* Return Empty Container Date — available on Returned / Waiting for PODs */}
        {(selectedStatus === "Returned" || selectedStatus === "Waiting for PODs") && (
          <Form.Item name="return_empty_container_date" label="Return Empty Container Date">
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              placeholder="Date empty container was returned"
            />
          </Form.Item>
        )}

        {/* Remarks — go leg remark (frozen after offloading); return leg gets its own field */}
        {![...RETURN_STATUSES, "Returned", "Waiting for PODs"].includes(selectedStatus as TripStatus) && (
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea
              rows={2}
              placeholder="Optional notes for client report (go leg)"
              maxLength={500}
            />
          </Form.Item>
        )}
        {[...RETURN_STATUSES, "Returned", "Waiting for PODs"].includes(selectedStatus as TripStatus) && (
          <Form.Item name="return_remarks" label="Remarks (Return)">
            <Input.TextArea
              rows={2}
              placeholder="Optional notes for client report (return leg)"
              maxLength={500}
            />
          </Form.Item>
        )}

        <Divider style={{ margin: "12px 0" }}>Location</Divider>

        <Row gutter={12}>
          <Col span={14}>
            <Form.Item name="city" label="City / Place">
              <Input placeholder="e.g. Mbeya, Tunduma" />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              name="country"
              label="Country"
              rules={[
                {
                  validator: (_, value) => {
                    const city = form.getFieldValue("city");
                    if (city && !value) {
                      return Promise.reject("Country is required when a city is entered");
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Select
                placeholder="Select country"
                showSearch
                optionFilterProp="children"
                allowClear
                loading={loadingResources}
              >
                {countries.map((c) => (
                  <Select.Option key={c.id} value={c.name}>
                    {c.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: "right", marginTop: 16 }}>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Update Trip
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
