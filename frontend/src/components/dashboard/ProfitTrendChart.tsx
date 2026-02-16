"use client";

import { Card, Typography } from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const { Title } = Typography;

interface DataPoint {
  quarter: string;
  label: string;
  profit: number;
  revenue?: number;
  expense?: number;
}

interface ProfitTrendChartProps {
  data: DataPoint[];
  loading?: boolean;
}

export function ProfitTrendChart({ data, loading }: ProfitTrendChartProps) {
  const formatValue = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  return (
    <Card loading={loading} title={`Quarterly Profit Trend — ${new Date().getFullYear()}`} style={{ height: "100%" }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#8c8c8c" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#8c8c8c" }}
            tickFormatter={(value) => formatValue(value)}
          />
          <Tooltip
            formatter={(value: any, name: any) => {
              const label =
                name === "profit"
                  ? "Net Profit"
                  : name === "revenue"
                  ? "Revenue"
                  : "Expenses";
              return [`TZS ${Number(value).toLocaleString("en-US")}`, label];
            }}
            contentStyle={{ borderRadius: 8 }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => {
              const labels: Record<string, string> = {
                profit: "Net Profit",
                revenue: "Revenue",
                expense: "Expenses",
              };
              return labels[value] || value;
            }}
          />
          <Bar dataKey="revenue" fill="#52c41a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="#ff4d4f" radius={[4, 4, 0, 0]} />
          <Bar dataKey="profit" fill="#1890ff" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
