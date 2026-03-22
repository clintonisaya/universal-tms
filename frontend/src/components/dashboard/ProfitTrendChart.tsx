"use client";

import { Card } from "antd";
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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
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
            contentStyle={{
              borderRadius: 8,
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
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
          <Bar dataKey="revenue" fill="var(--color-green)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="var(--color-red)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="profit" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
