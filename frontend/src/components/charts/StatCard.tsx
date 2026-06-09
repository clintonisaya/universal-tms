"use client";

import { cn } from "@/lib/utils";

interface StatCardProps {
  /** Stat label */
  label: string;
  /** Stat value */
  value: string | number;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Optional trend indicator */
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Additional Tailwind classes */
  className?: string;
}

/**
 * StatCard component for displaying key metrics.
 * Styled with Tailwind using the app's design system tokens.
 */
export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5",
        "transition-all duration-200 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">{label}</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-xs mt-1",
                trend.isPositive ? "text-[var(--color-green)]" : "text-[var(--color-red)]"
              )}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4 text-[var(--color-primary)] text-2xl">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;
