"use client";

import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string; // e.g. "3 urgent", "this month"
  trend?: number; // percentage
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  loading?: boolean;
  status?: "active" | "critical" | "normal";
  isRevenue?: boolean;
  onClick?: () => void;
  accent?: string; // Top gradient bar start color — defaults to var(--color-gold)
  chart?: number[]; // Optional MiniBar sparkline data
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  prefix,
  suffix,
  loading = false,
  onClick,
  accent,
  chart,
}: MetricCardProps) {
  const accentColor = accent ?? "var(--color-gold)";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
        borderRadius: 14,
        padding: "20px 22px",
        flex: 1,
        minWidth: 180,
        position: "relative",
        overflow: "hidden",
        boxShadow: "var(--color-card-shadow)",
        cursor: onClick ? "pointer" : "default",
        opacity: loading ? 0.5 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* 2px accent gradient bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
        }}
      />

      {/* Content row: text left, optional chart right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          {/* Label */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {title}
          </div>

          {/* Value */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--color-text-primary)",

              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "baseline",
              gap: 4,
            }}
          >
            {prefix && <span style={{ fontSize: 16 }}>{prefix}</span>}
            {value}
            {suffix && <span style={{ fontSize: 16 }}>{suffix}</span>}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <div style={{ fontSize: "var(--font-sm)", color: "var(--color-text-secondary)", marginTop: 4 }}>
              {subtitle}
            </div>
          )}

          {/* Trend sub-text */}
          {trend !== undefined && (
            <div
              style={{
                fontSize: "var(--font-sm)",
                color: trend >= 0 ? "var(--color-green)" : "var(--color-red)",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              <span style={{ color: "var(--color-text-secondary)" }}>
                {Math.abs(trend)}% vs last week
              </span>
            </div>
          )}
        </div>

        {/* Optional MiniBar sparkline */}
        {chart && chart.length > 0 && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 36 }}>
            {chart.map((v, i) => {
              const max = Math.max(...chart);
              const h = max > 0 ? (v / max) * 36 : 4;
              return (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: Math.max(h, 4),
                    borderRadius: 3,
                    opacity: 0.8,
                    background: accentColor,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
