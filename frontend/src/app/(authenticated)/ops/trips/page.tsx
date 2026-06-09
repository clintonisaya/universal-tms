"use client";

import { useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ProTable,
  ProColumns,
} from "@ant-design/pro-components";
import type { ActionType } from "@ant-design/pro-components";
import { Button, App, Popconfirm, Space, Tag, Tooltip, theme } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import type { Trip, TripStatus } from "@/types/trip";
import { useAuth } from "@/contexts/AuthContext";
import { useInvalidateQueries, useToggleTripExpenseWindow, apiFetch } from "@/hooks/application/useApi";
import { usePermissions } from "@/hooks/application/usePermissions";
import { CreateTripDrawer } from "@/components/trips/CreateTripDrawer";
import { UpdateTripDrawer } from "@/components/trips/UpdateTripDrawer";
import { TripDetailDrawer } from "@/components/trips/TripDetailDrawer";
import { TripStatusTag } from "@/components/ui/TripStatusTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RETURN_DIRECTION_STATUSES } from "@/constants/tripStatuses";

function getRiskCssColor(risk: string | null | undefined): string {
  switch (risk) {
    case "High": return "var(--color-red)";
    case "Medium": return "var(--color-orange)";
    case "Low": return "var(--color-green)";
    default: return "var(--color-text-muted)";
  }
}

function formatCurrency(rate: number | null | undefined, currency: string | null | undefined): string {
  if (rate == null) return "-";
  const symbol = currency === "TZS" ? "TZS" : "USD";
  return `${symbol} ${Number(rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const RETURN_STATUSES = new Set(RETURN_DIRECTION_STATUSES);

function TripsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { user } = useAuth();
  const { invalidateTrips } = useInvalidateQueries();
  const actionRef = useRef<ActionType>();

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [detailDrawerTripId, setDetailDrawerTripId] = useState<string | null>(null);
  const [updateDrawerTripId, setUpdateDrawerTripId] = useState<string | null>(null);
  const { hasPermission } = usePermissions();
  const canManageExpenseWindow = hasPermission("trips:edit");
  const toggleExpenseWindow = useToggleTripExpenseWindow();

  const showFinancialData = hasPermission("trips:view-financials");

  const handleDelete = async (trip: Trip) => {
    try {
      const response = await fetch(`/api/v1/trips/${trip.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        message.success("Trip deleted successfully");
        actionRef.current?.reload();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete trip");
      }
    } catch {
      message.error("Network error");
    }
  };

  const handleToggleExpenseWindow = (trip: Trip) => {
    const newState = !trip.expense_window_open;
    toggleExpenseWindow.mutate(
      { tripId: trip.id, expenseWindowOpen: newState },
      {
        onSuccess: () => {
          message.success(
            `Expense window ${newState ? "opened" : "closed"} for ${trip.trip_number}`
          );
          actionRef.current?.reload();
        },
        onError: () => {
          message.error("Failed to toggle expense window");
        },
      }
    );
  };

  const columns: ProColumns<Trip>[] = [
    {
      title: "Trip Number",
      dataIndex: "trip_number",
      key: "trip_number",
      width: 120,
      sorter: true,
      fieldProps: { placeholder: "Search trip number" },
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => setDetailDrawerTripId(record.id)}
          style={{ padding: 0, height: "auto", fontWeight: 600 }}
        >
          {record.trip_number}
        </Button>
      ),
    },
    {
      title: "Route",
      dataIndex: "route_name",
      key: "route_name",
      width: 220,
      ellipsis: true,
      sorter: true,
      fieldProps: { placeholder: "Search route" },
      render: (_, record) => {
        const isReturn = RETURN_STATUSES.has(record.status);
        const display = isReturn && record.return_route_name ? record.return_route_name : record.route_name;
        return <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{display}</div>;
      },
    },
    {
      title: "Direction",
      dataIndex: "return_waybill_id",
      key: "direction",
      width: 80,
      search: false,
      render: (_, record) => (
        <StatusBadge
          status={record.return_waybill_id ? "Return" : "Go"}
          colorKey={record.return_waybill_id ? "blue" : "gray"}
        />
      ),
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      width: 110,
      valueType: "date",
      sorter: true,
      search: false,
      render: (_, record) => record.start_date ? new Date(record.start_date).toLocaleDateString() : "-",
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      key: "end_date",
      width: 110,
      valueType: "date",
      sorter: true,
      search: false,
      render: (_, record) => record.end_date ? new Date(record.end_date).toLocaleDateString() : "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      valueType: "select",
      valueEnum: {
        "Waiting": { text: "Waiting" },
        "Dispatched": { text: "Dispatched" },
        "Arrived at Loading Point": { text: "Arrived at Loading Point" },
        "Loading": { text: "Loading" },
        "Loaded": { text: "Loaded" },
        "In Transit": { text: "In Transit" },
        "At Border": { text: "At Border" },
        "Arrived at Destination": { text: "Arrived at Destination" },
        "Offloading": { text: "Offloading" },
        "Offloaded": { text: "Offloaded" },
        "Returning Empty": { text: "Returning Empty" },
        "Dispatched (Return)": { text: "Dispatched (Return)" },
        "Arrived at Loading Point (Return)": { text: "Arrived at Loading Point (Return)" },
        "Loading (Return)": { text: "Loading (Return)" },
        "Loaded (Return)": { text: "Loaded (Return)" },
        "In Transit (Return)": { text: "In Transit (Return)" },
        "At Border (Return)": { text: "At Border (Return)" },
        "Arrived at Destination (Return)": { text: "Arrived at Destination (Return)" },
        "Offloading (Return)": { text: "Offloading (Return)" },
        "Offloaded (Return)": { text: "Offloaded (Return)" },
        "Arrived at Yard": { text: "Arrived at Yard" },
        "Waiting for PODs": { text: "Waiting for PODs" },
        "Completed": { text: "Completed" },
        "Cancelled": { text: "Cancelled" },
      },
      render: (_, record) => (
        <div>
          <TripStatusTag status={record.status} />
          {record.expense_window_open && (
            <Tag color="gold" style={{ marginTop: 4, fontSize: 11 }}>
              <UnlockOutlined /> Expenses Open
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "",
      dataIndex: "remarks",
      key: "remarks",
      width: 32,
      search: false,
      render: (_, record) =>
        record.remarks ? (
          <Tooltip
            title={
              record.remarks.length > 100
                ? record.remarks.slice(0, 100) + "…"
                : record.remarks
            }
          >
            <MessageOutlined style={{ color: token.colorTextSecondary }} />
          </Tooltip>
        ) : null,
    },
    {
      title: "Last Updated",
      dataIndex: "location_update_time",
      key: "location_update_time",
      width: 110,
      search: false,
      sorter: true,
      render: (_, record) => (
        <Tooltip title={record.location_update_time ? new Date(record.location_update_time).toLocaleString() : undefined}>
          <span style={{ color: token.colorTextSecondary }}>
            {formatRelativeTime(record.location_update_time)}
          </span>
        </Tooltip>
      ),
    },
    ...(showFinancialData
      ? [
          {
            title: "Rate",
            dataIndex: "waybill_rate",
            key: "rate",
            width: 120,
            search: false,
            render: (_: unknown, record: Trip) => {
              const isReturn = RETURN_STATUSES.has(record.status);
              const rate = isReturn ? record.return_waybill_rate : record.waybill_rate;
              const currency = isReturn ? record.return_waybill_currency : record.waybill_currency;
              return rate != null ? (
                <span>{formatCurrency(rate, currency)}</span>
              ) : (
                <span style={{ color: token.colorTextSecondary }}>-</span>
              );
            },
          } as ProColumns<Trip>,
        ]
      : []),
    {
      title: "Risk",
      dataIndex: "waybill_risk_level",
      key: "risk",
      width: 80,
      search: false,
      render: (_, record) => {
        const risk = record.waybill_risk_level;
        if (!risk) return <span style={{ color: token.colorTextSecondary }}>-</span>;
        const color = getRiskCssColor(risk);
        return (
          <span style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 6,
            background: `color-mix(in srgb, ${color} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
            color,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}>
            {risk}
          </span>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      valueType: "option",
      fixed: "right",
      search: false,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailDrawerTripId(record.id)}
            aria-label={`View Trip ${record.trip_number}`}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setUpdateDrawerTripId(record.id)}
            aria-label={`Edit Trip ${record.trip_number}`}
          />
          {canManageExpenseWindow && ["Completed", "Cancelled"].includes(record.status) && (
            <Tooltip
              title={
                record.expense_window_open
                  ? "Close Expense Window"
                  : "Open Expense Window"
              }
            >
              <Button
                type="text"
                size="small"
                icon={record.expense_window_open ? <LockOutlined /> : <UnlockOutlined />}
                onClick={() => handleToggleExpenseWindow(record)}
                style={{
                  color: record.expense_window_open ? "#cf1322" : "#52c41a",
                }}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="Delete trip"
            description="Are you sure you want to delete this trip?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label={`Delete Trip ${record.trip_number}`} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
    <ProTable<Trip>
      headerTitle="Trips"
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
        const data = await apiFetch<{ data: Trip[]; count: number }>(`/api/v1/trips?${qs.toString()}`);
        return {
          data: data.data || [],
          total: data.count || 0,
          success: true,
        };
      }}
      params={{ status: searchParams.get("status") || undefined }}
      search={{ labelWidth: "auto", collapsed: false }}
      pagination={{
        defaultPageSize: 20,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
        showTotal: (total) => `Total ${total} trips`,
      }}
      scroll={{ x: "max-content" }}
      onRow={(record) => ({
        style: record.is_delayed ? { backgroundColor: "color-mix(in srgb, var(--color-orange) 10%, transparent)" } : undefined,
      })}
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
          New Trip
        </Button>,
      ]}
      rowClassName={(record) => record.is_delayed ? "ant-table-row-delayed" : ""}
    />

      <CreateTripDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onSuccess={() => actionRef.current?.reload()}
      />

      <UpdateTripDrawer
        open={!!updateDrawerTripId}
        onClose={() => setUpdateDrawerTripId(null)}
        onSuccess={() => actionRef.current?.reload()}
        tripId={updateDrawerTripId}
      />

      <TripDetailDrawer
        open={!!detailDrawerTripId}
        onClose={() => setDetailDrawerTripId(null)}
        tripId={detailDrawerTripId}
        onEdit={(id) => {
          setDetailDrawerTripId(null);
          setUpdateDrawerTripId(id);
        }}
      />
    </>
  );
}

export default function TripsPage() {
  return (
    <App>
      <Suspense>
        <TripsPageContent />
      </Suspense>
    </App>
  );
}
