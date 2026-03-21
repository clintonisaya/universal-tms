/**
 * Chart color palette using design system CSS variables.
 * These resolve to the correct value for both dark and light themes.
 */
export const CHART_COLORS = {
  primary: "var(--color-gold)",
  blue:    "var(--color-blue)",
  green:   "var(--color-green)",
  red:     "var(--color-red)",
  orange:  "var(--color-orange)",
  cyan:    "var(--color-cyan)",
  muted:   "var(--color-text-muted)",
  purple:  "var(--color-cyan)", // fallback to cyan — no purple token in design system
  teal:    "var(--color-cyan)",
} as const;
