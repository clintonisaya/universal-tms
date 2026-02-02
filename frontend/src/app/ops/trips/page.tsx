"use client";

import { useState, useEffect, useCallback } from "react";
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
import type { Trip, TripStatus, TripsResponse } from "@/types/trip";
import { useAuth } from "@/contexts/AuthContext";

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

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/trips/", {
        credentials: "include",
      });
      if (response.ok) {
        const data: TripsResponse = await response.json();
        setTrips(data.data);
        setTotalCount(data.count);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        message.error("Failed to fetch trips");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTrips();
    }
  }, [authLoading, user, fetchTrips]);

  const handleDelete = async (trip: Trip) => {
    try {
      const response = await fetch(`/api/v1/trips/${trip.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        message.success("Trip deleted successfully");
        fetchTrips();
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
      sorter: (a, b) => (a.trip_number || "").localeCompare(b.trip_number || ""),
    },
    {
      title: "Route",
      dataIndex: "route_name",
      key: "route_name",
      sorter: (a, b) => a.route_name.localeCompare(b.route_name),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: TripStatus) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
      filters: Object.keys(STATUS_COLORS).map((status) => ({
        text: status,
        value: status,
      })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      render: (date: string | null) =>
        date ? new Date(date).toLocaleDateString() : "-",
      sorter: (a, b) => {
        if (!a.start_date) return 1;
        if (!b.start_date) return -1;
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      },
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      key: "end_date",
      render: (date: string | null) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/ops/trips/${record.id}`)}
          />
          <Popconfirm
            title="Delete trip"
            description="Are you sure you want to delete this trip?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

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
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
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
              <Button icon={<ReloadOutlined />} onClick={fetchTrips}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push("/ops/trips/new")}
              >
                New Trip
              </Button>
            </Space>
          </div>

          <Table<Trip>
            columns={columns}
            dataSource={trips}
            rowKey="id"
            loading={loading}
            pagination={{
              total: totalCount,
              showTotal: (total) => `Total ${total} trips`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
          />
        </Space>
      </Card>
    </div>
  );
}
