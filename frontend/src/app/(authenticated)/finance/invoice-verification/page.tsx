"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns, ActionType } from "@ant-design/pro-components";
import { Button, Space, Segmented, Tooltip } from "antd";
import {
  ReloadOutlined,
  EyeOutlined,
  DollarOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { fmtCurrency } from "@/lib/utils";
import {
  getInvoiceDisplayNumber,
  type Invoice,
  type InvoiceStatus,
} from "@/types/invoice";
import { RecordPaymentModal } from "@/components/invoices/RecordPaymentModal";
import { PopAttachmentsDrawer } from "@/components/invoices/PopAttachmentsDrawer";

const STATUS_TABS = [
  { label: "Issued", value: "issued" },
  { label: "Partial", value: "partially_paid" },
  { label: "Paid", value: "fully_paid" },
  { label: "All", value: "all" },
];

const STATUS_BADGE: Record<string, { color: string; label: string }> = {
  draft: { color: "#8c8c8c", label: "Draft" },
  issued: { color: "#1677ff", label: "Issued" },
  partially_paid: { color: "#fa8c16", label: "Partial" },
  fully_paid: { color: "#52c41a", label: "Paid" },
  voided: { color: "#ff4d4f", label: "Voided" },
};

export default function InvoiceVerificationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const actionRef = useRef<ActionType>(null);

  const [statusFilter, setStatusFilter] = useState<string>("issued");

  // Record payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [popDrawerOpen, setPopDrawerOpen] = useState(false);

  const columns: ProColumns<Invoice>[] = [
    {
      title: "Invoice #",
      dataIndex: "invoice_number",
      key: "invoice_number",
      width: 120,
      fieldProps: { placeholder: "Search invoice number" },
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => router.push(`/ops/invoices/${record.id}`)}
          style={{
            padding: 0,
            height: "auto",
            fontWeight: 600,
            color: "var(--ant-color-primary)",
          }}
        >
          {getInvoiceDisplayNumber(record)}
        </Button>
      ),
    },
    {
      title: "Waybill #",
      dataIndex: "waybill_number",
      key: "waybill_number",
      width: 150,
      search: false,
      render: (_, record) => record.waybill_number || "—",
    },
    {
      title: "Trip #",
      dataIndex: "trip_number",
      key: "trip_number",
      width: 150,
      search: false,
      render: (_, record) => record.trip_number || "—",
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 120,
      valueType: "date",
      search: false,
      sorter: true,
      render: (_, record) => {
        if (!record.date) return "—";
        const dt = new Date(record.date + "T00:00:00");
        return dt.toLocaleDateString("en-GB", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        });
      },
    },
    {
      title: "Client",
      dataIndex: "customer_name",
      key: "customer_name",
      width: 200,
      fieldProps: { placeholder: "Search client name" },
    },
    {
      title: "Amount (USD)",
      dataIndex: "total_usd",
      key: "total_usd",
      width: 140,
      align: "right",
      search: false,
      sorter: true,
      render: (_, record) => (
        <span style={{ fontWeight: 700, fontFamily: "'Fira Code', monospace" }}>
          {fmtCurrency(record.total_usd, record.currency)}
        </span>
      ),
    },
    {
      title: "Received (USD)",
      dataIndex: "amount_paid",
      key: "amount_paid",
      width: 130,
      align: "right",
      search: false,
      render: (_, record) => (
        <span
          style={{
            fontFamily: "'Fira Code', monospace",
            color: "#52c41a",
          }}
        >
          {fmtCurrency(record.amount_paid, "USD")}
        </span>
      ),
    },
    {
      title: "Outstanding",
      dataIndex: "amount_outstanding",
      key: "amount_outstanding",
      width: 130,
      align: "right",
      search: false,
      render: (_, record) => (
        <span
          style={{
            fontFamily: "'Fira Code', monospace",
            color: Number(record.amount_outstanding) > 0 ? "#fa8c16" : undefined,
          }}
        >
          {fmtCurrency(record.amount_outstanding, "USD")}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 125,
      search: false,
      render: (_, record) => {
        const badge = STATUS_BADGE[record.status] || STATUS_BADGE.draft;
        return (
          <span
            style={{
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              background: badge.color,
            }}
          >
            {badge.label}
          </span>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 260,
      valueType: "option",
      search: false,
      render: (_, record) => {
        const canPay =
          record.status === "issued" || record.status === "partially_paid";
        return (
          <Space size={4}>
            <Tooltip title="View Invoice">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => router.push(`/ops/invoices/${record.id}`)}
              >
                View
              </Button>
            </Tooltip>
            {canPay && (
              <Tooltip title="Record Client Payment">
                <Button
                  size="small"
                  type="primary"
                  icon={<DollarOutlined />}
                  onClick={() => {
                    setSelectedInvoice(record);
                    setPaymentModalOpen(true);
                  }}
                >
                  Record Payment
                </Button>
              </Tooltip>
            )}
            <Tooltip title="View POP Attachments">
              <Button
                size="small"
                icon={<PaperClipOutlined />}
                onClick={() => {
                  setSelectedInvoice(record);
                  setPopDrawerOpen(true);
                }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <ProTable<Invoice>
        headerTitle="Invoice Verification"
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        request={async (params, sort) => {
          if (!isAuthenticated) {
            return { data: [], total: 0, success: false };
          }

          const apiStatus = statusFilter === "all" ? undefined : statusFilter;
          const searchParams = new URLSearchParams();
          if (apiStatus) searchParams.set("status", apiStatus);

          try {
            const response = await fetch(
              `/api/v1/invoices/?${searchParams.toString()}`,
              { credentials: "include" }
            );
            if (!response.ok) {
              return { data: [], total: 0, success: false };
            }
            const result = await response.json();
            let data: Invoice[] = (result.data ?? []) as Invoice[];

            // Client-side search filters
            if (params.invoice_number) {
              const search = String(params.invoice_number).toLowerCase();
              data = data.filter((inv) =>
                getInvoiceDisplayNumber(inv).toLowerCase().includes(search)
              );
            }
            if (params.customer_name) {
              const search = String(params.customer_name).toLowerCase();
              data = data.filter((inv) =>
                (inv.customer_name ?? "").toLowerCase().includes(search)
              );
            }

            // Client-side sort
            if (sort && sort.date) {
              data.sort((a, b) => {
                const aDate = a.date ?? "";
                const bDate = b.date ?? "";
                return sort.date === "ascend"
                  ? aDate.localeCompare(bDate)
                  : bDate.localeCompare(aDate);
              });
            }
            if (sort && sort.total_usd) {
              data.sort((a, b) =>
                sort.total_usd === "ascend"
                  ? Number(a.total_usd) - Number(b.total_usd)
                  : Number(b.total_usd) - Number(a.total_usd)
              );
            }

            return {
              data,
              total: result.count ?? data.length,
              success: true,
            };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        search={false}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `${total} invoices`,
        }}
        scroll={{ x: 1400 }}
        toolBarRender={() => [
          <Segmented
            key="status"
            options={STATUS_TABS.map((t) => ({
              label: t.label,
              value: t.value,
            }))}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v as string);
              actionRef.current?.reload();
            }}
          />,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            Refresh
          </Button>,
        ]}
      />

      <RecordPaymentModal
        open={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedInvoice(null);
        }}
        onSuccess={() => {
          actionRef.current?.reload();
        }}
        invoice={selectedInvoice}
      />

      <PopAttachmentsDrawer
        invoice={selectedInvoice}
        open={popDrawerOpen}
        onClose={() => {
          setPopDrawerOpen(false);
          setSelectedInvoice(null);
        }}
      />
    </>
  );
}
