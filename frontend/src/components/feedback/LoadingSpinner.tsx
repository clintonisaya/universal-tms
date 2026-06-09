"use client";

import { Spin } from "antd";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: "small" | "default" | "large";
  /** Loading text to display below spinner */
  text?: string;
  /** Whether to center the spinner in its container */
  centered?: boolean;
  /** Whether to take full viewport height */
  fullHeight?: boolean;
  /** Additional Tailwind classes */
  className?: string;
}

/**
 * LoadingSpinner component for consistent loading states.
 * Styled with Tailwind using the app's design system tokens.
 */
export function LoadingSpinner({
  size = "default",
  text,
  centered = true,
  fullHeight = false,
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        centered && "w-full",
        fullHeight && "h-screen",
        !fullHeight && "py-12",
        className
      )}
    >
      <Spin size={size} />
      {text && (
        <p className="text-sm text-[var(--color-text-secondary)]">{text}</p>
      )}
    </div>
  );
}

export default LoadingSpinner;
