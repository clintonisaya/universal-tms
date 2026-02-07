"use client";

import { useState } from "react";
import { Modal, Form, Select, Input, Button, message, Descriptions, Tag, Divider } from "antd";
import { DollarOutlined } from "@ant-design/icons";
import type { ExpenseRequestDetailed } from "@/types/expense";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expense: ExpenseRequestDetailed | null;
}

export function PaymentModal({ open, onClose, onSuccess, expense }: PaymentModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<string>("CASH");

  // Return early but still render the Modal shell to keep form connected
  if (!expense) {
    return (
      <Modal open={false} footer={null}>
        <Form form={form} />
      </Modal>
    );
  }

  const handleFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/expenses/${expense.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          method: values.method,
          reference: values.reference,
        }),
      });

      if (response.ok) {
        message.success("Payment processed successfully");
        form.resetFields();
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        message.error(error.detail || "Payment failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          <DollarOutlined style={{ marginRight: 8 }} />
          Process Payment
        </span>
      }
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      footer={null}
    >
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Amount">
          <strong>${expense.amount.toLocaleString()}</strong>
        </Descriptions.Item>
        <Descriptions.Item label="Payee">
          {expense.created_by?.full_name || "Unknown"}
        </Descriptions.Item>
        <Descriptions.Item label="Category">
            {expense.category}
        </Descriptions.Item>
      </Descriptions>
      
      <Divider />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ method: "CASH" }}
      >
        <Form.Item
          name="method"
          label="Payment Method"
          rules={[{ required: true }]}
        >
          <Select onChange={(val) => setMethod(val)}>
            <Select.Option value="CASH">Cash</Select.Option>
            <Select.Option value="TRANSFER">Bank Transfer / M-Pesa</Select.Option>
          </Select>
        </Form.Item>

        {method === "TRANSFER" && (
          <Form.Item
            name="reference"
            label="Reference Number"
            rules={[{ required: true, message: "Reference is required for transfers" }]}
          >
            <Input placeholder="e.g. QXJ123456" />
          </Form.Item>
        )}

        <Form.Item style={{ marginTop: 24, textAlign: "right" }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Confirm Payment
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
