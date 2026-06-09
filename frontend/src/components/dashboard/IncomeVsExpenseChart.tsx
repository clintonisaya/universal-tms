"use client";

import { ProCard } from "@ant-design/pro-components";
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
  selectedMonth?: string | null;
  onMonthChange?: (month: string | null) => void;
}

export function IncomeVsExpenseChart({ data, loading, selectedMonth, onMonthChange }: IncomeVsExpenseChartProps) {
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
    <ProCard
      loading={loading}
      headerBordered
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Monthly Pulse</span>
          {onMonthChange ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{ cursor: "pointer", fontSize: 16, color: "var(--color-text-muted)", userSelect: "none", padding: "0 4px" }}
                onClick={() => {
                  if (!selectedMonth) {
                    const d = new Date(); d.setMonth(d.getMonth() - 1);
                    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
                  } else {
                    const [y, m] = selectedMonth.split("-").map(Number);
                    const d = new Date(y, m - 2, 1);
                    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
                  }
                }}
              >
                ‹
              </span>
              <span style={{ fontSize: "var(--font-sm)", color: "var(--color-text-muted)", minWidth: 80, textAlign: "center" }}>
                {data?.month || "—"}
              </span>
              <span
                style={{ cursor: "pointer", fontSize: 16, color: "var(--color-text-muted)", userSelect: "none", padding: "0 4px" }}
                onClick={() => {
                  if (!selectedMonth) return; // already current month
                  const [y, m] = selectedMonth.split("-").map(Number);
                  const d = new Date(y, m, 1);
                  const now = new Date();
                  const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                  onMonthChange(next === current ? null : next);
                }}
              >
                ›
              </span>
            </div>
          ) : (
            data && <span style={{ fontSize: "var(--font-sm)", color: "var(--color-text-muted)" }}>{data.month}</span>
          )}
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
    </ProCard>
  );
}
