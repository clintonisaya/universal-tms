"use client";

import { Line } from "@ant-design/charts";
import { cn } from "@/lib/utils";

interface LineChartProps {
  data: any[];
  xField: string;
  yField: string;
  color?: string;
  className?: string;
  height?: number;
  smooth?: boolean;
  [key: string]: any;
}

/**
 * Styled LineChart wrapper around @ant-design/charts Line.
 * Uses Tailwind for container styling and matches the app's purple palette.
 */
export function LineChart({
  data,
  xField,
  yField,
  color = "#8B5CF6",
  className,
  height = 300,
  smooth = true,
  ...props
}: LineChartProps) {
  const config = {
    data,
    xField,
    yField,
    color,
    smooth,
    height,
    point: {
      size: 3,
      shape: "circle",
    },
    line: {
      style: {
        lineWidth: 2,
      },
    },
    ...props,
  };

  return (
    <div className={cn("w-full", className)}>
      <Line {...config} />
    </div>
  );
}

export default LineChart;
