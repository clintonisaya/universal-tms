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
  Tag,
  Statistic,
  Row,
  Col,
  Tooltip,
} from "antd";
import {
  ReloadOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  getColumnSearchProps,
  useResizableColumns,
} from "@/components/ui/tableUtils";
import { TripStatusTag } from "@/components/ui/TripStatusTag";
import type { TripStatus } from "@/types/trip";

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
  profit_per_day: number;
  start_date: string | null;
}

interface ProfitabilitySummary {
  total_income: number;
  total_expenses: number;
  total_profit: number;
  average_margin_pct: number;
  total_profit_per_day: number;
}

interface ProfitabilityResponse {
  data: TripProfitability[];
  total: number;
  summary: ProfitabilitySummary;
}


export default function TripProfitabilityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<TripProfitability[]>([]);
  const [summary, setSummary] = useState<ProfitabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<string>("margin");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Currency display
  const [displayCurrency, setDisplayCurrency] = useState<"TZS" | "USD">("TZS");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  // Fetch exchange rate mirroring the backend's get_current_exchange_rate fallback chain:
  //   1. Current month/year exact match
  //   2. Most recent rate overall (any month/year)
  //   3. Hardcoded default 2500 (same as backend Decimal("2500.00"))
  // This ensures the same rate is used for TZS→USD conversion as the backend used for
  // USD→TZS normalization when building the profitability data.
  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const resolveRate = async (): Promise<number> => {
      // Step 1: try current month (exact match + pre-month fallback from /current endpoint)
      const r1 = await fetch(
        `/api/v1/finance/exchange-rates/current?month=${month}&year=${year}`,
        { credentials: "include" }
      );
      if (r1.ok) {
        const d = await r1.json();
        if (d?.rate && Number(d.rate) > 1) return Number(d.rate);
      }

      // Step 2: mirror backend "most recent overall" — fetch list sorted by year/month desc
      const r2 = await fetch(
        `/api/v1/finance/exchange-rates?limit=1`,
        { credentials: "include" }
      );
      if (r2.ok) {
        const d = await r2.json();
        const first = d?.data?.[0];
        if (first?.rate && Number(first.rate) > 1) return Number(first.rate);
      }

      // Step 3: backend hardcoded default
      return 2500;
    };

    resolveRate()
      .then(setExchangeRate)
      .catch(() => setExchangeRate(2500));
  }, []);

  // Convert a TZS value to the selected display currency
  const toDisplay = useCallback(
    (val: number): number => {
      if (displayCurrency === "USD" && exchangeRate && exchangeRate > 1) {
        return val / exchangeRate;
      }
      return val;
    },
    [displayCurrency, exchangeRate]
  );

  // Format a display value with correct precision per currency
  const fmt = useCallback(
    (val: number): string => {
      const converted = toDisplay(val);
      if (displayCurrency === "USD") {
        return converted.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      }
      return converted.toLocaleString("en-US", { maximumFractionDigits: 0 });
    },
    [displayCurrency, toDisplay]
  );

  const cur = displayCurrency;
  // exchangeRate is always resolved (min 2500) — warn only if using the hardcoded default
  const usingDefaultRate = exchangeRate === 2500;
  const noRate = false; // USD toggle always available — rate is always resolved

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
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

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
      render: (status: string) => <TripStatusTag status={status as TripStatus} />,
    },
    {
      title: `Income (${cur})`,
      dataIndex: "income",
      key: "income",
      width: 150,
      align: "right",
      render: (val: number) => (
        <Text style={{ color: "#52c41a", fontWeight: 500 }}>
          {fmt(val)}
        </Text>
      ),
      sorter: true,
    },
    {
      title: `Expenses (${cur})`,
      dataIndex: "expenses",
      key: "expenses",
      width: 150,
      align: "right",
      render: (val: number) => (
        <Text style={{ color: "#ff4d4f", fontWeight: 500 }}>
          {fmt(val)}
        </Text>
      ),
      sorter: true,
    },
    {
      title: `Net Profit (${cur})`,
      dataIndex: "net_profit",
      key: "net_profit",
      width: 160,
      align: "right",
      render: (val: number) => (
        <Text
          style={{
            color: val >= 0 ? "#52c41a" : "#ff4d4f",
            fontWeight: 600,
          }}
        >
          {val >= 0 ? "+" : ""}
          {fmt(val)}
        </Text>
      ),
      sorter: true,
    },
    {
      title: `Profit/Day (${cur})`,
      dataIndex: "profit_per_day",
      key: "profit_per_day",
      width: 160,
      align: "right",
      render: (val: number) => (
        <Text
          style={{
            color: val >= 0 ? "#52c41a" : "#ff4d4f",
          }}
        >
          {fmt(val)}
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
          aria-label="View Trip Details"
          onClick={() => router.push(`/ops/trips/${record.trip_id}`)}
        />
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  // Currency toggle buttons
  const currencyToggle = (
    <Space size={4}>
      {(["TZS", "USD"] as const).map((c) => (
        <Button
          key={c}
          size="small"
          type={displayCurrency === c ? "primary" : "default"}
          onClick={() => setDisplayCurrency(c)}
        >
          {c}
        </Button>
      ))}
      {displayCurrency === "USD" && exchangeRate && (
        <Text type="secondary" style={{ fontSize: 11 }}>
          1 USD = {exchangeRate.toLocaleString("en-US")} TZS
          {usingDefaultRate && (
            <Tooltip title="No exchange rate found in Finance settings — using default rate of 2,500 TZS/USD. Set the current rate in Finance → Exchange Rates for accurate figures.">
              <InfoCircleOutlined style={{ color: "#faad14", marginLeft: 4 }} />
            </Tooltip>
          )}
        </Text>
      )}
    </Space>
  );

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
        <Col xs={24} sm={12} lg={5}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={toDisplay(summary?.total_income || 0)}
              prefix={cur}
              precision={displayCurrency === "USD" ? 2 : 0}
              styles={{ content: { color: "#52c41a" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <Card>
            <Statistic
              title="Total Expenses"
              value={toDisplay(summary?.total_expenses || 0)}
              prefix={cur}
              precision={displayCurrency === "USD" ? 2 : 0}
              styles={{ content: { color: "#ff4d4f" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <Card>
            <Statistic
              title="Total Profit"
              value={toDisplay(summary?.total_profit || 0)}
              prefix={cur}
              precision={displayCurrency === "USD" ? 2 : 0}
              styles={{
                content: {
                  color: (summary?.total_profit || 0) >= 0 ? "#52c41a" : "#ff4d4f",
                }
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Avg Margin"
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
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Daily Profit"
              value={toDisplay(summary?.total_profit_per_day || 0)}
              prefix={cur}
              precision={displayCurrency === "USD" ? 2 : 0}
              styles={{
                content: {
                  color: (summary?.total_profit_per_day || 0) >= 0 ? "#52c41a" : "#ff4d4f",
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
              {currencyToggle}
              <Button icon={<ReloadOutlined />} onClick={fetchData}>
                Refresh
              </Button>
            </Space>
          </div>

          <Text type="secondary">
            Shows all trips with waybills. Sort by Margin % to identify least
            profitable trips. Base values are in TZS
            {displayCurrency === "USD" && exchangeRate
              ? ` — converted at 1 USD = ${exchangeRate.toLocaleString("en-US")} TZS${usingDefaultRate ? " (default — set Finance exchange rate for accuracy)" : ""}`
              : "."}
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
