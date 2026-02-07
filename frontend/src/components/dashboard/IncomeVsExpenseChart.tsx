"use client";

import { Card, Typography } from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const { Title } = Typography;

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

const COLORS = {
  income: "#52c41a",
  expenses: "#ff4d4f",
};

export function IncomeVsExpenseChart({ data, loading }: IncomeVsExpenseChartProps) {
  const chartData = data
    ? [
        { name: "Income", value: data.income, fill: COLORS.income },
        { name: "Expenses", value: data.expenses, fill: COLORS.expenses },
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
          {data && <span style={{ fontSize: 12, color: "#8c8c8c" }}>{data.month}</span>}
        </div>
      }
      style={{ height: "100%" }}
    >
      {!hasData && !loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>No financial data this month</div>
          <div style={{ fontSize: 12 }}>Income and expenses will appear once trips with waybills are created and expenses are paid.</div>
        </div>
      ) : (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
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
            formatter={(value: any) => [`TZS ${Number(value).toLocaleString()}`, ""]}
            contentStyle={{ borderRadius: 8 }}
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
            background: data.net_profit >= 0 ? "#f6ffed" : "#fff2f0",
            borderRadius: 6,
          }}
        >
          <span style={{ color: "#8c8c8c", fontSize: 12 }}>Net Profit: </span>
          <span
            style={{
              fontWeight: 600,
              color: data.net_profit >= 0 ? "#52c41a" : "#ff4d4f",
            }}
          >
            TZS {data.net_profit.toLocaleString()}
          </span>
        </div>
      )}
    </Card>
  );
}
