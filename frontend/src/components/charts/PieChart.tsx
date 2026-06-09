"use client";

import { Pie } from "@ant-design/charts";
import { cn } from "@/lib/utils";

interface PieChartProps {
  data: any[];
  angleField: string;
  colorField: string;
  color?: string[];
  className?: string;
  height?: number;
  innerRadius?: number;
  [key: string]: any;
}

/**
 * Styled PieChart wrapper around @ant-design/charts Pie.
 * Uses Tailwind for container styling and matches the app's purple palette.
 */
export function PieChart({
  data,
  angleField,
  colorField,
  color = ["#8B5CF6", "#3B82F6", "#059669", "#D97706", "#E02424"],
  className,
  height = 300,
  innerRadius = 0.6,
  ...props
}: PieChartProps) {
  const config = {
    data,
    angleField,
    colorField,
    color,
    height,
    innerRadius,
    label: {
      type: "inner",
      offset: "-30%",
      content: "{percentage}",
      style: {
        fontSize: 14,
        textAlign: "center" as const,
      },
    },
    interactions: [
      {
        type: "element-active",
      },
    ],
    ...props,
  };

  return (
    <div className={cn("w-full", className)}>
      <Pie {...config} />
    </div>
  );
}

export default PieChart;
