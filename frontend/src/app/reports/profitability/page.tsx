"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  message,
  Typography,
  Spin,
  Tag,
  Statistic,
  Row,
  Col,
} from "antd";
import {
  ReloadOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  getColumnSearchProps,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title, Text } = Typography;

interface TripProfitability {
  trip_id: string;
  trip_number: string;
  route_name: string;
  client: string;
  status: string;
  income: number;
  expenses: number;
  net_profit: number;
  margin_pct: number;
  start_date: string | null;
}

interface ProfitabilitySummary {
  total_income: number;
  total_expenses: number;
  total_profit: number;
  average_margin_pct: number;
}

interface ProfitabilityResponse {
  data: TripProfitability[];
  total: number;
  summary: ProfitabilitySummary;
}

const STATUS_COLORS: Record<string, string> = {
  Loading: "blue",
  "In Transit": "processing",
  "At Border": "orange",
  Offloaded: "purple",
  Returned: "cyan",
  "Waiting for PODs": "gold",
  Completed: "green",
  Cancelled: "red",
};

export default function TripProfitabilityPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<TripProfitability[]>([]);
  const [summary, setSummary] = useState<ProfitabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<string>("margin");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (currentPage - 1) * pageSize;
      const response = await fetch(
        `/api/v1/reports/trip-profitability?skip=${skip}&limit=${pageSize}&sort_by=${sortBy}&sort_order=${sortOrder}`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const result: ProfitabilityResponse = await response.json();
        setData(result.data);
        setTotal(result.total);
        setSummary(result.summary);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        message.error("Failed to fetch profitability data");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [router, currentPage, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user, fetchData]);

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);

    if (sorter.field) {
      const fieldMap: Record<string, string> = {
        margin_pct: "margin",
        net_profit: "profit",
        income: "income",
        expenses: "expenses",
        trip_number: "trip_number",
      };
      setSortBy(fieldMap[sorter.field] || "margin");
      setSortOrder(sorter.order === "descend" ? "desc" : "asc");
    }
  };

  const columns: ColumnsType<TripProfitability> = [
    {
      title: "Trip #",
      dataIndex: "trip_number",
      key: "trip_number",
      width: 130,
      render: (num: string, record) => (
        <a
          onClick={() => router.push(`/ops/trips/${record.trip_id}`)}
          style={{ fontWeight: 600, color: "#1890ff", cursor: "pointer" }}
        >
          {num}
        </a>
      ),
      ...getColumnSearchProps("trip_number"),
      sorter: true,
    },
    {
      title: "Route",
      dataIndex: "route_name",
      key: "route_name",
      ellipsis: true,
      ...getColumnSearchProps("route_name"),
    },
    {
      title: "Client",
      dataIndex: "client",
      key: "client",
      width: 150,
      ellipsis: true,
      ...getColumnSearchProps("client"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || "default"}>{status}</Tag>
      ),
    },
    {
      title: "Income (TZS)",
      dataIndex: "income",
      key: "income",
      width: 140,
      align: "right",
      render: (val: number) => (
        <Text style={{ color: "#52c41a", fontWeight: 500 }}>
          {val.toLocaleString()}
        </Text>
      ),
      sorter: true,
    },
    {
      title: "Expenses (TZS)",
      dataIndex: "expenses",
      key: "expenses",
      width: 140,
      align: "right",
      render: (val: number) => (
        <Text style={{ color: "#ff4d4f", fontWeight: 500 }}>
          {val.toLocaleString()}
        </Text>
      ),
      sorter: true,
    },
    {
      title: "Net Profit (TZS)",
      dataIndex: "net_profit",
      key: "net_profit",
      width: 150,
      align: "right",
      render: (val: number) => (
        <Text
          style={{
            color: val >= 0 ? "#52c41a" : "#ff4d4f",
            fontWeight: 600,
          }}
        >
          {val >= 0 ? "+" : ""}
          {val.toLocaleString()}
        </Text>
      ),
      sorter: true,
    },
    {
      title: "Margin %",
      dataIndex: "margin_pct",
      key: "margin_pct",
      width: 120,
      align: "right",
      render: (val: number) => {
        const color = val >= 20 ? "#52c41a" : val >= 10 ? "#faad14" : "#ff4d4f";
        const icon =
          val >= 0 ? (
            <ArrowUpOutlined style={{ fontSize: 10 }} />
          ) : (
            <ArrowDownOutlined style={{ fontSize: 10 }} />
          );
        return (
          <Tag
            color={color}
            style={{
              fontWeight: 600,
              minWidth: 70,
              textAlign: "center",
            }}
          >
            {icon} {val.toFixed(1)}%
          </Tag>
        );
      },
      sorter: true,
      defaultSortOrder: "ascend",
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      fixed: "right",
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          title="View Trip Details"
          onClick={() => router.push(`/ops/trips/${record.trip_id}`)}
        />
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
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={summary?.total_income || 0}
              prefix="TZS"
              styles={{ content: { color: "#52c41a" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Expenses"
              value={summary?.total_expenses || 0}
              prefix="TZS"
              styles={{ content: { color: "#ff4d4f" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Profit"
              value={summary?.total_profit || 0}
              prefix="TZS"
              styles={{
                content: {
                  color: (summary?.total_profit || 0) >= 0 ? "#52c41a" : "#ff4d4f",
                }
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Average Margin"
              value={summary?.average_margin_pct || 0}
              suffix="%"
              precision={1}
              styles={{
                content: {
                  color:
                    (summary?.average_margin_pct || 0) >= 20
                      ? "#52c41a"
                      : (summary?.average_margin_pct || 0) >= 10
                      ? "#faad14"
                      : "#ff4d4f",
                }
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Data Table */}
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
                Trip Profitability Report
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>
                Refresh
              </Button>
            </Space>
          </div>

          <Text type="secondary">
            Shows all trips with waybills. Sort by Margin % to identify least
            profitable trips. All values normalized to TZS.
          </Text>

          <Table<TripProfitability>
            columns={resizableColumns}
            components={components}
            dataSource={data}
            rowKey="trip_id"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            scroll={{ x: 1200 }}
            onChange={handleTableChange}
            pagination={{
              current: currentPage,
              pageSize,
              total,
              showTotal: (t) => `Total ${t} trips`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
            rowClassName={(record) => {
              if (record.margin_pct < 0) return "row-loss";
              if (record.margin_pct < 10) return "row-low-margin";
              return "";
            }}
          />
        </Space>
      </Card>

      <style jsx global>{`
        .row-loss {
          background-color: #fff1f0 !important;
        }
        .row-low-margin {
          background-color: #fffbe6 !important;
        }
        .row-loss:hover td,
        .row-low-margin:hover td {
          background: inherit !important;
        }
      `}</style>
    </div>
  );
}
