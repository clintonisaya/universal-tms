"use client";

import { Badge, Button, Tooltip } from "antd";
import { CheckSquareOutlined } from "@ant-design/icons";

interface ToDoWidgetProps {
  count: number;
  loading?: boolean;
  onClick: () => void;
}

export function ToDoWidget({ count, loading = false, onClick }: ToDoWidgetProps) {
  return (
    <Tooltip title="Pending Tasks">
      <Badge count={count} overflowCount={99} offset={[-4, 4]}>
        <Button
          type="text"
          icon={<CheckSquareOutlined style={{ fontSize: 20 }} />}
          onClick={onClick}
          loading={loading}
          style={{
            height: 40,
            width: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      </Badge>
    </Tooltip>
  );
}
