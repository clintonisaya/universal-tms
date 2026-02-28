"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  Typography,
  Tooltip,
  Popconfirm,
  App,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Trip, TripStatus } from "@/types/trip";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTrips, useInvalidateQueries } from "@/hooks/useApi";
import { EmptyState } from "@/components/ui";
import { CreateTripDrawer } from "@/components/trips/CreateTripDrawer";
import { UpdateTripDrawer } from "@/components/trips/UpdateTripDrawer";
import { TripDetailDrawer } from "@/components/trips/TripDetailDrawer";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";
import { TripStatusTag } from "@/components/ui/TripStatusTag";

const { Title, Text } = Typography;

function getRiskColor(risk: string | null | undefined): string {
  switch (risk) {
    case "High": return "red";
    case "Medium": return "orange";
    case "Low": return "green";
    default: return "default";
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

const RETURN_STATUSES = new Set([
  "Dispatched (Return)", "Arrived at Loading Point (Return)", "Loading (Return)",
  "Loaded (Return)", "In Transit (Return)", "At Border (Return)",
  "Arrived at Destination (Return)", "Offloading (Return)", "Offloaded (Return)",
  "Arrived at Yard", "Waiting for PODs",
]);

const STATUS_FILTERS: { text: string; value: string }[] = [
  "Waiting", "Dispatched", "Arrived at Loading Point", "Loading", "Loaded",
  "In Transit", "At Border", "Arrived at Destination", "Offloading", "Offloaded",
  "Returning Empty",
  "Dispatched (Return)", "Arrived at Loading Point (Return)", "Loading (Return)",
  "Loaded (Return)", "In Transit (Return)", "At Border (Return)",
  "Arrived at Destination (Return)", "Offloading (Return)", "Offloaded (Return)",
  "Arrived at Yard", "Waiting for PODs", "Completed", "Cancelled",
].map((s) => ({ text: s, value: s }));

const DIRECTION_FILTERS = [
  { text: "Go", value: "go" },
  { text: "Return", value: "return" },
];

function TripsPageContent() {
  const router = useRouter();
  const { message } = App.useApp();
  const { user } = useAuth();
  const { invalidateTrips } = useInvalidateQueries();

  // Only fetch when user is authenticated
  const isAuthenticated = !!user;

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [detailDrawerTripId, setDetailDrawerTripId] = useState<string | null>(null);
  const [updateDrawerTripId, setUpdateDrawerTripId] = useState<string | null>(null);
  const { hasPermission } = usePermissions();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tableFilters, setTableFilters] = useState<Record<string, any>>({});
  const [tableKey, setTableKey] = useState(0);

  // TanStack Query for trips data — server-side pagination
  const { data, isLoading: loading, refetch } = useTrips(
    { skip: (currentPage - 1) * pageSize, limit: pageSize },
    isAuthenticated
  );
  const trips = data?.data || [];
  const totalCount = data?.count || 0;

  const showFinancialData = user?.role === "admin" || user?.role === "manager";

  const hasActiveFilters = Object.values(tableFilters).some(
    (v) => v != null && (Array.isArray(v) ? v.length > 0 : true)
  );
  const clearAllFilters = () => { setTableFilters({}); setTableKey((k) => k + 1); };

  const handleDelete = async (trip: Trip) => {
    try {
      const response = await fetch(`/api/v1/trips/${trip.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        message.success("Trip deleted successfully");
        invalidateTrips();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete trip");
      }
    } catch {
      message.error("Network error");
    }
  };

  const columns: ColumnsType<Trip> = [
    {
      title: "Trip Number",
      dataIndex: "trip_number",
      key: "trip_number",
      width: 140,
      sorter: (a, b) => (a.trip_number || "").localeCompare(b.trip_number || ""),
      render: (text: string, record: Trip) => (
        <Button
          type="link"
          onClick={() => setDetailDrawerTripId(record.id)}
          style={{ padding: 0, height: "auto", fontWeight: 600 }}
        >
          {text}
        </Button>
      ),
      ...getColumnSearchProps<Trip>("trip_number"),
    },
    {
      title: "Route",
      dataIndex: "route_name",
      key: "route_name",
      sorter: (a, b) => a.route_name.localeCompare(b.route_name),
      render: (text: string, record: Trip) => {
        const isReturn = RETURN_STATUSES.has(record.status);
        const display = isReturn && record.return_route_name ? record.return_route_name : text;
        return <div style={{ fontWeight: 500 }}>{display}</div>;
      },
      ...getColumnSearchProps<Trip>("route_name"),
    },
    {
      title: "Direction",
      dataIndex: "return_waybill_id",
      key: "direction",
      width: 90,
      render: (returnWaybillId: string | null) => (
        <Tag color={returnWaybillId ? "geekblue" : "default"}>
          {returnWaybillId ? "Return" : "Go"}
        </Tag>
      ),
      filters: DIRECTION_FILTERS,
      onFilter: (value, record) => {
        if (value === "return") return !!record.return_waybill_id;
        return !record.return_waybill_id;
      },
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      width: 100,
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : "-",
      sorter: (a, b) => (a.start_date || "").localeCompare(b.start_date || ""),
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      key: "end_date",
      width: 100,
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : "-",
      sorter: (a, b) => (a.end_date || "").localeCompare(b.end_date || ""),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: TripStatus) => <TripStatusTag status={status} />,
      ...getColumnFilterProps("status", STATUS_FILTERS),
    },
    {
      title: "Last Updated",
      dataIndex: "location_update_time",
      key: "location_update_time",
      width: 100,
      render: (date: string | null) => (
        <Tooltip title={date ? new Date(date).toLocaleString() : undefined}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatRelativeTime(date)}
          </Text>
        </Tooltip>
      ),
      sorter: (a, b) =>
        (a.location_update_time || "").localeCompare(b.location_update_time || ""),
    },
    ...(showFinancialData
      ? [
        {
          title: "Rate",
          dataIndex: "waybill_rate",
          key: "rate",
          width: 120,
          render: (_: unknown, record: Trip) => {
            const isReturn = RETURN_STATUSES.has(record.status);
            const rate = isReturn ? record.return_waybill_rate : record.waybill_rate;
            const currency = isReturn ? record.return_waybill_currency : record.waybill_currency;
            return rate != null ? (
              <Text>{formatCurrency(rate, currency)}</Text>
            ) : (
              <Text type="secondary">-</Text>
            );
          },
        } as ColumnsType<Trip>[number],
      ]
      : []),

    {
      title: "Risk",
      dataIndex: "waybill_risk_level",
      key: "risk",
      width: 70,
      render: (risk: string | null) =>
        risk ? <Tag color={getRiskColor(risk)}>{risk}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
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
        </div>
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "24px",
      }}
    >
      <Card>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/dashboard")}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Trips
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateDrawerOpen(true)}
              >
                New Trip
              </Button>
            </Space>
          </div>

          <Table<Trip>
            key={tableKey}
            columns={resizableColumns}
            components={components}
            dataSource={trips}
            rowKey="id"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            onChange={(_, filters) => setTableFilters(filters as Record<string, any>)}
            locale={{
              emptyText: hasActiveFilters ? (
                <EmptyState
                  message="No results match your filters."
                  action={{ label: "Clear Filters", onClick: clearAllFilters }}
                />
              ) : (
                <EmptyState
                  message="No trips found."
                  action={
                    hasPermission("trips:create")
                      ? { label: "Create Trip", onClick: () => setCreateDrawerOpen(true) }
                      : undefined
                  }
                />
              ),
            }}
            rowSelection={getStandardRowSelection(
              currentPage,
              pageSize,
              selectedRowKeys,
              setSelectedRowKeys
            )}
            pagination={{
              current: currentPage,
              pageSize,
              total: totalCount,
              showTotal: (total) => `Total ${total} trips`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
          />
        </Space>
      </Card>

      <CreateTripDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onSuccess={() => invalidateTrips()}
      />

      <UpdateTripDrawer
        open={!!updateDrawerTripId}
        onClose={() => setUpdateDrawerTripId(null)}
        onSuccess={() => invalidateTrips()}
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
    </div>
  );
}

export default function TripsPage() {
  return (
    <App>
      <TripsPageContent />
    </App>
  );
}
