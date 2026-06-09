"use client";

import { DatePicker as AntDatePicker } from "antd";
import type { DatePickerProps as AntDatePickerProps } from "antd";
import { cn } from "@/lib/utils";

export interface DatePickerProps extends AntDatePickerProps {
  /** Additional Tailwind classes */
  className?: string;
}

/**
 * Styled DatePicker wrapper around Ant Design DatePicker.
 * Uses Tailwind for consistent styling across the app.
 */
export function DatePicker({ className, style, ...props }: DatePickerProps) {
  return (
    <AntDatePicker
      className={cn("rounded-lg w-full", className)}
      style={{
        fontSize: 14,
        ...style,
      }}
      {...props}
    />
  );
}

export interface RangePickerProps {
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export function RangePicker({ className, style, ...props }: RangePickerProps) {
  return (
    <AntDatePicker.RangePicker
      className={cn("rounded-lg w-full", className)}
      style={{
        fontSize: 14,
        ...style,
      }}
      {...props}
    />
  );
}

export default DatePicker;
