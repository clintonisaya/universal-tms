"use client";

import { Table, Tag, Card, Button } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import type { ColumnsType } from "antd/es/table";

interface RecentTrip {
  id: string;
  trip_number: string;
  route_name: string;
  status: string;
  current_location: string | null;
  created_at: string | null;
}

interface RecentTripsTableProps {
  data: RecentTrip[];
  loading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  Loading: "default",
  "In Transit": "processing",
  "At Border": "warning",
  Offloaded: "cyan",
  Returned: "purple",
  "Waiting for PODs": "orange",
  Completed: "success",
  Cancelled: "error",
};

export function RecentTripsTable({ data, loading }: RecentTripsTableProps) {
  const router = useRouter();

  const columns: ColumnsType<RecentTrip> = [
    {
      title: "Trip #",
      dataIndex: "trip_number",
      key: "trip_number",
      width: 160,
    },
    {
      title: "Route",
      dataIndex: "route_name",
      key: "route_name",
    },
    {
      title: "Location",
      dataIndex: "current_location",
      key: "current_location",
      render: (loc: string | null) => loc || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || "default"}>{status}</Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string | null) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "",
      key: "action",
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/ops/trips/${record.id}`)}
        />
      ),
    },
  ];

  return (
    <Card
      title={
        <span style={{ fontSize: 14, fontWeight: 600 }}>Recent Trips</span>
      }
      style={{ marginTop: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
      bodyStyle={{ padding: 0 }}
      extra={
        <Button type="link" size="small" onClick={() => router.push("/ops/trips")}>
          View All
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        pagination={false}
        loading={loading}
        size="small"
      />
    </Card>
  );
}
