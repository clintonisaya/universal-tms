"use client";

import React from "react";
import { Select, Spin, Empty, Button } from "antd";
import type { SelectProps } from "antd";
import { PlusOutlined } from "@ant-design/icons";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EmptyAwareSelectProps<T extends string | number = string>
  extends Omit<SelectProps<T>, "children"> {
  options: { value: T; label: React.ReactNode }[];
  emptyMessage: string;           // "No available trucks"
  emptyDescription?: string;      // "Register a truck to assign to this trip"
  createLabel: string;            // "Register Truck"
  onCreate: () => void;           // router.push or openModal
  loading?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function EmptyAwareSelect<T extends string | number>({
  options,
  emptyMessage,
  emptyDescription,
  createLabel,
  onCreate,
  loading = false,
  ...selectProps
}: EmptyAwareSelectProps<T>) {
  const popupRender = (menu: React.ReactElement) => {
    // Loading state
    if (loading) {
      return (
        <div style={{ padding: 24, textAlign: "center" }}>
          <Spin size="small" />
          <div style={{ marginTop: 8, color: "var(--color-text-muted)", fontSize: 13 }}>
            Loading...
          </div>
        </div>
      );
    }

    // Empty state — no options at all
    if (options.length === 0) {
      return (
        <div style={{ padding: 24, textAlign: "center" }}>
          <Empty
            description={
              <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                {emptyMessage}
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            imageStyle={{ height: 40 }}
          />
          {emptyDescription && (
            <div
              style={{
                color: "var(--color-text-muted)",
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              {emptyDescription}
            </div>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onCreate();
            }}
          >
            {createLabel}
          </Button>
        </div>
      );
    }

    // Has options — show normal dropdown + create link at bottom
    return (
      <div>
        {menu}
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "8px 12px",
            textAlign: "center",
          }}
        >
          <Button
            type="link"
            icon={<PlusOutlined />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onCreate();
            }}
            style={{ fontSize: 12 }}
          >
            {createLabel}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Select
      popupRender={popupRender}
      options={options}
      notFoundContent={loading ? <Spin size="small" /> : "\u00A0"}
      {...selectProps}
    />
  );
}

export default EmptyAwareSelect;
