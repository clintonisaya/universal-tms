"use client";

import { Table, Tag, Typography, Tooltip, Button, Space } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import type { ColumnsType } from "antd/es/table";
import type { Trip, TripStatus } from "@/types/trip";
import { useAuth } from "@/contexts/AuthContext";
import { TripStatusTag } from "@/components/ui/TripStatusTag";

const { Title, Text } = Typography;


const RETURN_STATUSES = new Set([
  "Dispatched (Return)", "Waiting for Loading (Return)", "Loading (Return)",
  "In Transit (Return)", "At Border (Return)", "Offloading (Return)",
  "Arrived at Yard", "Waiting for PODs",
]);

function getRiskColor(risk: string | null | undefined): string {
  switch (risk) {
    case "High":
      return "red";
    case "Medium":
      return "orange";
    case "Low":
      return "green";
    default:
      return "default";
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

interface RecentTripsTableProps {
  data: Trip[];
  loading?: boolean;
}

export function RecentTripsTable({ data, loading }: RecentTripsTableProps) {
  const router = useRouter();
  const { user } = useAuth();
  const showFinancialData = user?.role === "admin" || user?.role === "manager";

  const columns: ColumnsType<Trip> = [
    {
      title: "No.",
      key: "index",
      width: 45,
      render: (_: unknown, __: Trip, index: number) => index + 1,
    },
    {
      title: "Trip Number",
      dataIndex: "trip_number",
      key: "trip_number",
      width: 140,
      render: (text: string, record: Trip) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0, height: "auto", fontWeight: 600 }}
          onClick={() => router.push(`/ops/trips?trip=${record.id}`)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: "Route",
      dataIndex: "route_name",
      key: "route_name",
      width: 250,
      ellipsis: true,
      render: (text: string, record: Trip) => {
        const isReturn = RETURN_STATUSES.has(record.status);
        const display = isReturn && record.return_route_name ? record.return_route_name : text;
        return <Text>{display}</Text>;
      },
    },
    {
      title: "Location",
      dataIndex: "current_location",
      key: "current_location",
      width: 160,
      ellipsis: true,
      render: (text: string | null) =>
        text ? <Text>{text}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: TripStatus) => <TripStatusTag status={status} />,
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
      title: "",
      key: "actions",
      width: 50,
      render: (_: unknown, record: Trip) => (
        <div className="row-actions">
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/ops/trips?trip=${record.id}`)}
            />
          </Space>
        </div>
      ),
    },
  ];

  return (
    <div style={{ marginTop: 32 }}>
      <Title level={4} style={{ marginBottom: 16 }}>
        Recent Trips
      </Title>
      <Table<Trip>
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="small"
        tableLayout="fixed"
      />
    </div>
  );
}
