"use client";

import { Select as AntSelect } from "antd";
import type { SelectProps as AntSelectProps } from "antd";
import { cn } from "@/lib/utils";

export interface SelectProps extends AntSelectProps {
  /** Additional Tailwind classes */
  className?: string;
}

/**
 * Styled Select wrapper around Ant Design Select.
 * Uses Tailwind for consistent styling across the app.
 */
export function Select({ className, style, ...props }: SelectProps) {
  return (
    <AntSelect
      className={cn("rounded-lg", className)}
      style={{
        fontSize: 14,
        width: "100%",
        ...style,
      }}
      {...props}
    />
  );
}

export default Select;
