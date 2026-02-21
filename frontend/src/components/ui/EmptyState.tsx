"use client";

import { Empty, Button } from "antd";

interface EmptyStateProps {
  message: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ message, description, action }: EmptyStateProps) {
  return (
    <Empty
      description={
        <span>
          {message}
          {description && (
            <><br /><span style={{ fontSize: 12, color: "#8c8c8c" }}>{description}</span></>
          )}
        </span>
      }
    >
      {action && (
        <Button type="primary" onClick={action.onClick}>{action.label}</Button>
      )}
    </Empty>
  );
}
