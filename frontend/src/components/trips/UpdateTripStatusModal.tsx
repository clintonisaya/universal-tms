"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Select, Input, Button, Space, message, Divider, Row, Col, Alert } from "antd";
import type { TripUpdate, TripStatus } from "@/types/trip";
import type { Country } from "@/types/location";

const TRIP_STATUSES: TripStatus[] = [
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

interface UpdateTripStatusModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tripId: string;
  initialValues?: Partial<TripUpdate>;
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
  const [vehicleStatuses, setVehicleStatuses] = useState<any[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TripStatus | null>(null);

  // Check if this is a reopen operation (closed -> active)
  const currentStatus = initialValues?.status as TripStatus | undefined;
  const isTripClosed = currentStatus && CLOSED_STATUSES.includes(currentStatus);
  const isReopening = isTripClosed && selectedStatus && !CLOSED_STATUSES.includes(selectedStatus);

  useEffect(() => {
    if (open) {
      fetchResources();
      form.resetFields();
      if (initialValues) {
        // Parse existing location into city + country
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

  const handleStatusChange = (value: TripStatus) => {
    setSelectedStatus(value);
  };

  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const [vsRes, countriesRes] = await Promise.all([
        fetch("/api/v1/vehicle-statuses", { credentials: "include" }),
        fetch("/api/v1/countries", { credentials: "include" }),
      ]);

      if (vsRes.ok) {
        const vsData = await vsRes.json();
        setVehicleStatuses(vsData.data);
      }
      if (countriesRes.ok) {
        const countriesData = await countriesRes.json();
        setCountries(countriesData.data);
      }
    } catch (err) {
      console.error("Failed to fetch resources", err);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      // Concatenate city + country into current_location
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

  return (
    <Modal
      title="Update Trip Status & Location"
      open={open}
      onCancel={onClose}
      footer={null}
      confirmLoading={loadingResources}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {isTripClosed && (
          <Alert
            message={`Trip is currently ${currentStatus}`}
            description="Only Manager or Admin can reopen this trip. Selecting an active status will reopen the trip and allow expense modifications again."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {isReopening && (
          <Alert
            message="Reopening Trip"
            description={`You are about to change this trip from "${currentStatus}" to "${selectedStatus}". This will unlock expense modifications for this trip. Make sure the truck and trailer are not on another active trip.`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          name="status"
          label="Main Trip Status"
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

        <Divider>Location</Divider>

        <Row gutter={12}>
          <Col span={14}>
            <Form.Item
              name="city"
              label="City / Place"
            >
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

        <Form.Item label="Quick Select Status">
          <Select
            placeholder="Or select a standard status"
            onChange={(val) => form.setFieldsValue({ city: val, country: "" })}
            allowClear
          >
            {vehicleStatuses.map((vs) => (
              <Select.Option key={vs.id} value={vs.name}>
                {vs.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: "right", marginTop: 24 }}>
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
