"use client";

import { Card, Button, Space, Typography } from "antd";
import {
  PlusOutlined,
  FileTextOutlined,
  RadarChartOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

const { Text } = Typography;

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission: string | null;
  roles: string[];
}

const ALL_QUICK_ACTIONS: QuickAction[] = [
  {
    label: "New Trip",
    href: "/ops/trips/new",
    icon: <PlusOutlined />,
    permission: "trips:create",
    roles: ["ops", "admin", "manager"],
  },
  {
    label: "New Waybill",
    href: "/ops/waybills/new",
    icon: <FileTextOutlined />,
    permission: "waybills:create",
    roles: ["ops", "admin", "manager"],
  },
  {
    label: "Tracking",
    href: "/ops/tracking",
    icon: <RadarChartOutlined />,
    permission: "tracking:view",
    roles: ["ops", "admin", "manager"],
  },
  {
    label: "Pending Approvals",
    href: "/manager/approvals",
    icon: <CheckCircleOutlined />,
    permission: "expenses:approve",
    roles: ["manager", "admin"],
  },
  {
    label: "Process Payments",
    href: "/manager/payments",
    icon: <DollarOutlined />,
    permission: "expenses:pay",
    roles: ["finance", "admin"],
  },
  {
    label: "Manage Users",
    href: "/settings/users",
    icon: <TeamOutlined />,
    permission: "users:manage",
    roles: ["admin"],
  },
];

export function QuickActionsWidget() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const visibleActions = ALL_QUICK_ACTIONS.filter(
    (action) =>
      action.roles.includes(user?.role ?? "") &&
      (action.permission === null || hasPermission(action.permission))
  );

  if (visibleActions.length === 0) return null;

  return (
    <Card
      size="small"
      style={{ marginBottom: 16 }}
      styles={{ body: { padding: "10px 16px" } }}
    >
      <Space wrap align="center">
        <Text type="secondary" style={{ fontSize: 12, marginRight: 4 }}>
          Quick Actions:
        </Text>
        {visibleActions.map((action) => (
          <Button
            key={action.href}
            type="default"
            size="small"
            icon={action.icon}
            onClick={() => router.push(action.href)}
          >
            {action.label}
          </Button>
        ))}
      </Space>
    </Card>
  );
}
