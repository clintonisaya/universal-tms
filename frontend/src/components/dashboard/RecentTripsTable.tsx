"use client";

import { Table, Tag, Card, Button, Space } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "../ui/tableUtils";
import { formatRelativeTime } from "@/lib/utils";

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

const STATUS_FILTERS = Object.keys(STATUS_COLORS).map((status) => ({    
  text: status,
  value: status,
}));

export function RecentTripsTable({ data, loading }: RecentTripsTableProps) {
  const router = useRouter();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const columns: ColumnsType<RecentTrip> = [
    {
      title: "Trip #",
      dataIndex: "trip_number",
      key: "trip_number",
      width: 130,
      render: (text: string, record: RecentTrip) => (
        <Button
          type="link"
          onClick={() => router.push(`/ops/trips/${record.id}`)}
          style={{ padding: 0, height: "auto", fontWeight: 600 }}
        >
          {text}
        </Button>
      ),
      ...getColumnSearchProps("trip_number"),
    },
    {
      title: "Route",
      dataIndex: "route_name",
      key: "route_name",
      render: (text: string) => (
        <div style={{ fontWeight: 500 }}>{text}</div>
      ),
      ...getColumnSearchProps("route_name"),
    },
    {
      title: "Location",
      dataIndex: "current_location",
      key: "current_location",
      width: 140,
      render: (text: string | null) => text || "-",
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 100,
      render: (date: string | null) => formatRelativeTime(date),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || "default"}>{status}</Tag>
      ),
      ...getColumnFilterProps("status", STATUS_FILTERS),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/ops/trips/${record.id}`)}
          />
        </div>
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  return (
    <Card
      title={
        <span style={{ fontSize: 14, fontWeight: 600 }}>Recent Trips</span>
      }
      styles={{ body: { padding: 0 } }}
      style={{ marginTop: 24, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
      extra={
        <Button
          type="link"
          size="small"
          onClick={() => router.push("/ops/trips")}
        >
          View All
        </Button>
      }
    >
      <Table<RecentTrip>
        columns={resizableColumns}
        components={components}
        dataSource={data}
        rowKey="id"
        pagination={false}
        loading={loading}
        size="small"
        rowSelection={getStandardRowSelection(
          1,
          data.length || 10,
          selectedRowKeys,
          onSelectChange
        )}
      />
    </Card>
  );
}