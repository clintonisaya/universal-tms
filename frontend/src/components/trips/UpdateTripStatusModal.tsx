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
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { TripUpdate, TripStatus, Trip } from "@/types/trip";
import type { Country } from "@/types/location";

const { Text } = Typography;

const TRIP_STATUSES: TripStatus[] = [
  "Dispatch",
  "Loading",
  "In Transit",
  "At Border",
  "Offloaded",
  "Returned",
  "Waiting for PODs",
  "Completed",
  "Cancelled",
];

const CLOSED_STATUSES: TripStatus[] = ["Completed", "Cancelled"];

// Status order for timeline display
const STATUS_ORDER: TripStatus[] = [
  "Waiting",
  "Dispatch",
  "Loading",
  "In Transit",
  "At Border",
  "Offloaded",
  "Returned",
  "Waiting for PODs",
  "Completed",
];

interface UpdateTripStatusModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tripId: string;
  initialValues?: Partial<TripUpdate & { status: string }>;
}

// Helper to get the date label for a status from trip data
function getStatusDate(trip: Trip | null, status: TripStatus): string | null {
  if (!trip) return null;
  switch (status) {
    case "Waiting":
      return trip.created_at;
    case "Dispatch":
      return trip.dispatch_date;
    case "Loading":
      return trip.loading_date;
    case "Offloaded":
      return trip.offloading_date;
    case "Returned":
      return trip.arrival_return_date;
    case "Completed":
      return trip.end_date;
    default:
      return null;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return dayjs(dateStr).format("DD/MM/YYYY HH:mm");
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

  const currentStatus = initialValues?.status as TripStatus | undefined;
  const isTripClosed = currentStatus && CLOSED_STATUSES.includes(currentStatus);
  const isReopening = isTripClosed && selectedStatus && !CLOSED_STATUSES.includes(selectedStatus);

  useEffect(() => {
    if (open) {
      fetchResources();
      fetchTripData();
      form.resetFields();
      if (initialValues) {
        const location = initialValues.current_location || "";
        const parts = location.split(",").map((s) => s.trim());
        form.setFieldsValue({
          status: initialValues.status,
          city: parts[0] || "",
          country: parts.length > 1 ? parts.slice(1).join(", ") : "",
        });
        setSelectedStatus(initialValues.status as TripStatus);
      }
    }
  }, [open, initialValues, form]);

  // Pre-fill dates when status changes or tripData loads
  useEffect(() => {
    if (selectedStatus && tripData) {
        const fields: any = {};
        
        if (selectedStatus === "Dispatch" && tripData.dispatch_date) {
            fields.dispatch_date = dayjs(tripData.dispatch_date);
        }
        if (selectedStatus === "Loading") {
            if (tripData.arrival_loading_date) fields.arrival_loading_date = dayjs(tripData.arrival_loading_date);
            if (tripData.loading_date) fields.loading_date = dayjs(tripData.loading_date);
        }
        if (selectedStatus === "Offloaded") {
             if (tripData.arrival_offloading_date) fields.arrival_offloading_date = dayjs(tripData.arrival_offloading_date);
             if (tripData.offloading_date) fields.offloading_date = dayjs(tripData.offloading_date);
        }
        if (selectedStatus === "Returned" && tripData.arrival_return_date) {
            fields.arrival_return_date = dayjs(tripData.arrival_return_date);
        }

        form.setFieldsValue(fields);
    }
  }, [selectedStatus, tripData, form]);

  const handleStatusChange = (value: TripStatus) => {
    setSelectedStatus(value);
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

      const payload: TripUpdate = {
        status: values.status,
        current_location,
      };

      // Add date fields based on selected status
      if (values.dispatch_date) {
        payload.dispatch_date = values.dispatch_date.toISOString();
      }
      if (values.arrival_loading_date) {
        payload.arrival_loading_date = values.arrival_loading_date.toISOString();
      }
      if (values.loading_date) {
        payload.loading_date = values.loading_date.toISOString();
      }
      if (values.arrival_offloading_date) {
        payload.arrival_offloading_date = values.arrival_offloading_date.toISOString();
      }
      if (values.offloading_date) {
        payload.offloading_date = values.offloading_date.toISOString();
      }
      if (values.arrival_return_date) {
        payload.arrival_return_date = values.arrival_return_date.toISOString();
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
      if (status === "Loading" && tripData.arrival_loading_date) {
        extraDates = `Arrival: ${formatDate(tripData.arrival_loading_date)}`;
      }
      if (status === "Offloaded" && tripData.arrival_offloading_date) {
        extraDates = `Arrival: ${formatDate(tripData.arrival_offloading_date)}`;
      }

      items.push({
        dot: isCompleted ? (
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
              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                {extraDates}
              </Text>
            )}
          </div>
        ),
      });
    }

    return items;
  };

  // Calculate trip duration display
  const getTripDuration = () => {
    if (!tripData) return null;
    const dispatch = tripData.dispatch_date;
    const returnDate = tripData.arrival_return_date;
    if (dispatch && returnDate) {
      const days = dayjs(returnDate).diff(dayjs(dispatch), "day");
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
    if (tripData.trip_duration_days != null) {
      return `${tripData.trip_duration_days} day${tripData.trip_duration_days !== 1 ? "s" : ""}`;
    }
    return null;
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
    >
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
            message={`Trip is currently ${currentStatus}`}
            description="Only Manager or Admin can reopen this trip."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {isReopening && (
          <Alert
            message="Reopening Trip"
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

        {/* Dispatch Date */}
        {selectedStatus === "Dispatch" && (
          <Form.Item
            name="dispatch_date"
            label="Dispatch Date"
            rules={[{ required: true, message: "Please enter dispatch date" }]}
          >
            <DatePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              style={{ width: "100%" }}
              placeholder="Select dispatch date"
            />
          </Form.Item>
        )}

        {/* Loading Dates */}
        {selectedStatus === "Loading" && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="arrival_loading_date"
                label="Arrival at Loading"
                rules={[{ required: true, message: "Required" }]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: "100%" }}
                  placeholder="Arrival date"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="loading_date"
                label="Loading Date"
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: "100%" }}
                  placeholder="Loading date"
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* Offloading Dates */}
        {selectedStatus === "Offloaded" && (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="arrival_offloading_date"
                label="Arrival at Offloading"
                rules={[{ required: true, message: "Required" }]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
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
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: "100%" }}
                  placeholder="Offloading date"
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* Return Date */}
        {selectedStatus === "Returned" && (
          <Form.Item
            name="arrival_return_date"
            label="Arrival at Yard"
            rules={[{ required: true, message: "Please enter return date" }]}
          >
            <DatePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              style={{ width: "100%" }}
              placeholder="Date truck returned to yard"
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
