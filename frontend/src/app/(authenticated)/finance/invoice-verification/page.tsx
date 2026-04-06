"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Flex,
  Typography,
  Segmented,
  Tooltip,
} from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  EyeOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAuth } from "@/contexts/AuthContext";
import { useInvoices } from "@/hooks/useApi";
import { fmtCurrency } from "@/lib/utils";
import {
  getColumnSearchProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import { RecordPaymentModal } from "@/components/invoices/RecordPaymentModal";

const { Title } = Typography;

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

  const [statusFilter, setStatusFilter] = useState<string>("issued");

  // Record payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const apiStatus = statusFilter === "all" ? undefined : statusFilter;
  const { data, isLoading, refetch } = useInvoices(
    { status: apiStatus },
    isAuthenticated
  );
  const invoices: Invoice[] = data?.data || [];
  const totalCount = data?.count || 0;

  // Counts per status tab (approximate — uses current filtered data for "all", otherwise shows total)
  const tabLabel = (label: string, count: number) =>
    `${label} (${count})`;

  const columns: ColumnsType<Invoice> = [
    {
      title: "Invoice #",
      dataIndex: "invoice_number",
      key: "invoice_number",
      width: 150,
      render: (text: string, record: Invoice) => (
        <Button
          type="link"
          onClick={() => router.push(`/ops/invoices/${record.id}`)}
          style={{ padding: 0, height: "auto", fontWeight: 600, color: "#D4A843" }}
        >
          {text}
        </Button>
      ),
      ...getColumnSearchProps<Invoice>("invoice_number"),
    },
    {
      title: "Waybill #",
      dataIndex: "waybill_number",
      key: "waybill_number",
      width: 130,
      render: (text: string | null | undefined) => text || "—",
    },
    {
      title: "Trip #",
      dataIndex: "trip_number",
      key: "trip_number",
      width: 130,
      render: (text: string | null | undefined) => text || "—",
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 120,
      render: (d: string) => {
        if (!d) return "—";
        const dt = new Date(d + "T00:00:00");
        return dt.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
      },
      sorter: (a, b) => (a.date || "").localeCompare(b.date || ""),
    },
    {
      title: "Client",
      dataIndex: "customer_name",
      key: "customer_name",
      width: 200,
      ...getColumnSearchProps<Invoice>("customer_name"),
    },
    {
      title: "Amount (USD)",
      dataIndex: "total_usd",
      key: "total_usd",
      width: 140,
      align: "right",
      render: (_: number, record: Invoice) => (
        <span style={{ fontWeight: 700, fontFamily: "'Fira Code', monospace" }}>
          {fmtCurrency(record.total_usd, record.currency)}
        </span>
      ),
      sorter: (a, b) => Number(a.total_usd) - Number(b.total_usd),
    },
    {
      title: "Received (USD)",
      dataIndex: "amount_paid",
      key: "amount_paid",
      width: 130,
      align: "right",
      render: (v: number) => (
        <span style={{ fontFamily: "'Fira Code', monospace", color: "#52c41a" }}>
          {fmtCurrency(v, "USD")}
        </span>
      ),
    },
    {
      title: "Outstanding",
      dataIndex: "amount_outstanding",
      key: "amount_outstanding",
      width: 130,
      align: "right",
      render: (v: number) => (
        <span style={{ fontFamily: "'Fira Code', monospace", color: Number(v) > 0 ? "#fa8c16" : undefined }}>
          {fmtCurrency(v, "USD")}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: InvoiceStatus) => {
        const badge = STATUS_BADGE[status] || STATUS_BADGE.draft;
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
      width: 200,
      fixed: "right",
      render: (_: unknown, record: Invoice) => {
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
          </Space>
        );
      },
    },
  ];

  const { resizableColumns, components } = useResizableColumns(columns);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        padding: "var(--space-xl)",
      }}
    >
      <Card>
        <Flex vertical gap="middle" style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Flex gap="small">
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/dashboard")}>
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Invoice Verification
              </Title>
            </Flex>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Refresh
            </Button>
          </div>

          <Segmented
            options={STATUS_TABS.map((t) => ({ label: t.label, value: t.value }))}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as string)}
          />

          <Table<Invoice>
            rowKey="id"
            columns={resizableColumns}
            components={components}
            dataSource={invoices}
            rowSelection={getStandardRowSelection(
              1,
              20,
              selectedRowKeys,
              setSelectedRowKeys
            )}
            loading={isLoading}
            pagination={{
              total: totalCount,
              showSizeChanger: true,
              showTotal: (total) => `${total} invoices`,
            }}
            scroll={{ x: 1400 }}
            size="small"
            locale={{
              emptyText: (
                <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
                  No invoices found for this filter.
                </div>
              ),
            }}
          />
        </Flex>
      </Card>

      <RecordPaymentModal
        open={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedInvoice(null);
        }}
        onSuccess={() => {
          refetch();
        }}
        invoice={selectedInvoice}
      />
    </div>
  );
}
