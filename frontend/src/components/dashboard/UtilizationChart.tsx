"use client";

import { Card } from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  name: string;
  Idle: number;
  Transit: number;
  Border: number;
  Maintenance: number;
}

interface UtilizationChartProps {
  data: DataPoint[];
  loading?: boolean;
}

export function UtilizationChart({ data, loading }: UtilizationChartProps) {
  return (
    <Card loading={loading} title="Vehicle Utilization" style={{ height: "100%" }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
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
          />
          <Tooltip
            cursor={{ fill: "var(--color-surface)" }}
            contentStyle={{
              borderRadius: 8,
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: 10, color: "var(--color-text-secondary)" }} />
          <Bar dataKey="Idle"        stackId="a" fill="var(--color-text-muted)" />
          <Bar dataKey="Transit"     stackId="a" fill="var(--color-blue)" />
          <Bar dataKey="Border"      stackId="a" fill="var(--color-orange)" />
          <Bar dataKey="Maintenance" stackId="a" fill="var(--color-red)" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
