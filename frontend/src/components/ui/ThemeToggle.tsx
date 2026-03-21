"use client";

import { useThemeMode } from "@/contexts/ThemeContext";

// Sun icon — shown in dark mode (click to switch to light)
const SunIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

// Moon icon — shown in light mode (click to switch to dark)
const MoonIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

/**
 * ThemeToggle — matches edupo-redesign.jsx ThemeToggle component exactly.
 * Spec: padding 7px 12px, switchBg background, 1px border, borderRadius 10px
 * Icon: 15px in textSecondary color
 * Text: 11px, fontWeight 500, textSecondary
 * Dark mode → shows Sun + "Light"
 * Light mode → shows Moon + "Dark"
 */
export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 12px",
        background: "var(--color-switch-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.25s",
        color: "var(--color-text-secondary)",
      }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)" }}>
        {isDark ? "Light" : "Dark"}
      </span>
    </button>
  );
}

export default ThemeToggle;
