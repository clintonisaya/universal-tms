"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ProTable,
  ProColumns,
} from "@ant-design/pro-components";
import type { ActionType } from "@ant-design/pro-components";
import { Button, App, Popconfirm, Space, Tooltip } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  RocketOutlined,
  EditOutlined,
  LockOutlined,
  FileTextOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { getWaybillProgressStatus, type Waybill, type WaybillProgressStatus, type WaybillStatus } from "@/types/waybill";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/application/usePermissions";
import { apiFetch } from "@/hooks/application/useApi";
import { fmtCurrency } from "@/lib/utils";
import { CreateWaybillDrawer } from "@/components/waybills/CreateWaybillDrawer";
import { EditWaybillDrawer } from "@/components/waybills/EditWaybillDrawer";
import { WaybillDetailDrawer } from "@/components/waybills/WaybillDetailDrawer";
import { CreateTripDrawer } from "@/components/trips/CreateTripDrawer";
import { WaybillStatusTag } from "@/components/ui/WaybillStatusTag";

const STATUS_FILTERS: Record<string, { text: string }> = {
  Open: { text: "Open" },
  "In Progress": { text: "In Progress" },
  Completed: { text: "Completed" },
};

export default function WaybillsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const actionRef = useRef<ActionType>(null);

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editWaybillId, setEditWaybillId] = useState<string | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailWaybillId, setDetailWaybillId] = useState<string | null>(null);
  const [tripDrawerOpen, setTripDrawerOpen] = useState(false);
  const [tripDrawerWaybillId, setTripDrawerWaybillId] = useState<string | null>(null);
  const [tripDrawerRouteName, setTripDrawerRouteName] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);

  const handleDelete = async (waybill: Waybill) => {
    try {
      const response = await fetch(`/api/v1/waybills/${waybill.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        message.success("Waybill deleted successfully");
        actionRef.current?.reload();
      } else if (response.status === 409) {
        message.error("This waybill is linked to an active trip and cannot be deleted.");
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete waybill");
      }
    } catch {
      message.error("Network error");
    }
  };

  const handleCreateTrip = (waybill: Waybill) => {
    setTripDrawerWaybillId(waybill.id);
    setTripDrawerRouteName(`${waybill.origin} - ${waybill.destination}`);
    setTripDrawerOpen(true);
  };

  const handleGenerateInvoice = async (waybill: Waybill) => {
    setGeneratingInvoice(waybill.id);
    try {
      const invoice = await apiFetch<{ id: string }>(`/api/v1/invoices/from-waybill/${waybill.id}`, {
        method: "POST",
      });
      message.success("Invoice draft created");
      actionRef.current?.reload();
      router.push(`/ops/invoices/${invoice.id}`);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "status" in err && err.status === 409) {
        message.info("Invoice already exists for this waybill");
      } else {
        const detail = typeof err === "object" && err !== null && "detail" in err
          ? err.detail
          : undefined;
        message.error(typeof detail === "string" ? detail : "Failed to generate invoice");
      }
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const columns: ProColumns<Waybill>[] = [
    {
      title: "Waybill #",
      dataIndex: "waybill_number",
      key: "waybill_number",
      width: 140,
      sorter: true,
      fieldProps: { placeholder: "Search waybill number" },
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => {
            setDetailWaybillId(record.id);
            setDetailDrawerOpen(true);
          }}
          style={{ padding: 0, height: "auto", fontWeight: 600 }}
        >
          {record.waybill_number}
        </Button>
      ),
    },
    {
      title: "Trip #",
      dataIndex: "trip_number",
      key: "trip_number",
      width: 110,
      search: false,
      render: (_, record) => record.trip_number || "—",
    },
    {
      title: "Client",
      dataIndex: "client_name",
      key: "client_name",
      width: 160,
      sorter: true,
      fieldProps: { placeholder: "Search client" },
      render: (_, record) => record.client_name || "-",
    },
    {
      title: "Origin",
      dataIndex: "origin",
      key: "origin",
      width: 140,
      sorter: true,
      fieldProps: { placeholder: "Search origin" },
      render: (_, record) => record.origin || "-",
    },
    {
      title: "Destination",
      dataIndex: "destination",
      key: "destination",
      width: 140,
      sorter: true,
      fieldProps: { placeholder: "Search destination" },
      render: (_, record) => record.destination || "-",
    },
    {
      title: "Cargo",
      dataIndex: "cargo_type",
      key: "cargo_type",
      width: 120,
      search: false,
      render: (_, record) => record.cargo_type || "-",
    },
    {
      title: "Loading Date",
      dataIndex: "expected_loading_date",
      key: "expected_loading_date",
      width: 120,
      valueType: "date",
      sorter: true,
      search: false,
      render: (_, record) => record.expected_loading_date ? new Date(record.expected_loading_date).toLocaleDateString() : "-",
    },
    ...(hasPermission("waybills:view-rate")
      ? [
          {
            title: "Rate",
            dataIndex: "agreed_rate",
            key: "agreed_rate",
            width: 140,
            align: "right" as const,
            search: false,
            sorter: true,
            render: (_: unknown, record: Waybill) =>
              record.agreed_rate ? fmtCurrency(record.agreed_rate, record.currency) : "-",
          } as ProColumns<Waybill>,
        ]
      : []),
    {
      title: "Invoice",
      key: "invoice",
      width: 130,
      search: false,
      render: (_, record) => {
        if (!record.invoice_id) return <span style={{ color: "var(--color-text-muted, #999)" }}>—</span>;
        const statusColors: Record<string, string> = {
          draft: "#8c8c8c",
          issued: "#1677ff",
          partially_paid: "#fa8c16",
          fully_paid: "#52c41a",
          voided: "#ff4d4f",
        };
        const statusLabels: Record<string, string> = {
          draft: "Draft",
          issued: "Issued",
          partially_paid: "Partial",
          fully_paid: "Paid",
          voided: "Voided",
        };
        const s = record.invoice_status || "draft";
        return (
          <Tooltip title={`Invoice ${record.invoice_number}`}>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, height: "auto", color: "var(--color-primary)", fontWeight: 600 }}
              onClick={() => router.push(`/ops/invoices/${record.invoice_id}`)}
            >
              {record.invoice_number}
            </Button>
            <span
              style={{
                display: "inline-block",
                marginLeft: 6,
                padding: "0 6px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                color: "#fff",
                background: statusColors[s] || "#8c8c8c",
              }}
            >
              {statusLabels[s] || s}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      valueType: "select",
      valueEnum: STATUS_FILTERS,
      render: (_, record) => (
        <WaybillStatusTag status={record.status} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 170,
      valueType: "option",
      fixed: "right",
      search: false,
      render: (_, record) => (
        <Space size="small">
          {record.status === "Open" && (
            <Button
              type="primary"
              size="small"
              icon={<RocketOutlined />}
              onClick={() => handleCreateTrip(record)}
            >
              Dispatch
            </Button>
          )}
          {record.invoice_id ? (
            <Tooltip title={`View ${record.invoice_number}`}>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => router.push(`/ops/invoices/${record.invoice_id}`)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Generate Invoice">
              <Button
                size="small"
                icon={<FileTextOutlined />}
                loading={generatingInvoice === record.id}
                onClick={() => handleGenerateInvoice(record)}
              />
            </Tooltip>
          )}
          {(record.status === "Completed" || record.status === "Invoiced") &&
           !hasPermission("waybills:unlock") ? (
            <Tooltip title="Locked — only Manager/Admin can edit">
              <Button size="small" icon={<LockOutlined />} disabled />
            </Tooltip>
          ) : (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditWaybillId(record.id);
                setEditDrawerOpen(true);
              }}
            />
          )}
          <Popconfirm
            title="Delete waybill"
            description="This action cannot be undone. The waybill must have no active trips to be deleted."
            onConfirm={() => handleDelete(record)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<Waybill>
        headerTitle="Waybills"
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        request={async (params) => {
          const { current, pageSize, status, ...rest } = params;
          const skip = ((current || 1) - 1) * (pageSize || 20);
          const qs = new URLSearchParams();
          qs.set("skip", String(skip));
          qs.set("limit", String(pageSize || 20));
          if (status) qs.set("status", status as string);
          const search = new URLSearchParams();
          for (const [key, value] of Object.entries(rest)) {
            if (value != null && value !== "") search.set(key, String(value));
          }
          const data = await apiFetch<{ data: Waybill[]; count: number }>(`/api/v1/waybills?${qs.toString()}`);
          let rows = data.data || [];
          const searchStr = search.toString();
          if (searchStr) {
            const params = new URLSearchParams(searchStr);
            rows = rows.filter((row) =>
              Array.from(params.entries()).every(([k, v]) => {
                const field = (row as unknown as Record<string, unknown>)[k];
                return field != null && String(field).toLowerCase().includes(String(v).toLowerCase());
              })
            );
          }
          return {
            data: rows,
            total: data.count || 0,
            success: true,
          };
        }}
        search={{ labelWidth: "auto" }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total) => `Total ${total} waybills`,
        }}
        scroll={{ x: "max-content" }}
        toolBarRender={() => [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            Refresh
          </Button>,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateDrawerOpen(true)}
          >
            New Waybill
          </Button>,
        ]}
      />

      <CreateWaybillDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onSuccess={() => actionRef.current?.reload()}
      />

      <EditWaybillDrawer
        open={editDrawerOpen}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditWaybillId(null);
        }}
        onSuccess={() => actionRef.current?.reload()}
        waybillId={editWaybillId}
      />

      <WaybillDetailDrawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setDetailWaybillId(null);
        }}
        waybillId={detailWaybillId}
      />

      <CreateTripDrawer
        open={tripDrawerOpen}
        onClose={() => {
          setTripDrawerOpen(false);
          setTripDrawerWaybillId(null);
          setTripDrawerRouteName(null);
        }}
        onSuccess={() => actionRef.current?.reload()}
        waybillId={tripDrawerWaybillId}
        routeName={tripDrawerRouteName}
      />
    </>
  );
}
