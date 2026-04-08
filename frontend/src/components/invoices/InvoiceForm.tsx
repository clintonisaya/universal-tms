"use client";

import React, { useState, useEffect, useRef } from "react";
import { Form, Input, InputNumber, DatePicker, Select, Divider } from "antd";
import type { Invoice, InvoiceItem } from "@/types/invoice";
import { amountInputProps } from "@/lib/utils";
import { apiFetch } from "@/hooks/useApi";
import dayjs from "dayjs";

interface InvoiceFormProps {
  invoice: Invoice;
  onChange: (updates: Partial<Invoice>) => void;
  readOnly?: boolean;
}

const SCHEDULE_OPTIONS = [
  { label: "100%", value: "100%" },
  { label: "50/50", value: "50/50" },
  { label: "70/30", value: "70/30" },
  { label: "60/40", value: "60/40" },
];

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ invoice, onChange, readOnly = false }) => {
  const [numberStatus, setNumberStatus] = useState<"" | "validating" | "error" | "success">("");
  const [numberHelp, setNumberHelp] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Check uniqueness on invoice number change (debounced)
  const handleInvoiceNumberChange = (value: string) => {
    onChange({ invoice_number: value });

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setNumberStatus("error");
      setNumberHelp("Invoice number is required");
      return;
    }

    setNumberStatus("validating");
    setNumberHelp("Checking...");

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch<{ exists: boolean }>(
          `/api/v1/invoices/check-number/${encodeURIComponent(value)}?exclude_id=${invoice.id}`
        );
        if (res.exists) {
          setNumberStatus("error");
          setNumberHelp("This invoice number already exists");
        } else {
          setNumberStatus("success");
          setNumberHelp("");
        }
      } catch {
        setNumberStatus("");
        setNumberHelp("");
      }
    }, 500);
  };

  // Reset validation state when invoice changes (e.g. after save)
  useEffect(() => {
    if (invoice.invoice_number) {
      setNumberStatus("");
      setNumberHelp("");
    }
  }, [invoice.id]);

  const item: InvoiceItem = invoice.items?.[0] || {
    route: "",
    truck_plate: "",
    trailer_plate: "",
    qty: 1,
    unit_price: 0,
    payment_schedule: "100%",
    amount: 0,
  };

  const updateItem = (field: keyof InvoiceItem, value: any) => {
    const updated = { ...item, [field]: value };
    updated.amount = (updated.qty || 1) * (updated.unit_price || 0);
    onChange({ items: [updated] });
  };

  return (
    <div style={{ padding: "16px 20px" }}>
      <Form layout="vertical" size="small" disabled={readOnly}>
        {/* Invoice Meta */}
        <Form.Item
          label="Invoice #"
          validateStatus={numberStatus || undefined}
          help={numberHelp || undefined}
          required
        >
          <Input
            value={invoice.invoice_number}
            onChange={(e) => handleInvoiceNumberChange(e.target.value)}
            placeholder="Enter invoice number"
            style={{ fontWeight: 600 }}
            disabled={readOnly}
          />
        </Form.Item>

        <Form.Item label="Date">
          <DatePicker
            value={invoice.date ? dayjs(invoice.date) : null}
            onChange={(d) => onChange({ date: d ? d.format("YYYY-MM-DD") : "" })}
            style={{ width: "100%" }}
            format="DD MMM YYYY"
          />
        </Form.Item>

        <Divider style={{ margin: "12px 0" }}>Customer</Divider>

        <Form.Item label="Customer Name">
          <Input
            value={invoice.customer_name}
            onChange={(e) => onChange({ customer_name: e.target.value })}
          />
        </Form.Item>

        <Form.Item label="Customer TIN">
          <Input
            value={invoice.customer_tin}
            onChange={(e) => onChange({ customer_tin: e.target.value })}
          />
        </Form.Item>

        <Form.Item label="Regarding">
          <Input
            value={invoice.regarding}
            onChange={(e) => onChange({ regarding: e.target.value })}
          />
        </Form.Item>

        <Divider style={{ margin: "12px 0" }}>Line Item</Divider>

        <Form.Item label="Route">
          <Input
            value={item.route}
            onChange={(e) => updateItem("route", e.target.value)}
          />
        </Form.Item>

        <div style={{ display: "flex", gap: 8 }}>
          <Form.Item label="Truck Plate" style={{ flex: 1 }}>
            <Input
              value={item.truck_plate}
              onChange={(e) => updateItem("truck_plate", e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Trailer Plate" style={{ flex: 1 }}>
            <Input
              value={item.trailer_plate}
              onChange={(e) => updateItem("trailer_plate", e.target.value)}
            />
          </Form.Item>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Form.Item label="Qty" style={{ width: 80 }}>
            <InputNumber
              value={item.qty}
              min={1}
              onChange={(v) => updateItem("qty", v || 1)}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item label="Unit Price (USD)" style={{ flex: 1 }}>
            <InputNumber
              value={item.unit_price}
              min={0}
              onChange={(v) => updateItem("unit_price", v || 0)}
              style={{ width: "100%", fontFamily: "'Fira Code', monospace" }}
              {...amountInputProps}
            />
          </Form.Item>
        </div>

        <Form.Item label="Payment Schedule">
          <Select
            value={item.payment_schedule}
            onChange={(v) => updateItem("payment_schedule", v)}
            options={SCHEDULE_OPTIONS}
          />
        </Form.Item>

        <Divider style={{ margin: "12px 0" }}>Financial</Divider>

        <Form.Item label="Currency">
          <Select
            value={invoice.currency}
            onChange={(v) => onChange({ currency: v })}
            options={[
              { label: "USD", value: "USD" },
              { label: "TZS", value: "TZS" },
            ]}
          />
        </Form.Item>

        <Form.Item label="VAT Rate (%)">
          <InputNumber
            value={Number(invoice.vat_rate)}
            min={0}
            max={100}
            onChange={(v) => onChange({ vat_rate: v || 0 } as any)}
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item label="Exchange Rate (1 USD = X TZS)">
          <InputNumber
            value={Number(invoice.exchange_rate)}
            min={0}
            onChange={(v) => onChange({ exchange_rate: v || 0 } as any)}
            style={{ width: "100%", fontFamily: "'Fira Code', monospace" }}
            {...amountInputProps}
          />
        </Form.Item>
      </Form>
    </div>
  );
};
