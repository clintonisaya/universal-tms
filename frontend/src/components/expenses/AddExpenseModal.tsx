"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, InputNumber, Select, Button, Space, message, Divider } from "antd";
import type { ExpenseRequestCreate, ExpenseCategory } from "@/types/expense";
import type { Trip } from "@/types/trip";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Fuel",
  "Allowance",
  "Maintenance",
  "Office",
  "Border",
  "Other",
];

const TRIP_RELATED_CATEGORIES: ExpenseCategory[] = [
  "Fuel",
  "Allowance",
  "Maintenance",
  "Border",
];

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tripId?: string | null;
  tripNumber?: string; // Optional trip number for display
}

export function AddExpenseModal({
  open,
  onClose,
  onSuccess,
  tripId,
  tripNumber,
}: AddExpenseModalProps) {
  const [form] = Form.useForm<ExpenseRequestCreate & { trip_id: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);

  useEffect(() => {
    if (open && !tripId) {
      const fetchTrips = async () => {
        setTripsLoading(true);
        try {
            // Fetch only active trips ideally, but for now fetch all
          const response = await fetch("/api/v1/trips/?limit=100", { credentials: "include" });
          if (response.ok) {
            const data = await response.json();
            setTrips(data.data);
          }
        } catch (error) {
          message.error("Failed to load trips");
        } finally {
            setTripsLoading(false);
        }
      };
      fetchTrips();
    }
  }, [open, tripId]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        trip_id: tripId || values.trip_id || null,
      };

      const response = await fetch("/api/v1/expenses/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        message.success("Expense added successfully!");
        form.resetFields();
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to add expense");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const isTripRequired = category && TRIP_RELATED_CATEGORIES.includes(category);

  return (
    <Modal
      title="Add Expense"
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      footer={null}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: "Please select a category" }]}
        >
          <Select 
            placeholder="Select category" 
            onChange={(val) => setCategory(val)}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <Select.Option key={cat} value={cat}>
                {cat}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Trip Selector Logic - Story 2.2 */}
        {tripId ? (
             <Form.Item label="Linked Trip">
                <Input value={tripNumber || `Trip #${tripId.slice(0, 8)}`} disabled />
             </Form.Item>
        ) : isTripRequired ? (
             <Form.Item
                name="trip_id"
                label="Select Trip"
                rules={[
                    {
                        required: true,
                        message: "Trip is required for this category"
                    }
                ]}
             >
                <Select
                    showSearch
                    placeholder="Search by Trip Number"
                    loading={tripsLoading}
                    optionFilterProp="children"
                    filterOption={(input, option: any) =>
                         (option?.children as unknown as string).toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                    allowClear
                >
                    {trips.map(trip => (
                        <Select.Option key={trip.id} value={trip.id}>
                            {trip.trip_number} - {trip.route_name}
                        </Select.Option>
                    ))}
                </Select>
             </Form.Item>
        ) : null}

        <Form.Item
          name="amount"
          label="Amount (KES)"
          rules={[
            { required: true, message: "Please enter the amount" },
            { type: "number", min: 1, message: "Amount must be greater than 0" },
          ]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={1}
            precision={2}
            placeholder="e.g., 50000"
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => Number(value?.replace(/,/g, "") || 0) as 1}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[
            { required: true, message: "Please enter a description" },
            { max: 500, message: "Description is too long" },
          ]}
        >
          <Input.TextArea rows={3} placeholder="e.g., Shell V-Power fuel" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Space>
            <Button
              onClick={() => {
                form.resetFields();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Add Expense
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
