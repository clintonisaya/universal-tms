"use client";

import { useThemeMode } from "@/contexts/ThemeContext";

const DARK = {
  blue:   "#3F83F8",
  green:  "#059669",
  orange: "#D97706",
  red:    "#E02424",
  cyan:   "#06B6D4",
  gray:   "#A1A1AA",
};

const LIGHT = {
  blue:   "#2563EB",
  green:  "#059669",
  orange: "#D97706",
  red:    "#DC2626",
  cyan:   "#0891B2",
  gray:   "#71717A",
};

export type ColorKey = keyof typeof DARK;

function statusBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.10)`;
}

interface StatusBadgeProps {
  status: string;
  colorKey?: ColorKey;
  ariaLabel?: string;
}

export function StatusBadge({ status, colorKey = "gray", ariaLabel }: StatusBadgeProps) {
  const { mode } = useThemeMode();
  const colors = mode === "dark" ? DARK : LIGHT;
  // P1: fall back to gray if colorKey is somehow not in the palette at runtime
  const color = colors[colorKey] ?? colors.gray;

  return (
    <span
      role="img"
      aria-label={ariaLabel ?? `Status: ${status}`}
      style={{
        display: "inline-block",
        padding: "var(--space-xs) var(--space-sm)",
        borderRadius: 6,
        background: statusBg(color),
        border: `1px solid ${statusBg(color).replace("0.10", "0.30")}`,
        color,
        fontSize: "var(--font-xs)",
        fontWeight: 600,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
