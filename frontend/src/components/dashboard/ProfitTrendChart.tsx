"use client";

import { Card, Typography } from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const { Title } = Typography;

interface DataPoint {
  date: string;
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

  // Format date to show only day (e.g., "15")
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getDate().toString();
  };

  return (
    <Card loading={loading} title="Daily Profit Trend (Last 30 Days)" style={{ height: "100%" }}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "#8c8c8c" }}
            tickFormatter={formatDate}
            interval="preserveStartEnd"
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
              return [`TZS ${Number(value).toLocaleString()}`, label];
            }}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{ borderRadius: 8 }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="line"
            formatter={(value) => {
              const labels: Record<string, string> = {
                profit: "Net Profit",
                revenue: "Revenue",
                expense: "Expenses",
              };
              return labels[value] || value;
            }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#1890ff"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
          {data.some((d) => d.revenue !== undefined) && (
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#52c41a"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
          {data.some((d) => d.expense !== undefined) && (
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#ff4d4f"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
