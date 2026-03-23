"use client";

import { useThemeMode } from "@/contexts/ThemeContext";

const DARK = {
  blue:   "#4A9FF5",
  green:  "#3DD68C",
  orange: "#E8A034",
  red:    "#E85454",
  cyan:   "#3DD6C8",
  gray:   "#8A8F9C",
};

const LIGHT = {
  blue:   "#3B8DE5",
  green:  "#2EAE6E",
  orange: "#D48A20",
  red:    "#D94444",
  cyan:   "#2EB8AB",
  gray:   "#6B6E76",
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
