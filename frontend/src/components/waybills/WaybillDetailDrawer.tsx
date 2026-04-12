"use client";

import { useState, useEffect, useCallback } from "react";
import { Drawer, Descriptions, Typography, Spin, message, Space, Button } from "antd";
import { useRouter } from "next/navigation";
import type { Waybill } from "@/types/waybill";
import { WaybillStatusTag } from "@/components/ui/WaybillStatusTag";

const { Title, Text } = Typography;


interface WaybillDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  waybillId: string | null;
}

export function WaybillDetailDrawer({ open, onClose, waybillId }: WaybillDetailDrawerProps) {
  const router = useRouter();
  const [waybill, setWaybill] = useState<Waybill | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWaybill = useCallback(async () => {
    if (!waybillId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/waybills/${waybillId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data: Waybill = await response.json();
        setWaybill(data);
      } else {
        message.error("Failed to fetch waybill details");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [waybillId]);

  useEffect(() => {
    if (open && waybillId) {
      fetchWaybill();
    }
    if (!open) {
      setWaybill(null);
    }
  }, [open, waybillId, fetchWaybill]);

  return (
    <Drawer
      title={
        waybill ? (
          <Space>
            <span>Waybill: {waybill.waybill_number}</span>
            <WaybillStatusTag status={waybill.status} />
          </Space>
        ) : (
          "Waybill Details"
        )
      }
      open={open}
      onClose={onClose}
      styles={{ wrapper: { width: 1200 } }}
      destroyOnHidden
    >
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : !waybill ? (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Text type="secondary">Select a waybill to view details</Text>
        </div>
      ) : (
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Descriptions title="Client & Cargo" bordered column={2} size="small">
            <Descriptions.Item label="Client Name">
              {waybill.client_name}
            </Descriptions.Item>
            <Descriptions.Item label="Cargo Type">
              {waybill.cargo_type || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Weight">
              {waybill.weight_kg ? `${Number(waybill.weight_kg).toLocaleString("en-US")} KG` : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Risk Level">
              {waybill.risk_level || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {waybill.description}
            </Descriptions.Item>
          </Descriptions>

          <Descriptions title="Route & Financials" bordered column={2} size="small">
            <Descriptions.Item label="Origin">
              {waybill.origin}
            </Descriptions.Item>
            <Descriptions.Item label="Destination">
              {waybill.destination}
            </Descriptions.Item>
            <Descriptions.Item label="Expected Loading">
              {waybill.expected_loading_date
                ? new Date(waybill.expected_loading_date).toLocaleDateString()
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Agreed Rate">
              {waybill.invoice_id && waybill.invoice_number ? (
                <Space>
                  <span>
                    {waybill.currency || "USD"} {Number(waybill.agreed_rate).toLocaleString("en-US")}
                  </span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Set by{" "}
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, height: "auto", color: "var(--color-primary)", fontSize: 12 }}
                      onClick={() => router.push(`/ops/invoices/${waybill.invoice_id}`)}
                    >
                      {waybill.invoice_number}
                    </Button>
                  </Text>
                </Space>
              ) : (
                <Text type="secondary">Not invoiced yet</Text>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Descriptions title="Linked Trip" bordered column={2} size="small">
            <Descriptions.Item label="Trip #" span={2}>
              {waybill.trip_number ? (
                <Text strong>{waybill.trip_number}</Text>
              ) : (
                <Text type="secondary">Not yet dispatched</Text>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Descriptions title="Metadata" bordered column={2} size="small">
            <Descriptions.Item label="Created At">
              {waybill.created_at
                ? new Date(waybill.created_at).toLocaleDateString() + " " + new Date(waybill.created_at).toLocaleTimeString()
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Waybill ID">
              <Text copyable>{waybill.id}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Space>
      )}
    </Drawer>
  );
}
