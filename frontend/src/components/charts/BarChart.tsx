"use client";

import { Column } from "@ant-design/charts";
import { cn } from "@/lib/utils";

interface BarChartProps {
  data: any[];
  xField: string;
  yField: string;
  color?: string | string[];
  className?: string;
  height?: number;
  [key: string]: any;
}

/**
 * Styled BarChart wrapper around @ant-design/charts Column.
 * Uses Tailwind for container styling and matches the app's purple palette.
 */
export function BarChart({
  data,
  xField,
  yField,
  color = "#8B5CF6",
  className,
  height = 300,
  ...props
}: BarChartProps) {
  const config = {
    data,
    xField,
    yField,
    color,
    height,
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    ...props,
  };

  return (
    <div className={cn("w-full", className)}>
      <Column {...config} />
    </div>
  );
}

export default BarChart;
