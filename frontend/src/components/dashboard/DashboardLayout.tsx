"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Layout, Menu, Typography, Avatar, Dropdown, Space, theme, ConfigProvider } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  CarOutlined,
  ScheduleOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CrownOutlined,
  BarChartOutlined,
  AuditOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { clearNotifications } from "@/hooks/useNotifications";

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/** Menu item with an optional permission gate. Items without `requires` are always visible. */
interface PermissionMenuItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  requires?: string[];          // user needs ANY of these
  children?: PermissionMenuItem[];
}

const allMenuItems: PermissionMenuItem[] = [
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard",
  },
  {
    key: "fleet",
    icon: <CarOutlined />,
    label: "Fleet",
    children: [
      { key: "/fleet/trucks", label: "Trucks", requires: ["fleet:view"] },
      { key: "/fleet/trailers", label: "Trailers", requires: ["fleet:view"] },
      { key: "/fleet/drivers", label: "Drivers", requires: ["fleet:view"] },
      { key: "/fleet/maintenance", label: "Maintenance", requires: ["fleet:view"] },
    ],
  },
  {
    key: "operations",
    icon: <ScheduleOutlined />,
    label: "Operations",
    children: [
      { key: "/ops/tracking", label: "Control Tower", requires: ["tracking:view"] },
      { key: "/ops/waybills", label: "Waybills", requires: ["waybills:view"] },
      { key: "/ops/trips", label: "Trips", requires: ["trips:view"] },
      { key: "/ops/expenses", label: "Expenses", requires: ["expenses:view"] },
    ],
  },
  {
    key: "/office-expenses",
    icon: <DollarOutlined />,
    label: "Office Expenses",
    requires: ["office-expenses:view"],
  },
  {
    key: "manager",
    icon: <AuditOutlined />,
    label: "Manager",
    children: [
      { key: "/manager/approvals", label: "Approvals", requires: ["expenses:approve"] },
    ],
  },
  {
    key: "finance",
    icon: <BankOutlined />,
    label: "Finance",
    children: [
      { key: "/manager/payments", label: "Payments", requires: ["expenses:pay"] },
      { key: "/finance/vouchers/bulk", label: "Vouchers", requires: ["expenses:pay"] },
      { key: "/settings/finance", label: "Exchange Rates", requires: ["settings:exchange-rates"] },
    ],
  },
  {
    key: "reports",
    icon: <BarChartOutlined />,
    label: "Reports",
    children: [
      { key: "/reports/profitability", label: "Trip Profitability", requires: ["reports:view"] },
    ],
  },
  {
    key: "settings",
    icon: <SettingOutlined />,
    label: "Settings",
    children: [
      { key: "/settings/users", label: "Users", requires: ["users:manage"] },
      { key: "/settings/clients", label: "Clients", requires: ["settings:clients"] },
      { key: "/settings/finance/office-expense-types", label: "Office Expense Types", requires: ["settings:office-expense-types"] },
      { key: "/settings/trip-expenses", label: "Trip Expense Types", requires: ["settings:trip-expense-types"] },
      { key: "/settings/transport/locations", label: "Locations", requires: ["settings:locations"] },
      { key: "/settings/transport/cargo-types", label: "Cargo Types", requires: ["settings:cargo-types"] },
      { key: "/settings/transport/vehicle-statuses", label: "Vehicle Statuses", requires: ["settings:vehicle-statuses"] },
      { key: "/settings/transport/border-posts", label: "Border Posts", requires: ["settings:vehicle-statuses"] },
    ],
  },
];

/** Filter menu items based on user permissions. Groups with no visible children are removed. */
function filterMenuItems(
  items: PermissionMenuItem[],
  check: (...perms: string[]) => boolean,
): MenuProps["items"] {
  const result: NonNullable<MenuProps["items"]> = [];

  for (const item of items) {
    // If item has a permission gate, check it
    if (item.requires && !check(...item.requires)) continue;

    if (item.children) {
      // Recursively filter children
      const filteredChildren = filterMenuItems(item.children, check) as any[];
      // Only show parent group if it has at least one visible child
      if (filteredChildren.length === 0) continue;
      result.push({
        key: item.key,
        icon: item.icon,
        label: item.label,
        children: filteredChildren,
      });
    } else {
      result.push({
        key: item.key,
        icon: item.icon,
        label: item.label,
      });
    }
  }

  return result;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  // Build permission-filtered menu
  const menuItems = filterMenuItems(allMenuItems, hasAnyPermission);

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key.startsWith("/")) {
      router.push(key);
    }
  };

  const handleLogout = async () => {
    // Clear notifications on logout (Story 4.3 - privacy)
    if (user?.id) clearNotifications(user.id);
    await logout();
    router.push("/login");
  };

  const handleNotificationClick = (taskId: string) => {
    // Dispatch custom event for dashboard page to handle
    window.dispatchEvent(new CustomEvent("notification-click", { detail: taskId }));
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      danger: true,
      onClick: handleLogout,
    },
  ];

  // Find selected keys based on pathname
  const getSelectedKeys = () => {
    if (pathname === "/dashboard") return ["/dashboard"];
    // Match the most specific path
    const allKeys = [
      "/dashboard",
      "/fleet/trucks",
      "/fleet/trailers",
      "/fleet/drivers",
      "/fleet/maintenance",
      "/ops/tracking",
      "/ops/waybills",
      "/ops/trips",
      "/ops/expenses",
      "/office-expenses",
      "/manager/approvals",
      "/manager/payments",
      "/finance/vouchers/bulk",
      "/finance/vouchers",
      "/settings/clients",
      "/settings/finance",
      "/settings/finance/office-expense-types",
      "/settings/trip-expenses",
      "/settings/transport/locations",
      "/settings/transport/cargo-types",
      "/settings/transport/vehicle-statuses",
      "/settings/transport/border-posts",
      "/settings/users",
      "/reports/profitability",
    ];
    // Sort by length descending to match most specific first
    return allKeys
      .filter((key) => pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)
      .slice(0, 1);
  };

  // Find open keys for submenu
  const getOpenKeys = () => {
    if (collapsed) return []; // Auto-close when collapsed

    // Always keep sections open if we are inside them
    if (pathname.startsWith("/fleet")) return ["fleet"];
    if (pathname.startsWith("/ops")) return ["operations"];
    if (pathname.startsWith("/manager")) return ["manager"];
    if (pathname.startsWith("/finance")) return ["finance"];
    if (pathname.startsWith("/reports")) return ["reports"];
    if (pathname.startsWith("/settings")) return ["settings"];

    return [];
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          background: "#131313",
          boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
          zIndex: 10,
          overflow: "auto",
          height: "100vh",
          position: "sticky",
          top: 0,
          left: 0,
        }}
        width={200}
        trigger={null}
      >
        <div style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "#131313"
        }}>
          <Space>
            <CrownOutlined style={{ fontSize: "24px", color: token.colorPrimary }} />
            {!collapsed && (
              <Text
                strong
                style={{
                  color: "#fff",
                  fontSize: 18,
                  letterSpacing: "0.5px",
                  fontFamily: "Inter, sans-serif"
                }}
              >
                EDUPO
              </Text>
            )}
          </Space>
        </div>

        <ConfigProvider
          theme={{
            components: {
              Menu: {
                darkItemBg: "#131313",
                darkSubMenuItemBg: "#0D0D0D",
                darkItemSelectedBg: "rgba(30, 58, 255, 0.15)", // Blue at 15% opacity
                darkItemSelectedColor: "#7B8FFF", // Light Blue Text
                itemBorderRadius: 4,
                itemMarginInline: 8,
              }
            }
          }}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={getSelectedKeys()}
            defaultOpenKeys={getOpenKeys()}
            items={menuItems}
            onClick={handleMenuClick}
            style={{
              borderRight: 0,
              background: "transparent",
              marginTop: "16px"
            }}
          />
        </ConfigProvider>
      </Sider>
      <Layout style={{ background: "#F0F4FF" }}>
        <Header
          style={{
            padding: "0 24px",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            height: 64,
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            position: "sticky",
            top: 0,
            zIndex: 9,
          }}
        >
          <div
            onClick={() => setCollapsed(!collapsed)}
            style={{
              cursor: "pointer",
              fontSize: 18,
              color: "#595959",
              transition: "color 0.3s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = token.colorPrimary}
            onMouseLeave={(e) => e.currentTarget.style.color = "#595959"}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <Space size="large">
            <NotificationCenter onNotificationClick={handleNotificationClick} />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
              <div style={{ cursor: "pointer", padding: "4px 8px", borderRadius: "4px", transition: "background 0.3s" }}>
                <Space>
                  <Avatar
                    icon={<UserOutlined />}
                    style={{
                      backgroundColor: token.colorPrimary,
                      color: "#fff"
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                    <Text strong style={{ fontSize: 13 }}>{user?.full_name || user?.username || "Admin User"}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{user?.role || "Administrator"}</Text>
                  </div>
                </Space>
              </div>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: "24px",
            padding: 0,
            background: "transparent",
            minHeight: 280,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

export default DashboardLayout;
