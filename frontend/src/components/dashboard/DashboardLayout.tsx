"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Layout, Menu, Typography, Avatar, Dropdown, Space, theme, ConfigProvider } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  CarOutlined,
  ScheduleOutlined,
  TeamOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CrownOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";

const { Sider, Content, Header } = Layout;
const { Text } = Typography;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const menuItems: MenuProps["items"] = [
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
      { key: "/fleet/trucks", label: "Trucks" },
      { key: "/fleet/trailers", label: "Trailers" },
      { key: "/fleet/drivers", label: "Drivers" },
      { key: "/fleet/maintenance", label: "Maintenance" },
    ],
  },
  {
    key: "operations",
    icon: <ScheduleOutlined />,
    label: "Operations",
    children: [
      { key: "/ops/tracking", label: "Control Tower" },
      { key: "/ops/waybills", label: "Waybills" },
      { key: "/ops/trips", label: "Trips" },
      { key: "/ops/expenses", label: "Trip Expenses" },
    ],
  },
  {
    key: "management",
    icon: <TeamOutlined />,
    label: "Management",
    children: [
      { key: "/manager/approvals", label: "Approvals" },
      { key: "/manager/payments", label: "Payments" },
      { key: "/manager/reports", label: "Reports", disabled: true },
    ],
  },
  {
    key: "/office-expenses",
    icon: <DollarOutlined />,
    label: "Office Expenses",
  },
  {
    key: "settings",
    icon: <SettingOutlined />,
    label: "Settings",
    children: [
      { key: "/settings/users", label: "Users" },
      { key: "/settings/transport/locations", label: "Locations" },
      { key: "/settings/transport/cargo-types", label: "Cargo Types" },
      { key: "/settings/transport/vehicle-statuses", label: "Vehicle Statuses" },
    ],
  },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key.startsWith("/")) {
      router.push(key);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
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
      "/ops/waybills",
      "/ops/trips",
      "/ops/expenses",
      "/manager/approvals",
      "/manager/payments",
      "/manager/reports",
      "/office-expenses",
      "/settings/transport/locations",
      "/settings/transport/cargo-types",
      "/settings/transport/vehicle-statuses",
      "/settings/users",
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
    if (pathname.startsWith("/manager")) return ["management"];
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
          background: "#1F1F1F", // Charcoal
          boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
          zIndex: 10
        }}
        width={260}
        trigger={null}
      >
        <div style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "#1F1F1F"
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
                EDUPO TMS
              </Text>
            )}
          </Space>
        </div>

        <ConfigProvider
          theme={{
            components: {
              Menu: {
                darkItemBg: "#1F1F1F",
                darkSubMenuItemBg: "#181818",
                darkItemSelectedBg: "rgba(212, 175, 55, 0.15)", // Gold at 15% opacity
                darkItemSelectedColor: "#D4AF37", // Gold Text
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
      <Layout style={{ background: "#f5f7fa" }}>
        <Header
          style={{
            padding: "0 24px",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            height: 64,
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
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
            {/* Could add Notifications bell here later */}
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
