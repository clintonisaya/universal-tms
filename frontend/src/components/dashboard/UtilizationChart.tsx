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
} from "recharts";
import { CHART_COLORS } from "@/lib/chartColors";

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
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: 'transparent' }} />
          <Legend wrapperStyle={{ paddingTop: 10 }} />
          <Bar dataKey="Idle" stackId="a" fill={CHART_COLORS.primary} />
          <Bar dataKey="Transit" stackId="a" fill="#001529" />
          <Bar dataKey="Border" stackId="a" fill={CHART_COLORS.teal} />
          <Bar dataKey="Maintenance" stackId="a" fill="#1890ff" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
