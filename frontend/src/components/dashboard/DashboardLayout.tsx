"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Layout, Menu, Dropdown } from "antd";
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
  BarChartOutlined,
  AuditOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useThemeMode } from "@/contexts/ThemeContext";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { clearNotifications } from "@/hooks/useNotifications";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ToDoWidget } from "@/components/dashboard/ToDoWidget";
import { useTodoCount } from "@/hooks/useApi";

const { Sider, Content, Header } = Layout;

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
  type?: "group";               // visual group label (not clickable, no permission needed)
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
      { key: "/ops/tracking", label: "Tracking", requires: ["tracking:view"] },
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
      { key: "/finance/expense-console", label: "Expense Console", requires: ["expenses:audit-console"] },
      { key: "/manager/payments", label: "Payments", requires: ["expenses:pay"] },
      { key: "/settings/finance", label: "Exchange Rates", requires: ["settings:exchange-rates"] },
      { key: "/finance/invoice-verification", label: "Invoice Verification", requires: ["invoices:verify"] },
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
      {
        key: "settings-operations-group",
        label: "Operations",
        type: "group",
        children: [
          { key: "/settings/clients", label: "Clients", requires: ["settings:clients"] },
          { key: "/settings/transport/locations", label: "Locations", requires: ["settings:locations"] },
          { key: "/settings/transport/cargo-types", label: "Cargo Types", requires: ["settings:cargo-types"] },
          { key: "/settings/transport/vehicle-statuses", label: "Vehicle Statuses", requires: ["settings:vehicle-statuses"] },
          { key: "/settings/transport/border-posts", label: "Border Posts", requires: ["settings:border-posts"] },
        ],
      },
      {
        key: "settings-finance-group",
        label: "Finance",
        type: "group",
        children: [
          { key: "/settings/finance/office-expense-types", label: "Office Expense Types", requires: ["settings:office-expense-types"] },
          { key: "/settings/trip-expenses", label: "Trip Expense Types", requires: ["settings:trip-expense-types"] },
        ],
      },
      {
        key: "settings-admin-group",
        label: "Administration",
        type: "group",
        children: [
          { key: "/settings/company", label: "Company", requires: ["users:manage"] },
          { key: "/settings/users", label: "Users", requires: ["users:manage"] },
        ],
      },
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
    // Visual group items — filter their children, skip if all hidden
    if (item.type === "group") {
      const filteredChildren = filterMenuItems(item.children ?? [], check) as any[];
      if (filteredChildren.length === 0) continue;
      result.push({
        type: "group",
        key: item.key,
        label: item.label,
        children: filteredChildren,
      });
      continue;
    }

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

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/fleet/trucks": "Trucks",
  "/fleet/trailers": "Trailers",
  "/fleet/drivers": "Drivers",
  "/fleet/maintenance": "Maintenance",
  "/ops/tracking": "Tracking",
  "/ops/waybills": "Waybills",
  "/ops/trips": "Trips",
  "/ops/expenses": "Expenses",
  "/office-expenses": "Office Expenses",
  "/manager/approvals": "Approvals",
  "/manager/payments": "Payments",
  "/finance/expense-console": "Expense Console",
  "/finance/invoice-verification": "Invoice Verification",
  "/reports/profitability": "Trip Profitability",
  "/settings/clients": "Clients",
  "/settings/finance": "Exchange Rates",
  "/settings/finance/office-expense-types": "Office Expense Types",
  "/settings/trip-expenses": "Trip Expense Types",
  "/settings/transport/locations": "Locations",
  "/settings/transport/cargo-types": "Cargo Types",
  "/settings/transport/vehicle-statuses": "Vehicle Statuses",
  "/settings/transport/border-posts": "Border Posts",
  "/settings/users": "Users",
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const { mode } = useThemeMode();
  const [collapsed, setCollapsed] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  // Auto-collapse sidebar on small viewports (≤1024px)
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1024px)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsCompact(e.matches);
      if (e.matches) setCollapsed(true);
    };
    handleChange(mql);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  const handleCollapse = useCallback((val: boolean) => {
    // On compact screens, prevent expanding sidebar (it would eat content width)
    if (isCompact && !val) return;
    setCollapsed(val);
  }, [isCompact]);

  const { data: todoData, isLoading: todoCountLoading } = useTodoCount(!!user);
  const todoCount = todoData?.total ?? 0;

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
    const allKeys = Object.keys(PAGE_TITLES);
    return allKeys
      .filter((key) => pathname.startsWith(key))
      .sort((a, b) => b.length - a.length)
      .slice(0, 1);
  };

  // Find open keys for submenu
  const getOpenKeys = () => {
    if (collapsed) return [];
    if (pathname.startsWith("/fleet")) return ["fleet"];
    if (pathname.startsWith("/ops")) return ["operations"];
    if (pathname.startsWith("/manager")) return ["manager"];
    if (pathname.startsWith("/finance")) return ["finance"];
    if (pathname.startsWith("/reports")) return ["reports"];
    if (pathname.startsWith("/settings")) return ["settings"];
    return [];
  };

  // P11: fall back to startsWith match for dynamic sub-routes like /ops/trips/123
  const matchedKey = Object.keys(PAGE_TITLES)
    .filter(k => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  const pageTitle = PAGE_TITLES[pathname] ?? PAGE_TITLES[matchedKey] ?? "Nablafleet TMS";
  const userInitial = (user?.full_name || user?.username || "U").charAt(0).toUpperCase();

  return (
    <Layout style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      {/* ── SIDEBAR ── */}
      <Sider
        collapsed={collapsed}
        onCollapse={handleCollapse}
        style={{
          background: "var(--color-card)",
          borderRight: "1px solid var(--color-border)",
          zIndex: 10,
          height: "100vh",
          position: "sticky",
          top: 0,
          left: 0,
          overflow: "hidden",
        }}
        width={240}
        collapsedWidth={72}
        trigger={null}
      >
        {/* P12: inner flex wrapper pins collapse button to bottom */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Brand area */}
          <div
            style={{
              padding: collapsed ? "var(--space-lg) 0" : "var(--space-xl)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: "1px solid var(--color-border)",
              flexShrink: 0,
              minHeight: 65,
            }}
          >
            <span
              style={{
                fontSize:18,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                letterSpacing: "0.12em",
              }}
            >
              NABLAFLEET
            </span>
          </div>

          {/* Navigation menu — P3: global ConfigProvider tokens handle styling; use dynamic theme */}
          <div style={{ flex: 1, overflow: "auto" }}>
            <Menu
              theme={mode}
              mode="inline"
              selectedKeys={getSelectedKeys()}
              defaultOpenKeys={getOpenKeys()}
              items={menuItems}
              onClick={handleMenuClick}
              style={{
                borderRight: 0,
                background: "transparent",
                marginTop: "var(--space-lg)",
              }}
            />
          </div>

          {/* Collapse toggle — bottom of sidebar */}
          <div style={{ padding: "var(--space-sm)", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => handleCollapse(!collapsed)}
              style={{
                width: "100%",
                padding: "var(--space-sm)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-secondary)",
                transition: "all 0.2s",
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>
        </div>
      </Sider>

      {/* ── MAIN AREA ── */}
      <Layout style={{ background: "var(--color-bg)" }}>
        {/* Header */}
        <Header
          style={{
            padding: isCompact ? "0 16px" : "0 32px",
            background: "var(--color-header-bg)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          {/* Page title */}
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            {pageTitle}
          </span>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ToDoWidget
              count={todoCount}
              loading={todoCountLoading}
              onClick={() => router.push("/dashboard/tasks")}
            />

            <ThemeToggle />

            <NotificationCenter onNotificationClick={handleNotificationClick} />

            {/* User avatar block */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-sm)",
                  padding: "var(--space-xs) var(--space-md) var(--space-xs) var(--space-xs)",
                  background: "var(--color-surface)",
                  borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  cursor: "pointer",
                }}
              >
                {/* Gold gradient avatar */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: "var(--font-sm)", fontWeight: 700, color: "var(--color-text-primary)" }}>
                    {userInitial}
                  </span>
                </div>

                {/* Name + role */}
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                  <span style={{ fontSize: "var(--font-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {user?.full_name || user?.username || "Admin User"}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                    {user?.role || "Administrator"}
                  </span>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content
          style={{
            padding: isCompact ? 16 : 32,
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
