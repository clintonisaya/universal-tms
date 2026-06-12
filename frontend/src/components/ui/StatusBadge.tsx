"use client";

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

interface StatusBadgeProps {
  status: string;
  colorKey?: ColorKey;
  ariaLabel?: string;
}

export function StatusBadge({ status, colorKey = "gray", ariaLabel }: StatusBadgeProps) {
  // Detect dark mode from document attribute (set by layout)
  const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";
  const colors = isDark ? DARK : LIGHT;
  // P1: fall back to gray if colorKey is somehow not in the palette at runtime
  const color = colors[colorKey] ?? colors.gray;

  return (
    <span
      role="img"
      aria-label={ariaLabel ?? `Status: ${status}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: "var(--font-xs)",
          fontWeight: 500,
          color: "var(--ant-color-text)",
        }}
      >
        {status}
      </span>
    </span>
  );
}

export default StatusBadge;
