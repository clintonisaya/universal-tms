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
  Cell,
} from "recharts";

interface MonthlyStats {
  income: number;
  expenses: number;
  net_profit: number;
  month: string;
}

interface IncomeVsExpenseChartProps {
  data: MonthlyStats | null;
  loading?: boolean;
}

export function IncomeVsExpenseChart({ data, loading }: IncomeVsExpenseChartProps) {
  const chartData = data
    ? [
        { name: "Income", value: data.income, fill: "var(--color-green)" },
        { name: "Expenses", value: data.expenses, fill: "var(--color-red)" },
      ]
    : [];

  const hasData = data && (data.income > 0 || data.expenses > 0);

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
    <Card
      loading={loading}
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Monthly Pulse</span>
          {data && <span style={{ fontSize: "var(--font-sm)", color: "var(--color-text-muted)" }}>{data.month}</span>}
        </div>
      }
      style={{ height: "100%" }}
    >
      {!hasData && !loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>No financial data this month</div>
          <div style={{ fontSize: "var(--font-sm)" }}>Income and expenses will appear once trips with waybills are created and expenses are paid.</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="name"
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
              cursor={{ fill: "var(--color-surface)" }}
              formatter={(value: any) => [`TZS ${Number(value).toLocaleString("en-US")}`, ""]}
              contentStyle={{
                borderRadius: 8,
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      {data && hasData && (
        <div
          style={{
            textAlign: "center",
            marginTop: 12,
            padding: "8px 16px",
            background: "var(--color-surface)",
            borderRadius: 6,
            border: "1px solid var(--color-border)",
          }}
        >
          <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)" }}>Net Profit: </span>
          <span
            style={{
              fontWeight: 600,
              color: data.net_profit >= 0 ? "var(--color-green)" : "var(--color-red)",
            }}
          >
            TZS {data.net_profit.toLocaleString("en-US")}
          </span>
        </div>
      )}
    </Card>
  );
}
