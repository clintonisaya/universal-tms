"use client";

import { Card, Typography } from "antd";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_COLORS } from "@/lib/chartColors";

const { Title } = Typography;

interface ExpenseBreakdown {
  category: string;
  amount: number;
}

interface ExpenseDistributionChartProps {
  data: ExpenseBreakdown[];
  loading?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Fuel: CHART_COLORS.blue,
  Allowance: CHART_COLORS.red,
  Maintenance: CHART_COLORS.primary,
  Office: CHART_COLORS.purple,
  Border: CHART_COLORS.teal,
  Other: CHART_COLORS.green,
};

export function ExpenseDistributionChart({ data, loading }: ExpenseDistributionChartProps) {
  // Filter out zero values for cleaner visualization
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
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null; // Skip labels for small slices

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
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
        <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
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
                    fill={CATEGORY_COLORS[entry.category] || "#8c8c8c"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, name: any) => [
                  `TZS ${Number(value).toLocaleString("en-US")}`,
                  name,
                ]}
                contentStyle={{ borderRadius: 8 }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span style={{ fontSize: 12, color: "#595959" }}>{value}</span>
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
            }}
          >
            <span style={{ color: "#8c8c8c", fontSize: 12 }}>Total: </span>
            <span style={{ fontWeight: 600, color: "#262626" }}>
              TZS {totalExpenses.toLocaleString("en-US")}
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
