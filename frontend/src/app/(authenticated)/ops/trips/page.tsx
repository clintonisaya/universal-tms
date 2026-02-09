"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  message,
  Typography,
  Spin,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Trip, TripStatus } from "@/types/trip";
import { useAuth } from "@/contexts/AuthContext";
import { useTrips, useInvalidateQueries } from "@/hooks/useApi";
import { CreateTripDrawer } from "@/components/trips/CreateTripDrawer";
import { TripDetailDrawer } from "@/components/trips/TripDetailDrawer";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title } = Typography;

const STATUS_COLORS: Record<TripStatus, string> = {
  Loading: "gold",
  "In Transit": "blue",
  "At Border": "purple",
  Offloaded: "cyan",
  Returned: "geekblue",
  "Waiting for PODs": "orange",
  Completed: "green",
  Cancelled: "red",
};

const STATUS_FILTERS = Object.keys(STATUS_COLORS).map((status) => ({
  text: status,
  value: status,
}));

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { invalidateTrips } = useInvalidateQueries();

  // Only fetch when user is authenticated
  const isAuthenticated = !!user && !authLoading;

  // TanStack Query for trips data
  const { data, isLoading: loading, refetch } = useTrips(undefined, isAuthenticated);
  const trips = data?.data || [];
  const totalCount = data?.count || 0;

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [detailDrawerTripId, setDetailDrawerTripId] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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
      width: 150,
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
      render: (text: string) => (
        <div style={{ fontWeight: 500 }}>{text}</div>
      ),
      ...getColumnSearchProps<Trip>("route_name"),
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      width: 120,
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : "-",
      sorter: (a, b) => (a.start_date || "").localeCompare(b.start_date || ""),
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      key: "end_date",
      width: 120,
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : "-",
      sorter: (a, b) => (a.end_date || "").localeCompare(b.end_date || ""),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: TripStatus) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
      ...getColumnFilterProps("status", STATUS_FILTERS),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setDetailDrawerTripId(record.id)}
            />
            <Popconfirm
              title="Delete trip"
              description="Are you sure you want to delete this trip?"
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        </div>
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

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
            columns={resizableColumns}
            components={components}
            dataSource={trips}
            rowKey="id"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
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

      <TripDetailDrawer
        open={!!detailDrawerTripId}
        onClose={() => setDetailDrawerTripId(null)}
        tripId={detailDrawerTripId}
      />
    </div>
  );
}
