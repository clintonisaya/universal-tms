"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ProLayout } from "@ant-design/pro-components";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  CarOutlined,
  ScheduleOutlined,
  DollarOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  BarChartOutlined,
  AuditOutlined,
  BankOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/application/usePermissions";
import { useThemeMode } from "@/contexts/ThemeContext";
import { SECTION_MAP, resolveSection } from "@/constants/navigation";
import { useTabs } from "@/contexts/TabContext";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { clearNotifications } from "@/hooks/application/useNotifications";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ToDoWidget } from "@/components/dashboard/ToDoWidget";
import { useTodoCount } from "@/hooks/application/useApi";

/** Menu item with permission gate. Items without `requires` are always visible. */
interface PermissionMenuItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  path?: string;
  requires?: string[];
  children?: PermissionMenuItem[];
  type?: "group";
}

const allMenuItems: PermissionMenuItem[] = [
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard",
    path: "/dashboard",
  },
  {
    key: "fleet",
    icon: <CarOutlined />,
    label: "Fleet",
    children: [
      { key: "/fleet/trucks", label: "Trucks", path: "/fleet/trucks", requires: ["fleet:view"] },
      { key: "/fleet/trailers", label: "Trailers", path: "/fleet/trailers", requires: ["fleet:view"] },
      { key: "/fleet/drivers", label: "Drivers", path: "/fleet/drivers", requires: ["fleet:view"] },
      { key: "/fleet/maintenance", label: "Maintenance", path: "/fleet/maintenance", requires: ["fleet:view"] },
    ],
  },
  {
    key: "operations",
    icon: <ScheduleOutlined />,
    label: "Operations",
    children: [
      { key: "/ops/tracking", label: "Tracking", path: "/ops/tracking", requires: ["tracking:view"] },
      { key: "/ops/waybills", label: "Waybills", path: "/ops/waybills", requires: ["waybills:view"] },
      { key: "/ops/trips", label: "Trips", path: "/ops/trips", requires: ["trips:view"] },
      { key: "/ops/expenses", label: "Expenses", path: "/ops/expenses", requires: ["expenses:view"] },
    ],
  },
  {
    key: "/office-expenses",
    icon: <DollarOutlined />,
    label: "Office Expenses",
    path: "/office-expenses",
    requires: ["office-expenses:view"],
  },
  {
    key: "manager",
    icon: <AuditOutlined />,
    label: "Manager",
    children: [
      { key: "/manager/approvals", label: "Approvals", path: "/manager/approvals", requires: ["expenses:approve"] },
    ],
  },
  {
    key: "finance",
    icon: <BankOutlined />,
    label: "Finance",
    children: [
      { key: "/finance/expense-console", label: "Expense Console", path: "/finance/expense-console", requires: ["expenses:audit-console"] },
      { key: "/manager/payments", label: "Payments", path: "/manager/payments", requires: ["expenses:pay"] },
      { key: "/settings/finance", label: "Exchange Rates", path: "/settings/finance", requires: ["settings:exchange-rates"] },
      { key: "/finance/invoice-verification", label: "Invoice Verification", path: "/finance/invoice-verification", requires: ["invoices:verify"] },
    ],
  },
  {
    key: "reports",
    icon: <BarChartOutlined />,
    label: "Reports",
    children: [
      { key: "/reports/profitability", label: "Trip Profitability", path: "/reports/profitability", requires: ["reports:view"] },
    ],
  },
  {
    key: "settings",
    icon: <SettingOutlined />,
    label: "Settings",
    children: [
      { key: "/settings/clients", label: "Clients", path: "/settings/clients", requires: ["settings:clients"] },
      { key: "/settings/transport/locations", label: "Locations", path: "/settings/transport/locations", requires: ["settings:locations"] },
      { key: "/settings/transport/cargo-types", label: "Cargo Types", path: "/settings/transport/cargo-types", requires: ["settings:cargo-types"] },
      { key: "/settings/transport/vehicle-statuses", label: "Vehicle Statuses", path: "/settings/transport/vehicle-statuses", requires: ["settings:vehicle-statuses"] },
      { key: "/settings/transport/border-posts", label: "Border Posts", path: "/settings/transport/border-posts", requires: ["settings:border-posts"] },
      { key: "/settings/finance/office-expense-types", label: "Office Expense Types", path: "/settings/finance/office-expense-types", requires: ["settings:office-expense-types"] },
      { key: "/settings/trip-expenses", label: "Trip Expense Types", path: "/settings/trip-expenses", requires: ["settings:trip-expense-types"] },
      { key: "/settings/company", label: "Company", path: "/settings/company", requires: ["settings:company"] },
      { key: "/settings/users", label: "Users", path: "/settings/users", requires: ["users:manage"] },
    ],
  },
];

/** Filter menu items based on user permissions. */
function filterMenuItems(
  items: PermissionMenuItem[],
  check: (...perms: string[]) => boolean,
): PermissionMenuItem[] {
  const result: PermissionMenuItem[] = [];

  for (const item of items) {
    if (item.type === "group") {
      const filteredChildren = filterMenuItems(item.children ?? [], check);
      if (filteredChildren.length === 0) continue;
      result.push({ ...item, children: filteredChildren });
      continue;
    }

    if (item.requires && !check(...item.requires)) continue;

    if (item.children) {
      const filteredChildren = filterMenuItems(item.children, check);
      if (filteredChildren.length === 0) continue;
      result.push({ ...item, children: filteredChildren });
    } else {
      result.push(item);
    }
  }

  return result;
}

/** Convert PermissionMenuItem[] to ProLayout route format. */
function toRoutes(items: PermissionMenuItem[]): any[] {
  return items.map((item) => ({
    path: item.path || item.key,
    name: item.label,
    icon: item.icon,
    children: item.children ? toRoutes(item.children) : undefined,
  }));
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const { mode } = useThemeMode();
  const { tabs, activeKey, openTab, closeTab, switchTab } = useTabs();
  const [collapsed, setCollapsed] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  // Auto-collapse sidebar on small viewports
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

  const { data: todoData, isLoading: todoCountLoading } = useTodoCount(!!user);
  const todoCount = todoData?.total ?? 0;

  // Build permission-filtered menu and convert to routes
  const filteredItems = filterMenuItems(allMenuItems, hasAnyPermission);
  const routes = toRoutes(filteredItems);

  const handleMenuClick = (item: any) => {
    const key = item.key || item.path;
    if (key && key.startsWith("/")) {
      openTab(key);
    }
  };

  const handleLogout = async () => {
    if (user?.id) clearNotifications(user.id);
    await logout();
    router.push("/login");
  };

  const handleNotificationClick = (taskId: string) => {
    window.dispatchEvent(new CustomEvent("notification-click", { detail: taskId }));
  };

  const userMenuItems: MenuProps["items"] = [
    { key: "profile", icon: <UserOutlined />, label: "Profile" },
    { type: "divider" },
    { key: "logout", icon: <LogoutOutlined />, label: "Logout", danger: true, onClick: handleLogout },
  ];

  const pageTitle = resolveSection(pathname)?.label ?? "Nablafleet TMS";
  const userInitial = (user?.full_name || user?.username || "U").charAt(0).toUpperCase();

  return (
    <ProLayout
      title="NABLAFLEET"
      logo={false}
      layout="mix"
      fixSiderbar
      fixedHeader
      collapsed={collapsed}
      onCollapse={setCollapsed}
      collapsedButtonRender={false}
      route={{ path: "/", routes }}
      location={{ pathname }}
      menuItemRender={(item, dom) => (
        <div onClick={() => handleMenuClick(item)}>{dom}</div>
      )}
      token={{
        header: {
          colorBgHeader: mode === "dark" ? "rgba(0,0,0,0.6)" : "rgba(244,245,248,0.75)",
          colorHeaderTitle: mode === "dark" ? "#FAFAFA" : "#09090B",
          heightLayoutHeader: 64,
        },
        sider: {
          colorMenuBackground: mode === "dark" ? "#09090B" : "#FFFFFF",
          colorTextMenu: mode === "dark" ? "#A1A1AA" : "#71717A",
          colorTextMenuSelected: "#8B5CF6",
          colorBgMenuItemSelected: mode === "dark" ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.08)",
          colorTextMenuItemHover: "#8B5CF6",
          colorTextMenuActive: "#8B5CF6",
        },
        bgLayout: mode === "dark" ? "#000000" : "#F4F5F8",
      }}
      headerContentRender={() => (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          {tabs.length > 1 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                height: "100%",
                overflowX: "auto",
                scrollbarWidth: "none",
              }}
              className="tab-bar"
            >
              {tabs.map((tab) => {
                const isActive = tab.key === activeKey;
                return (
                  <div
                    key={tab.key}
                    onClick={() => switchTab(tab.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0 16px",
                      height: "100%",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                      borderBottom: isActive ? "2px solid #8B5CF6" : "2px solid transparent",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s",
                    }}
                  >
                    {tab.label}
                    {tab.closable && (
                      <span
                        onClick={(e) => { e.stopPropagation(); closeTab(tab.key); }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 16, height: 16, borderRadius: 4, fontSize: 10,
                          color: isActive ? "var(--color-text-primary)" : "var(--color-text-muted)",
                          opacity: isActive ? 1 : 0,
                          transition: "opacity 0.15s",
                        }}
                        className="tab-close-btn"
                      >
                        <CloseOutlined />
                      </span>
                    )}
                  </div>
                );
              })}
              <style>{`
                .tab-bar:hover .tab-close-btn { opacity: 1 !important; }
                .tab-bar::-webkit-scrollbar { display: none; }
              `}</style>
            </div>
          ) : (
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)" }}>
              {pageTitle}
            </span>
          )}
        </div>
      )}
      actionsRender={() => [
        <ToDoWidget
          key="todo"
          count={todoCount}
          loading={todoCountLoading}
          onClick={() => router.push("/dashboard/tasks")}
        />,
        <ThemeToggle key="theme" />,
        <NotificationCenter key="notifications" onNotificationClick={handleNotificationClick} />,
        <Dropdown key="user" menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 12px 4px 4px",
              background: "var(--color-surface)",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: "#8B5CF6",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF" }}>{userInitial}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
                {user?.full_name || user?.username || "Admin User"}
              </span>
              <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                {user?.role || "Administrator"}
              </span>
            </div>
          </div>
        </Dropdown>,
      ]}
      style={{ minHeight: "100vh" }}
    >
      {children}
    </ProLayout>
  );
}

export default AppLayout;
