"use client";

import { Card } from "antd";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ExpenseBreakdown {
  category: string;
  amount: number;
}

interface ExpenseDistributionChartProps {
  data: ExpenseBreakdown[];
  loading?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Fuel:        "var(--color-blue)",
  Allowance:   "var(--color-orange)",
  Maintenance: "var(--color-red)",
  Office:      "var(--color-cyan)",
  Border:      "var(--color-gold)",
  Other:       "var(--color-text-secondary)",
};

export function ExpenseDistributionChart({ data, loading }: ExpenseDistributionChartProps) {
  const chartData = data.filter((d) => d.amount > 0);
  const totalExpenses = chartData.reduce((sum, d) => sum + d.amount, 0);

  const formatValue = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  const renderCustomLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent,
  }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="var(--color-card)"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card loading={loading} title="Expense Distribution" style={{ height: "100%" }}>
      {chartData.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
          No paid expenses this month
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="amount"
                nameKey="category"
                label={renderCustomLabel}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CATEGORY_COLORS[entry.category] || "var(--color-text-muted)"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, name: any) => [
                  `TZS ${Number(value).toLocaleString("en-US")}`,
                  name,
                ]}
                contentStyle={{
                  borderRadius: 8,
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              textAlign: "center",
              marginTop: 8,
              padding: "6px 12px",
              background: "var(--color-surface)",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
            }}
          >
            <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Total: </span>
            <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
              TZS {totalExpenses.toLocaleString("en-US")}
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
