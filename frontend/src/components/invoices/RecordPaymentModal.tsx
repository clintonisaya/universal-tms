"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  App,
  Row,
  Col,
  DatePicker,
  Typography,
  Space,
  Tag,
  Descriptions,
} from "antd";
import { DollarOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useInvalidateQueries, useInvoicePayments } from "@/hooks/useApi";
import { fmtCurrency } from "@/lib/utils";
import type { Invoice, PaymentType, InvoicePayment } from "@/types/invoice";
import dayjs from "dayjs";
import { useAuth } from "@/contexts/AuthContext";

const { Text, Title } = Typography;

const PAYMENT_TYPE_OPTIONS: { value: PaymentType; label: string; color: string }[] = [
  { value: "full", label: "Full — entire invoice amount received", color: "green" },
  { value: "advance", label: "Advance — partial upfront received", color: "blue" },
  { value: "balance", label: "Balance — remaining after advance", color: "orange" },
];

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice: Invoice | null;
}

export function RecordPaymentModal({
  open,
  onClose,
  onSuccess,
  invoice,
}: RecordPaymentModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const inv = useMemo(() => invoice ?? null, [invoice]);
  const total = inv ? Number(inv.total_usd ?? 0) : 0;
  const paid = inv ? Number(inv.amount_paid ?? 0) : 0;
  const outstanding = inv ? Number(inv.amount_outstanding ?? 0) : 0;
  const paymentType = Form.useWatch("payment_type", form);

  const hasAuthed = !!useAuth().user;
  const { data: paymentsData, isLoading: loadingPayments, refetch: refetchPayments } = useInvoicePayments(
    inv?.id ?? null,
    open && !!inv?.id && hasAuthed
  );
  const payments: InvoicePayment[] = paymentsData?.data ?? [];

  const invalidate = useInvalidateQueries();

  useEffect(() => {
    if (open && inv) {
      // Pre-select payment type based on invoice state
      let defaultType: PaymentType = "full";
      if (inv.status === "issued" && paid === 0) {
        defaultType = "full";
      } else if (inv.status === "partially_paid") {
        defaultType = "balance";
      } else if (paid === 0) {
        defaultType = "full";
      }

      form.setFieldsValue({
        payment_type: defaultType,
        amount: defaultType === "balance" ? outstanding : total,
        payment_date: dayjs(),
      });
    }
  }, [open, inv?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build available payment types based on state
  const availableTypes = useMemo(() => {
    const types: { value: PaymentType; label: string; color: string }[] = [];
    if (!inv) return types;

    // Convert to number for safe comparison — API may return string decimals
    const paidAmount = Number(inv.amount_paid ?? 0);

    if (inv.status === "issued" && paidAmount === 0) {
      types.push(PAYMENT_TYPE_OPTIONS[0]); // full
      types.push(PAYMENT_TYPE_OPTIONS[1]); // advance
    } else if (inv.status === "partially_paid") {
      types.push(PAYMENT_TYPE_OPTIONS[2]); // balance
    } else if (inv.status === "issued" && paidAmount > 0) {
      types.push(PAYMENT_TYPE_OPTIONS[2]); // balance (fallback)
    }

    return types;
  }, [inv]);

  // Auto-fill amount when payment type changes
  useEffect(() => {
    if (!inv || !open || !paymentType) return;
    if (paymentType === "balance" && outstanding > 0) {
      form.setFieldValue("amount", outstanding);
    } else if (paymentType === "full") {
      form.setFieldValue("amount", total);
    }
    // advance: leave amount field editable (defaults to 50% set above)
  }, [paymentType, inv?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinish = async (values: any) => {
    if (!inv) return;

    // Client-side validation
    const payAmount = Number(values.amount);
    if (payAmount <= 0) {
      message.error("Amount must be greater than zero");
      return;
    }
    if (payAmount > outstanding) {
      message.error(`Amount exceeds outstanding balance of ${fmtCurrency(outstanding, inv.currency)}`);
      return;
    }

    setSubmitting(true);
    try {
      const payDate = dayjs.isDayjs(values.payment_date)
        ? values.payment_date.toISOString()
        : new Date(values.payment_date).toISOString();

      const response = await fetch(`/api/v1/invoices/${inv.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          payment_type: values.payment_type,
          amount: payAmount,
          currency: inv.currency,
          payment_date: payDate,
          reference: values.reference || undefined,
          notes: values.notes || undefined,
        }),
      });

      if (response.ok) {
        message.success("Payment recorded successfully");
        form.resetFields();
        invalidate.invalidateInvoice(inv.id);
        invalidate.invalidateInvoicePayments(inv.id);
        invalidate.invalidateInvoices();
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

  if (!inv) {
    return (
      <Modal open={false} footer={null} />
    );
  }

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined style={{ color: "#52c41a" }} />
          <span>
            Record Payment —{" "}
            <span style={{ color: "#D4A843" }}>{inv.invoice_number ?? inv.id?.slice(0, 8).toUpperCase() ?? "..."}</span>
          </span>
        </Space>
      }
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      width={720}
      styles={{
        body: { maxHeight: "calc(100vh - 250px)", overflowY: "auto" },
      }}
      footer={null}
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {/* Invoice summary */}
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            background: "var(--color-surface)",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
          }}
        >
          <Row gutter={[12, 12]}>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">Invoice Amount</Text>
              </div>
              <Text strong style={{ fontSize: 16 }}>{fmtCurrency(total, inv.currency)}</Text>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">Already Received</Text>
              </div>
              <Text style={{ color: "#52c41a", fontFamily: "'Fira Code', monospace" }}>
                {fmtCurrency(paid, inv.currency)}
              </Text>
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">Outstanding</Text>
              </div>
              <Text
                strong
                style={{
                  color: outstanding > 0 ? "#fa8c16" : "#52c41a",
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 16,
                }}
              >
                {fmtCurrency(outstanding, inv.currency)}
              </Text>
            </Col>
          </Row>
        </div>

        {/* Client: {inv.customer_name} ({inv.customer_tin}) */}
        <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Client">{inv.customer_name}</Descriptions.Item>
          <Descriptions.Item label="Client TIN">{inv.customer_tin || "—"}</Descriptions.Item>
          <Descriptions.Item label="Currency">{inv.currency}</Descriptions.Item>
          <Descriptions.Item label="Invoice Date">{inv.date ?? "—"}</Descriptions.Item>
          {inv.items?.[0]?.route && (
            <Descriptions.Item label="Route" span={2}>{inv.items[0].route}</Descriptions.Item>
          )}
        </Descriptions>

        {/* Payment form fields */}
        <div
          style={{
            padding: 16,
            background: "var(--color-bg)",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
          }}
        >
          <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>Payment Received</Title>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Payment Type"
                name="payment_type"
                rules={[{ required: true, message: "Select payment type" }]}
              >
                <Select
                  placeholder="Select type"
                  value={paymentType}
                  options={availableTypes.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  dropdownStyle={{ maxHeight: 200 }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Amount"
                name="amount"
                rules={[{ required: true, message: "Enter amount" }]}
              >
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={outstanding}
                  addonBefore={`$ (${inv.currency})`}
                  placeholder="Enter payment amount"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="Payment Date"
                name="payment_date"
                rules={[{ required: true, message: "Select date" }]}
              >
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" placeholder="Payment date" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="Reference"
                name="reference"
              >
                <Input placeholder="Bank ref / TRF / Cheque no." />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="Notes"
                name="notes"
              >
                <Input placeholder="Optional remarks" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <Button onClick={() => { form.resetFields(); onClose(); }}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<DollarOutlined />}
              loading={submitting}
              onClick={form.submit}
            >
              Record Payment
            </Button>
          </div>
        </div>

        {/* Payment History Timeline */}
        {payments.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Title level={5} style={{ marginTop: 0 }}>
              <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
              Payment History
            </Title>
            {payments.map((p, i) => (
              <div
                key={p.id}
                style={{
                  padding: "10px 14px",
                  marginBottom: i < payments.length - 1 ? 8 : 0,
                  background: "var(--color-surface)",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  borderLeft: `3px solid ${getPaymentTypeColor(p.payment_type)}`,
                }}
              >
                <Row>
                  <Col span={12}>
                    <Space>
                      <Tag color={getPaymentTypeColor(p.payment_type)}>
                        {capitalize(p.payment_type)}
                      </Tag>
                      <Text strong style={{ fontFamily: "'Fira Code', monospace" }}>
                        {fmtCurrency(p.amount, inv.currency)}
                      </Text>
                    </Space>
                  </Col>
                  <Col span={12} style={{ textAlign: "right" }}>
                    <Text type="secondary">
                      {new Date(p.payment_date).toLocaleDateString("en-GB", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      })}
                    </Text>
                  </Col>
                </Row>
                {p.reference && (
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Ref: {p.reference}
                    </Text>
                  </div>
                )}
                {p.notes && (
                  <div style={{ marginTop: 2 }}>
                    <Text italic style={{ fontSize: 12 }}>
                      "{p.notes}"
                    </Text>
                  </div>
                )}
                {p.verified_by && (
                  <div style={{ marginTop: 2 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Verified by: {p.verified_by.full_name ?? p.verified_by.username}
                    </Text>
                  </div>
                )}
              </div>
            ))}
            <div
              style={{
                marginTop: 12,
                padding: "8px 14px",
                background: "#f6ffed",
                borderRadius: 6,
                border: "1px solid #b7eb8f",
                textAlign: "right",
              }}
            >
              <Text>
                Total Received: <Text strong style={{ fontFamily: "'Fira Code', monospace" }}>
                  {fmtCurrency(paid + (Number(form.getFieldValue("amount")) ?? 0), inv.currency)}
                </Text>{" "}
                / {fmtCurrency(total, inv.currency)}
                {inv.status === "fully_paid" || (paid + (Number(form.getFieldValue("amount")) ?? 0) >= total) ? " ✓" : ""}
              </Text>
            </div>
          </div>
        )}
      </Form>
    </Modal>
  );
}

function getPaymentTypeColor(type: PaymentType): string {
  switch (type) {
    case "full": return "#52c41a";
    case "advance": return "#1677ff";
    case "balance": return "#fa8c16";
    default: return "#8c8c8c";
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
