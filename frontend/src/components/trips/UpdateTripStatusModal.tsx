"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Select, Button, Space, message, Divider } from "antd";
import type { TripUpdate, TripStatus } from "@/types/trip";
import { LocationAutocomplete } from "@/components/common/LocationAutocomplete";

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
  const [form] = Form.useForm<TripUpdate>();
  const [submitting, setSubmitting] = useState(false);
  // We keep vehicle statuses as a quick select option, but primary input is now LocationAutocomplete
  const [vehicleStatuses, setVehicleStatuses] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    if (open) {
      fetchResources();
      if (initialValues) {
        form.setFieldsValue(initialValues);
      }
    }
  }, [open, initialValues, form]);

  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const vsRes = await fetch("/api/v1/vehicle-statuses/", { credentials: "include" });

      if (vsRes.ok) {
        const vsData = await vsRes.json();
        setVehicleStatuses(vsData.data);
      }
    } catch (err) {
      console.error("Failed to fetch master data", err);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleSubmit = async (values: TripUpdate) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
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
      <Form<TripUpdate>
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={initialValues}
      >
        <Form.Item
          name="status"
          label="Main Trip Status"
          rules={[{ required: true, message: "Please select a status" }]}
        >
          <Select placeholder="Select status">
            {TRIP_STATUSES.map((status) => (
              <Select.Option key={status} value={status}>
                {status}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Divider>Detailed Status / Location</Divider>

        <Form.Item
          name="current_location"
          label="Current Location"
          help="Search address (Radar.io) or enter manually"
        >
            <LocationAutocomplete />
        </Form.Item>
        
        <Form.Item label="Quick Select Status">
             <Select 
                placeholder="Or select a standard status"
                onChange={(val) => form.setFieldsValue({ current_location: val })}
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
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Update Trip
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
