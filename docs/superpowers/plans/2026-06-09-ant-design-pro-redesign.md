# Nablafleet TMS UI Redesign — ant-design-pro Style

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom Nablafleet TMS UI with ant-design-pro's layout, components, and theme system while preserving all business logic, API calls, permissions, and real-time features.

**Architecture:** ProLayout (mix mode: top nav + sidebar) replaces the custom DashboardLayout. All pages migrate to ProComponents (ProTable, ProForm, ProCard, ProDescriptions). The theme system moves from CSS variables to Ant Design's token system with `antd-style`'s `createStyles`. SettingDrawer replaces the custom ThemeToggle. Default theme is **light** mode.

**Tech Stack:** Next.js 16 (App Router), React 19, Ant Design 6, @ant-design/pro-components, antd-style, TanStack Query, Socket.IO

**Reference:** Local ant-design-pro source at `/home/clinton/.opensrc/repos/github.com/ant-design/ant-design-pro/master/`

---

## Progress Tracker

> Updated: 2026-06-09 — Branch: `feat/ant-design-pro-redesign`

| Task | Status | Commit | Notes |
|------|--------|--------|-------|
| Task 1: Install Dependencies | ✅ Done | `cbbe6db` | antd 6, @ant-design/pro-components, @ant-design/charts, @tanstack/react-query, clsx, tailwind-merge, antd-style (added later in Task 5) |
| Task 2: Create Routes Configuration | ✅ Done | `c7bf0de` | Created `src/config/routes.ts` with MenuDataItem[] format (per plan spec) |
| Task 3: Create Default Settings | ✅ Done | `cfcdc91` | Created `src/config/defaultSettings.ts` per plan spec |
| Task 4: Create Ant Design Theme | ✅ Done | `15b4ce8` | `src/theme/antd.ts` — `#1677ff` primary, `getAntdThemeConfig` |
| Task 5: Create HeaderDropdown | ✅ Done | `1030b81` | Installed antd-style, created HeaderDropdown component |
| Task 6: Create AvatarDropdown | ⬜ Todo | — | User menu in AppLayout.tsx covers this partially |
| Task 7: Create SettingDrawer | ⬜ Todo | — | |
| Task 8: Rewrite Layout with ProLayout | ✅ Done | `29534a6` | `src/components/layout/AppLayout.tsx` |
| Task 9: Replace Login Page | ✅ Done | `3d2dbb6` | ProForm + Tailwind + App.useApp() |
| Task 10: Clean Up globals.css | ⬜ Todo | — | |
| Task 11: Migrate Fleet Pages to ProTable | ⬜ Todo | — | |
| Task 12: Migrate Ops Pages to ProTable | ⬜ Todo | — | |
| Task 13: Migrate Finance Pages to ProTable | ⬜ Todo | — | |
| Task 14: Migrate Settings Pages to ProTable | ⬜ Todo | — | |
| Task 15: Migrate Dashboard to ProCard | ⬜ Todo | — | |
| Task 16: Remove ThemeContext & ThemeToggle | ⬜ Todo | — | |
| Task 17: Remove NotificationCenter & themeConfig | ⬜ Todo | — | |
| Task 18: Final Verification | ⬜ Todo | — | |

**Additional work completed (not in original plan):**
- Reorganized hooks → `src/hooks/application/` (commit `9e0978a`)
- Reorganized features → `src/features/business/` (commit `9e0978a`)
- Created `src/lib/utils/cn.ts` with clsx + tailwind-merge (commit `9e0978a`)
- Created `src/providers/` directory with AntdRegistry + QueryProvider (commit `cbbe6db`)
- Created `src/components/forms/` — Input, Select, DatePicker wrappers (commit `0b4840e`)
- Created `src/components/tables/DataTable.tsx` — @tanstack/react-table wrapper (commit `517a5ae`)
- Created `src/components/charts/` — LineChart, BarChart, PieChart, StatCard (commit `5ceec8e`)
- Created `src/components/layout/MobileNav.tsx` (commit `e61103e`)
- Created `src/components/feedback/LoadingSpinner.tsx` (commit `e61103e`)
- Created `.mcp.json` with context7 MCP server (commit `9e0978a`)

---

## File Structure

### New Files
- `frontend/src/config/routes.ts` — Routes configuration for ProLayout menu structure
- `frontend/src/config/defaultSettings.ts` — Default ProLayout settings (light theme, mix mode)
- `frontend/src/components/RightContent/AvatarDropdown.tsx` — User avatar dropdown with theme settings
- `frontend/src/components/RightContent/index.tsx` — Barrel export for RightContent components
- `frontend/src/components/HeaderDropdown/index.tsx` — Styled dropdown wrapper (from ant-design-pro)
- `frontend/src/components/SettingDrawer/index.tsx` — SettingDrawer wrapper for theme customization
- `frontend/src/theme/antd.ts` — Ant Design token configuration (replaces themeConfig.ts)

### Modified Files
- `frontend/package.json` — Add @ant-design/pro-components, antd-style
- `frontend/src/app/layout.tsx` — Remove ThemeProvider, update providers
- `frontend/src/app/(authenticated)/layout.tsx` — Rewritten to use ProLayout
- `frontend/src/app/login/page.tsx` — Replace with ProLoginForm
- `frontend/src/app/globals.css` — Remove CSS variables, keep minimal resets
- All `page.tsx` files — Migrate to ProComponents

### Removed Files
- `frontend/src/contexts/ThemeContext.tsx` — Replaced by SettingDrawer + initialState
- `frontend/src/components/ui/ThemeToggle.tsx` — Replaced by SettingDrawer
- `frontend/src/components/layout/NotificationCenter.tsx` — Removed per spec
- `frontend/src/components/dashboard/DashboardLayout.tsx` — Replaced by ProLayout
- `frontend/src/theme/themeConfig.ts` — Replaced by antd.ts

---

## Task 1: Install Dependencies

**Files:**
- Modify: `frontend/package.json`

- [x] **Step 1: Add @ant-design/pro-components and antd-style**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm install @ant-design/pro-components antd-style
```

- [x] **Step 2: Verify installation**

```bash
npm ls @ant-design/pro-components antd-style
```

Expected: Both packages listed with versions.

- [x] **Step 3: Verify build still works**

```bash
npm run build
```

Expected: Build succeeds.

- [x] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "deps: add @ant-design/pro-components and antd-style"
```

---

## Task 2: Create Routes Configuration

**Files:**
- Create: `frontend/src/config/routes.ts`

**Reference:** `/home/clinton/.opensrc/repos/github.com/ant-design/ant-design-pro/master/config/routes.ts`

- [x] **Step 1: Create routes config file**

```typescript
// frontend/src/config/routes.ts
import type { MenuDataItem } from "@ant-design/pro-components";
import {
  DashboardOutlined,
  CarOutlined,
  ScheduleOutlined,
  DollarOutlined,
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  SettingOutlined,
} from "@ant-design/icons";

/**
 * Routes configuration for ProLayout.
 * Reference: ant-design-pro/config/routes.ts
 *
 * Each route has: path, name, icon, access (permission key), and optional routes (children).
 * ProLayout renders this as top nav (main sections) + sidebar (sub-pages) in mix mode.
 */
const routes: MenuDataItem[] = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: <DashboardOutlined />,
  },
  {
    path: "/fleet",
    name: "Fleet",
    icon: <CarOutlined />,
    routes: [
      { path: "/fleet/trucks", name: "Trucks", access: "fleet:view" },
      { path: "/fleet/trailers", name: "Trailers", access: "fleet:view" },
      { path: "/fleet/drivers", name: "Drivers", access: "fleet:view" },
      { path: "/fleet/maintenance", name: "Maintenance", access: "fleet:view" },
    ],
  },
  {
    path: "/ops",
    name: "Operations",
    icon: <ScheduleOutlined />,
    routes: [
      { path: "/ops/tracking", name: "Tracking", access: "tracking:view" },
      { path: "/ops/waybills", name: "Waybills", access: "waybills:view" },
      { path: "/ops/trips", name: "Trips", access: "trips:view" },
      { path: "/ops/expenses", name: "Expenses", access: "expenses:view" },
    ],
  },
  {
    path: "/office-expenses",
    name: "Office Expenses",
    icon: <DollarOutlined />,
    access: "office-expenses:view",
  },
  {
    path: "/manager",
    name: "Manager",
    icon: <AuditOutlined />,
    routes: [
      { path: "/manager/approvals", name: "Approvals", access: "expenses:approve" },
    ],
  },
  {
    path: "/finance",
    name: "Finance",
    icon: <BankOutlined />,
    routes: [
      { path: "/finance/expense-console", name: "Expense Console", access: "expenses:audit-console" },
      { path: "/manager/payments", name: "Payments", access: "expenses:pay" },
      { path: "/settings/finance", name: "Exchange Rates", access: "settings:exchange-rates" },
      { path: "/finance/invoice-verification", name: "Invoice Verification", access: "invoices:verify" },
    ],
  },
  {
    path: "/reports",
    name: "Reports",
    icon: <BarChartOutlined />,
    routes: [
      { path: "/reports/profitability", name: "Trip Profitability", access: "reports:view" },
    ],
  },
  {
    path: "/settings",
    name: "Settings",
    icon: <SettingOutlined />,
    routes: [
      { path: "/settings/clients", name: "Clients", access: "settings:clients" },
      { path: "/settings/transport/locations", name: "Locations", access: "settings:locations" },
      { path: "/settings/transport/cargo-types", name: "Cargo Types", access: "settings:cargo-types" },
      { path: "/settings/transport/vehicle-statuses", name: "Vehicle Statuses", access: "settings:vehicle-statuses" },
      { path: "/settings/transport/border-posts", name: "Border Posts", access: "settings:border-posts" },
      { path: "/settings/finance/office-expense-types", name: "Office Expense Types", access: "settings:office-expense-types" },
      { path: "/settings/trip-expenses", name: "Trip Expense Types", access: "settings:trip-expense-types" },
      { path: "/settings/company", name: "Company", access: "settings:company" },
      { path: "/settings/users", name: "Users", access: "users:manage" },
    ],
  },
];

export default routes;
```

- [x] **Step 2: Commit**

```bash
git add frontend/src/config/routes.ts
git commit -m "feat: add routes config for ProLayout menu structure"
```

---

## Task 3: Create Default Settings Configuration

**Files:**
- Create: `frontend/src/config/defaultSettings.ts`

**Reference:** `/home/clinton/.opensrc/repos/github.com/ant-design/ant-design-pro/master/config/defaultSettings.ts`

- [x] **Step 1: Create defaultSettings.ts**

```typescript
// frontend/src/config/defaultSettings.ts
import type { ProLayoutProps } from "@ant-design/pro-components";

/**
 * Default ProLayout settings.
 * Reference: ant-design-pro/config/defaultSettings.ts
 *
 * These settings are passed to ProLayout and can be overridden by SettingDrawer.
 * Default theme is LIGHT mode (not dark).
 */
const defaultSettings: ProLayoutProps & {
  logo?: string;
} = {
  navTheme: "light",
  colorPrimary: "#1677ff",
  layout: "mix",
  contentWidth: "Fluid",
  fixedHeader: true,
  fixSiderbar: true,
  colorWeak: false,
  title: "Nablafleet",
  logo: undefined,
  token: {
    // Custom tokens for Nablafleet branding
    header: {
      colorBgHeader: "rgba(255,255,255,0.75)",
      heightLayoutHeader: 64,
    },
    sider: {
      colorMenuBackground: "#ffffff",
      colorTextMenu: "#71717A",
      colorTextMenuSelected: "#1677ff",
      colorBgMenuItemSelected: "rgba(22,119,255,0.08)",
    },
  },
};

export default defaultSettings;
```

- [x] **Step 2: Commit**

```bash
git add frontend/src/config/defaultSettings.ts
git commit -m "feat: add default settings for ProLayout (light theme, mix mode)"
```

---

## Task 4: Create Ant Design Theme Configuration

**Files:**
- Create: `frontend/src/theme/antd.ts`

**Reference:** `/home/clinton/.opensrc/repos/github.com/ant-design/ant-design-pro/master/config/defaultSettings.ts` for token values

- [x] **Step 1: Create antd.ts with token configuration**

```typescript
// frontend/src/theme/antd.ts
import type { ThemeConfig } from "antd";
import { theme } from "antd";

/**
 * Ant Design theme configuration.
 * Reference: ant-design-pro uses antd-style for component-level styling.
 *
 * This file provides the base theme config for ConfigProvider.
 * Component-level styles use createStyles from antd-style.
 *
 * Default is LIGHT mode. Dark mode uses darkAlgorithm.
 */
export function getAntdThemeConfig(mode: "dark" | "light"): ThemeConfig {
  const isDark = mode === "dark";

  return {
    algorithm: isDark
      ? [theme.darkAlgorithm, theme.compactAlgorithm]
      : theme.compactAlgorithm,
    token: {
      // Brand color — Ant Design blue
      colorPrimary: "#1677ff",
      colorInfo: "#1677ff",

      // Base colors
      colorTextBase: isDark ? "#ffffff" : "#000000",
      colorBgBase: isDark ? "#000000" : "#ffffff",

      // Container & border tokens
      colorBgContainer: isDark ? "#141414" : "#ffffff",
      colorBgLayout: isDark ? "#000000" : "#f5f5f5",
      colorBgElevated: isDark ? "#1f1f1f" : "#ffffff",
      colorBorder: isDark ? "#424242" : "#d9d9d9",
      colorText: isDark ? "#ffffff" : "#000000",
      colorTextSecondary: isDark ? "#a6a6a6" : "#8c8c8c",
      colorTextTertiary: isDark ? "#737373" : "#bfbfbf",
      colorTextPlaceholder: isDark ? "#737373" : "#bfbfbf",

      // Font
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 14,
      fontSizeHeading1: 26,
      fontSizeHeading2: 20,
      fontSizeHeading3: 18,
      fontSizeHeading4: 16,

      // Spacing & shape
      borderRadius: 6,
      controlHeight: 34,
    },
    components: {
      Layout: {
        headerBg: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.75)",
        bodyBg: isDark ? "#000000" : "#f5f5f5",
        siderBg: isDark ? "#141414" : "#ffffff",
      },
      Table: {
        headerBg: "transparent",
        headerColor: isDark ? "#a6a6a6" : "#8c8c8c",
        headerSplitColor: isDark ? "#424242" : "#d9d9d9",
        rowHoverBg: isDark ? "#1f1f1f" : "#fafafa",
        borderColor: isDark ? "#424242" : "#d9d9d9",
        cellPaddingBlock: 12,
        cellPaddingInline: 16,
        cellFontSize: 14,
      },
      Card: {
        headerFontSize: 14,
        borderRadiusLG: 8,
      },
      Button: {
        primaryShadow: "0 2px 0 rgba(0,0,0,0.02)",
        fontWeight: 600,
        borderRadius: 6,
      },
      Menu: {
        itemBg: "transparent",
        subMenuItemBg: "transparent",
        itemSelectedBg: isDark ? "rgba(22,119,255,0.15)" : "rgba(22,119,255,0.08)",
        itemSelectedColor: "#1677ff",
        itemColor: isDark ? "#a6a6a6" : "#8c8c8c",
        itemHoverColor: "#1677ff",
        itemBorderRadius: 8,
        itemMarginInline: 8,
        itemPaddingInline: 16,
        itemHeight: 40,
        iconSize: 16,
        fontSize: 14,
      },
      Modal: {
        headerBg: isDark ? "#141414" : "#ffffff",
        contentBg: isDark ? "#141414" : "#ffffff",
        titleFontSize: 16,
      },
      Drawer: {
        colorBgElevated: isDark ? "#141414" : "#ffffff",
      },
      Tag: {
        borderRadiusSM: 4,
      },
    },
  };
}
```

- [x] **Step 2: Commit**

```bash
git add frontend/src/theme/antd.ts
git commit -m "feat: add antd.ts theme config with token system (default light)"
```

---

## Task 5: Create HeaderDropdown Component

**Files:**
- Create: `frontend/src/components/HeaderDropdown/index.tsx`

**Reference:** `/home/clinton/.opensrc/repos/github.com/ant-design/ant-design-pro/master/src/components/HeaderDropdown/index.tsx`

- [x] **Step 1: Create HeaderDropdown component**

```typescript
// frontend/src/components/HeaderDropdown/index.tsx
"use client";

import { Dropdown } from "antd";
import type { DropDownProps } from "antd/es/dropdown";
import { createStyles } from "antd-style";
import clsx from "clsx";
import React from "react";

const useStyles = createStyles(({ token }) => {
  return {
    dropdown: {
      [`@media screen and (max-width: ${token.screenXS}px)`]: {
        width: "100%",
      },
      ".ant-dropdown-menu-item .anticon, .ant-dropdown-menu-submenu-title .anticon":
        {
          display: "inline-flex",
          alignItems: "center",
        },
      ".ant-dropdown-menu-submenu-title .anticon": {
        color: token.colorTextSecondary,
      },
    },
  };
});

export type HeaderDropdownProps = {
  overlayClassName?: string;
  placement?:
    | "bottomLeft"
    | "bottomRight"
    | "topLeft"
    | "topCenter"
    | "topRight"
    | "bottomCenter";
} & Omit<DropDownProps, "overlay">;

const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
  overlayClassName: cls,
  ...restProps
}) => {
  const { styles } = useStyles();
  return (
    <Dropdown
      classNames={{
        root: clsx(styles.dropdown, cls),
      }}
      {...restProps}
    />
  );
};

export default HeaderDropdown;
```

- [x] **Step 2: Commit**

```bash
git add frontend/src/components/HeaderDropdown/index.tsx
git commit -m "feat: add HeaderDropdown component (from ant-design-pro)"
```

---

## Task 6: Create AvatarDropdown Component

**Files:**
- Create: `frontend/src/components/RightContent/AvatarDropdown.tsx`
- Create: `frontend/src/components/RightContent/index.tsx`

**Reference:** `/home/clinton/.opensrc/repos/github.com/ant-design/ant-design-pro/master/src/components/RightContent/AvatarDropdown.tsx`

- [ ] **Step 1: Create AvatarDropdown with theme settings option**

```typescript
// frontend/src/components/RightContent/AvatarDropdown.tsx
"use client";

import {
  LogoutOutlined,
  SettingOutlined,
  SkinOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar } from "antd";
import type { MenuProps } from "antd";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { clearNotifications } from "@/hooks/useNotifications";
import HeaderDropdown from "@/components/HeaderDropdown";

type AvatarDropdownProps = {
  children?: React.ReactNode;
  onThemeSettingsClick?: () => void;
};

/**
 * AvatarDropdown for ProLayout header.
 * Reference: ant-design-pro/src/components/RightContent/AvatarDropdown.tsx
 *
 * Includes:
 * - Profile link
 * - Theme settings (opens SettingDrawer)
 * - Logout
 */
export const AvatarDropdown: React.FC<AvatarDropdownProps> = ({
  children,
  onThemeSettingsClick,
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    if (user?.id) clearNotifications(user.id);
    await logout();
    router.push("/login");
  };

  const onMenuClick: MenuProps["onClick"] = (event) => {
    const { key } = event;
    if (key === "logout") {
      handleLogout();
      return;
    }
    if (key === "theme") {
      onThemeSettingsClick?.();
      return;
    }
    if (key === "profile") {
      // Navigate to profile page if it exists
      return;
    }
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      key: "theme",
      icon: <SkinOutlined />,
      label: "Theme Settings",
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      danger: true,
    },
  ];

  const userInitial = (user?.full_name || user?.username || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <HeaderDropdown
      placement="bottomRight"
      menu={{
        selectedKeys: [],
        onClick: onMenuClick,
        items: menuItems,
      }}
      arrow
    >
      {children || (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            padding: "0 8px",
          }}
        >
          <Avatar
            size="small"
            style={{
              backgroundColor: "#1677ff",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            {userInitial}
          </Avatar>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {user?.full_name || user?.username || "User"}
          </span>
        </div>
      )}
    </HeaderDropdown>
  );
};

export default AvatarDropdown;
```

- [ ] **Step 2: Create barrel export**

```typescript
// frontend/src/components/RightContent/index.tsx
export { AvatarDropdown } from "./AvatarDropdown";
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/RightContent/ frontend/src/components/HeaderDropdown/
git commit -m "feat: add AvatarDropdown with theme settings (ant-design-pro pattern)"
```

---

## Task 7: Create SettingDrawer Wrapper

**Files:**
- Create: `frontend/src/components/SettingDrawer/index.tsx`

**Reference:** `/home/clinton/.opensrc/repos/github.com/ant-design/ant-design-pro/master/src/app.tsx` (childrenRender section)

- [ ] **Step 1: Create SettingDrawer component**

```typescript
// frontend/src/components/SettingDrawer/index.tsx
"use client";

import { SettingDrawer as AntSettingDrawer } from "@ant-design/pro-components";
import type { Settings as LayoutSettings } from "@ant-design/pro-components";

const STORAGE_KEY = "nablafleet-settings";

function loadSettings(): Partial<LayoutSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveSettings(settings: Partial<LayoutSettings>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable
  }
}

interface SettingDrawerWrapperProps {
  settings: Partial<LayoutSettings>;
  onSettingsChange: (settings: Partial<LayoutSettings>) => void;
  collapse: boolean;
  onCollapseChange: (collapse: boolean) => void;
}

/**
 * SettingDrawer wrapper for theme customization.
 * Reference: ant-design-pro/src/app.tsx childrenRender
 *
 * Provides a slide-out panel for:
 * - Color Primary (brand color)
 * - Nav Mode (Side / Mix / Top)
 * - Content Width (Fixed / Fluid)
 * - Fixed Header toggle
 * - Fix Sidebar toggle
 * - Color Weak (accessibility)
 * - Dark Theme toggle
 */
export function SettingDrawer({
  settings,
  onSettingsChange,
  collapse,
  onCollapseChange,
}: SettingDrawerWrapperProps) {
  return (
    <AntSettingDrawer
      disableUrlParams
      enableDarkTheme
      collapse={collapse}
      onCollapseChange={onCollapseChange}
      settings={settings}
      onSettingChange={(newSettings) => {
        onSettingsChange(newSettings);
        saveSettings(newSettings);
      }}
    />
  );
}

export { loadSettings, saveSettings };
export type { LayoutSettings };
export default SettingDrawer;
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/SettingDrawer/index.tsx
git commit -m "feat: add SettingDrawer wrapper (ant-design-pro pattern)"
```

---

## Task 8: Rewrite Authenticated Layout with ProLayout

**Files:**
- Modify: `frontend/src/app/(authenticated)/layout.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Delete: `frontend/src/components/dashboard/DashboardLayout.tsx`

**Reference:** `/home/clinton/.opensrc/repos/github.com/ant-design/ant-design-pro/master/src/app.tsx`

- [x] **Step 1: Rewrite authenticated layout**

```typescript
// frontend/src/app/(authenticated)/layout.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Settings as LayoutSettings } from "@ant-design/pro-components";
import { ProLayout } from "@ant-design/pro-components";
import { ConfigProvider, App } from "antd";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTabs } from "@/contexts/TabContext";
import { SocketProvider } from "@/lib/socket";
import { SessionExpiredModal } from "@/components/auth/SessionExpiredModal";
import { AvatarDropdown } from "@/components/RightContent/AvatarDropdown";
import { SettingDrawer, loadSettings } from "@/components/SettingDrawer";
import { ToDoWidget } from "@/components/dashboard/ToDoWidget";
import { useTodoCount } from "@/hooks/useApi";
import { getAntdThemeConfig } from "@/theme/antd";
import defaultSettings from "@/config/defaultSettings";
import routes from "@/config/routes";

// Permission filter for menu items
function filterRoutesByPermission(
  items: any[],
  hasAnyPermission: (...perms: string[]) => boolean
): any[] {
  return items
    .map((item) => {
      if (item.access && !hasAnyPermission(item.access)) {
        return null;
      }
      if (item.routes) {
        const filteredChildren = filterRoutesByPermission(
          item.routes,
          hasAnyPermission
        );
        if (filteredChildren.length === 0) return null;
        return { ...item, routes: filteredChildren };
      }
      return item;
    })
    .filter(Boolean);
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const { tabs, activeKey, openTab, closeTab, switchTab } = useTabs();
  const { data: todoData } = useTodoCount(!!user);

  // Settings state — initialized from localStorage, falls back to defaultSettings
  const [settings, setSettings] = useState<Partial<LayoutSettings>>(() => ({
    ...defaultSettings,
    ...loadSettings(),
  }));
  const [settingDrawerOpen, setSettingDrawerOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const todoCount = todoData?.total ?? 0;
  const isDark = settings.navTheme === "realDark";
  const themeConfig = getAntdThemeConfig(isDark ? "dark" : "light");

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light"
    );
  }, [isDark]);

  // Handle auth redirect
  useEffect(() => {
    if (loading) return;
    if (!user) {
      const wasAuthenticated =
        typeof window !== "undefined" &&
        sessionStorage.getItem("nablafleet_was_authenticated") === "true";
      if (wasAuthenticated) {
        setShowLoginModal(true);
      } else {
        setIsRedirecting(true);
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  // Listen for session expiry
  useEffect(() => {
    const handleSessionExpiry = () => setShowLoginModal(true);
    window.addEventListener("session-expired", handleSessionExpiry);
    return () =>
      window.removeEventListener("session-expired", handleSessionExpiry);
  }, []);

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    window.location.reload();
  };

  // Filter routes by permission
  const filteredRoutes = filterRoutesByPermission(routes, hasAnyPermission);

  // Loading states
  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Redirecting to login...
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <SessionExpiredModal
          open={showLoginModal}
          onSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <ConfigProvider theme={themeConfig}>
      <App>
        <SocketProvider>
          <ProLayout
            title={defaultSettings.title}
            logo={defaultSettings.logo}
            layout={settings.layout || defaultSettings.layout}
            navTheme={isDark ? "realDark" : "light"}
            contentWidth={settings.contentWidth || defaultSettings.contentWidth}
            fixedHeader={settings.fixedHeader ?? defaultSettings.fixedHeader}
            fixSiderbar={settings.fixSiderbar ?? defaultSettings.fixSiderbar}
            colorPrimary={settings.colorPrimary || defaultSettings.colorPrimary}
            colorWeak={settings.colorWeak ?? defaultSettings.colorWeak}
            route={{ routes: filteredRoutes }}
            location={{ pathname }}
            token={defaultSettings.token}
            menuItemRender={(item, dom) => (
              <div
                onClick={() => {
                  if (item.path) {
                    openTab(item.path);
                  }
                }}
              >
                {dom}
              </div>
            )}
            actionsRender={() => [
              <ToDoWidget
                key="todo"
                count={todoCount}
                loading={false}
                onClick={() => router.push("/dashboard/tasks")}
              />,
              <AvatarDropdown
                key="avatar"
                onThemeSettingsClick={() => setSettingDrawerOpen(true)}
              />,
            ]}
            {...(settings.colorPrimary
              ? { colorPrimary: settings.colorPrimary }
              : {})}
          >
            {/* Tab bar */}
            {tabs.length > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                  height: 40,
                  overflowX: "auto",
                  borderBottom: "1px solid var(--ant-color-border)",
                  marginBottom: 16,
                  scrollbarWidth: "none",
                }}
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
                        color: isActive
                          ? "var(--ant-color-text)"
                          : "var(--ant-color-text-secondary)",
                        borderBottom: isActive
                          ? "2px solid var(--ant-color-primary)"
                          : "2px solid transparent",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tab.label}
                      {tab.closable && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTab(tab.key);
                          }}
                          style={{
                            fontSize: 10,
                            opacity: isActive ? 1 : 0,
                            transition: "opacity 0.15s",
                          }}
                        >
                          ×
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Page content */}
            {children}

            {/* SettingDrawer — reference: ant-design-pro/src/app.tsx childrenRender */}
            <SettingDrawer
              settings={settings}
              onSettingsChange={setSettings}
              collapse={settingDrawerOpen}
              onCollapseChange={setSettingDrawerOpen}
            />
          </ProLayout>

          <SessionExpiredModal
            open={showLoginModal}
            onSuccess={handleLoginSuccess}
          />
        </SocketProvider>
      </App>
    </ConfigProvider>
  );
}
```

- [x] **Step 2: Update root layout to remove ThemeProvider**

```typescript
// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/lib/queryClient";
import { TabProvider } from "@/contexts/TabContext";
import "react-resizable/css/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nablafleet TMS",
  description: "Transport Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className="antialiased">
        <AntdRegistry>
          <QueryProvider>
            <TabProvider>
              <AuthProvider>{children}</AuthProvider>
            </TabProvider>
          </QueryProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
```

- [x] **Step 3: Delete old DashboardLayout.tsx**

```bash
rm frontend/src/components/dashboard/DashboardLayout.tsx
```

- [x] **Step 4: Verify build compiles**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm run build
```

Expected: Build succeeds.

- [x] **Step 5: Commit**

```bash
git add frontend/src/app/(authenticated)/layout.tsx frontend/src/app/layout.tsx
git rm frontend/src/components/dashboard/DashboardLayout.tsx
git commit -m "feat: replace authenticated layout with ProLayout (ant-design-pro pattern)"
```

---

## Task 9: Replace Login Page with ProLoginForm

**Files:**
- Modify: `frontend/src/app/login/page.tsx`

**Reference:** `/home/clinton/.opensrc/repos/github.com/ant-design/ant-design-pro/master/src/pages/user/login/index.tsx`

- [x] **Step 1: Rewrite login page**

```typescript
// frontend/src/app/login/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm, ProFormText } from "@ant-design/pro-components";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { message, App, Alert, Typography } from "antd";
import { createStyles } from "antd-style";
import { useAuth } from "@/contexts/AuthContext";

const { Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100vh",
    overflow: "auto",
    backgroundImage:
      "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
    backgroundSize: "100% 100%",
  },
}));

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { styles } = useStyles();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Validate callbackUrl is relative to prevent open redirect
  const raw = searchParams.get("callbackUrl") || "/dashboard";
  const callbackUrl = raw.startsWith("/") ? raw : "/dashboard";

  const handleSubmit = async (values: {
    username: string;
    password: string;
  }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const success = await login(values.username, values.password);
      if (success) {
        message.success("Login successful!");
        router.push(callbackUrl);
      } else {
        setErrorMsg("Invalid username or password. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div style={{ flex: "1", padding: "32px 0" }}>
        <LoginForm
          contentStyle={{ minWidth: 280, maxWidth: "75vw" }}
          logo={null}
          title="Nablafleet"
          subTitle="Fleet Management System"
          loading={loading}
          onFinish={handleSubmit}
        >
          {errorMsg && (
            <Alert
              style={{ marginBottom: 24 }}
              message={errorMsg}
              type="error"
              showIcon
            />
          )}

          <ProFormText
            name="username"
            fieldProps={{
              size: "large",
              prefix: <UserOutlined />,
            }}
            placeholder="Username"
            rules={[
              { required: true, message: "Please enter your username" },
            ]}
          />

          <ProFormText.Password
            name="password"
            fieldProps={{
              size: "large",
              prefix: <LockOutlined />,
            }}
            placeholder="Password"
            rules={[
              { required: true, message: "Please enter your password" },
            ]}
          />
        </LoginForm>
      </div>

      <div style={{ textAlign: "center", padding: "16px 24px" }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Nablafleet TMS © {new Date().getFullYear()}
        </Text>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          Loading...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
```

- [x] **Step 2: Verify build compiles**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm run build
```

Expected: Build succeeds.

- [x] **Step 3: Commit**

```bash
git add frontend/src/app/login/page.tsx
git commit -m "feat: replace login page with ProLoginForm (ant-design-pro pattern)"
```

---

## Task 10: Clean Up globals.css

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Rewrite globals.css with minimal resets**

```css
/* frontend/src/app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@import "tailwindcss";

/* Global font */
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Global box-sizing */
*, *::before, *::after {
  box-sizing: border-box;
}

/* Scrollbar — thin, transparent track */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--ant-color-border);
  border-radius: 3px;
}

/* Firefox scrollbar */
:root {
  scrollbar-width: thin;
  scrollbar-color: var(--ant-color-border) transparent;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  body { transition: none; }
}

/* Row actions: hidden by default, visible on hover */
.row-actions {
  opacity: 0 !important;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.ant-table-tbody > tr.ant-table-row:hover .row-actions,
.ant-table-tbody > tr:hover .row-actions,
tr:hover > td .row-actions {
  opacity: 1 !important;
  pointer-events: auto;
}

.row-actions:focus-within {
  opacity: 1 !important;
  pointer-events: auto;
}

/* Resizable column handle */
.react-resizable {
  position: relative;
  background-clip: padding-box;
}

.react-resizable-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 10;
  width: 10px;
  height: 100% !important;
  cursor: col-resize;
  background: transparent;
}

.react-resizable-handle::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1px;
  height: 50%;
  min-height: 16px;
  background-color: var(--ant-color-border);
  transition: background-color 0.2s ease, width 0.2s ease;
}

.react-resizable-handle:hover::before,
.react-resizable-handle:active::before {
  background-color: var(--ant-color-primary);
  width: 2px;
}

/* Ensure table header cells can contain resizable handle */
.ant-table-thead > tr > th {
  position: relative !important;
}

.ant-table-thead > tr > th.react-resizable {
  overflow: visible;
}

/* Tab bar scrollbar hiding */
.tab-bar::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 2: Verify build compiles**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "refactor: clean up globals.css, remove CSS variables"
```

---

## Task 11: Migrate Fleet Pages to ProTable

**Files:**
- Modify: `frontend/src/app/(authenticated)/fleet/trucks/page.tsx`
- Modify: `frontend/src/app/(authenticated)/fleet/trailers/page.tsx`
- Modify: `frontend/src/app/(authenticated)/fleet/drivers/page.tsx`

**Reference:** `/home/clinton/.opensrc/repos/github.com/ant-design/ant-design-pro/master/src/pages/table-list/index.tsx`

- [ ] **Step 1: Migrate Trucks page to ProTable**

```typescript
// frontend/src/app/(authenticated)/fleet/trucks/page.tsx
"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ProTable,
  ProColumns,
  ModalForm,
  ProFormText,
  ProFormSelect,
} from "@ant-design/pro-components";
import { Button, App, Popconfirm, Space } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { Truck, TruckCreate } from "@/types/truck";
import { useAuth } from "@/contexts/AuthContext";
import { useInvalidateQueries } from "@/hooks/useApi";
import { VehicleStatusTag } from "@/components/ui/VehicleStatusTag";
import type { ActionType } from "@ant-design/pro-components";

export default function TrucksPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { user } = useAuth();
  const { invalidateTrucks } = useInvalidateQueries();
  const actionRef = useRef<ActionType>();

  const handleCreate = async (values: TruckCreate) => {
    try {
      const response = await fetch("/api/v1/trucks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("Truck registered successfully");
        actionRef.current?.reload();
        return true;
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create truck");
        return false;
      }
    } catch {
      message.error("Network error");
      return false;
    }
  };

  const handleDelete = async (truck: Truck) => {
    try {
      const response = await fetch(`/api/v1/trucks/${truck.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        message.success("Truck deleted successfully");
        actionRef.current?.reload();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete truck");
      }
    } catch {
      message.error("Network error");
    }
  };

  const columns: ProColumns<Truck>[] = [
    {
      title: "Plate Number",
      dataIndex: "plate_number",
      key: "plate_number",
      width: 150,
      sorter: true,
      fieldProps: { placeholder: "Search plate number" },
    },
    {
      title: "Make",
      dataIndex: "make",
      key: "make",
      width: 140,
      sorter: true,
      fieldProps: { placeholder: "Search make" },
    },
    {
      title: "Model",
      dataIndex: "model",
      key: "model",
      width: 140,
      sorter: true,
      fieldProps: { placeholder: "Search model" },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      valueType: "select",
      valueEnum: {
        Idle: { text: "Idle", status: "Default" },
        "In Transit": { text: "In Transit", status: "Processing" },
        Maintenance: { text: "Maintenance", status: "Warning" },
      },
      render: (_, record) => <VehicleStatusTag status={record.status} />,
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      valueType: "option",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/fleet/trucks/${record.id}`)}
          />
          <Popconfirm
            title="Delete truck"
            description={`Are you sure you want to delete ${record.plate_number}?`}
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ProTable<Truck>
      headerTitle="Truck Registry"
      actionRef={actionRef}
      columns={columns}
      rowKey="id"
      request={async () => {
        const response = await fetch("/api/v1/trucks", {
          credentials: "include",
        });
        const data = await response.json();
        return {
          data: data.data || [],
          total: data.count || 0,
          success: true,
        };
      }}
      search={{ labelWidth: "auto" }}
      pagination={{
        defaultPageSize: 20,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
      }}
      toolBarRender={() => [
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={() => actionRef.current?.reload()}
        >
          Refresh
        </Button>,
        <ModalForm<TruckCreate>
          key="create"
          title="Register New Truck"
          trigger={
            <Button type="primary" icon={<PlusOutlined />}>
              New Truck
            </Button>
          }
          onFinish={handleCreate}
          initialValues={{ status: "Idle" }}
        >
          <ProFormText
            name="plate_number"
            label="Plate Number"
            rules={[
              { required: true, message: "Please enter plate number" },
              { max: 20, message: "Plate number too long" },
            ]}
            placeholder="e.g., T998 EMQ"
          />
          <ProFormText
            name="make"
            label="Make"
            rules={[
              { required: true, message: "Please enter make" },
              { max: 100, message: "Make name too long" },
            ]}
            placeholder="e.g., XCMG"
          />
          <ProFormText
            name="model"
            label="Model"
            rules={[
              { required: true, message: "Please enter model" },
              { max: 100, message: "Model name too long" },
            ]}
            placeholder="e.g., HANVAN G7"
          />
          <ProFormSelect
            name="status"
            label="Status"
            options={[
              { label: "Idle", value: "Idle" },
              { label: "In Transit", value: "In Transit" },
              { label: "Maintenance", value: "Maintenance" },
            ]}
          />
        </ModalForm>,
      ]}
    />
  );
}
```

- [ ] **Step 2: Migrate Trailers page to ProTable**

Apply the same pattern as Trucks page, adapting columns for trailer fields (trailer_number, type, capacity, status).

- [ ] **Step 3: Migrate Drivers page to ProTable**

Apply the same pattern as Trucks page, adapting columns for driver fields (name, license_number, phone, status).

- [ ] **Step 4: Verify build compiles**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(authenticated)/fleet/
git commit -m "feat: migrate fleet pages to ProTable"
```

---

## Task 12: Migrate Operations Pages to ProTable

**Files:**
- Modify: `frontend/src/app/(authenticated)/ops/trips/page.tsx`
- Modify: `frontend/src/app/(authenticated)/ops/waybills/page.tsx`
- Modify: `frontend/src/app/(authenticated)/ops/expenses/page.tsx`
- Modify: `frontend/src/app/(authenticated)/ops/tracking/page.tsx`

- [ ] **Step 1: Migrate Trips page to ProTable**

Apply the ProTable pattern from Task 11, adapting columns for trip fields:
- Trip ID, Origin, Destination, Status, Driver, Truck, Dates, Actions
- Use `valueType: "date"` for date columns
- Use `valueType: "select"` for status filters
- Use `valueType: "tag"` for status badges

- [ ] **Step 2: Migrate Waybills page to ProTable**

Apply the ProTable pattern, adapting columns for waybill fields.

- [ ] **Step 3: Migrate Expenses page to ProTable**

Apply the ProTable pattern, adapting columns for expense fields.

- [ ] **Step 4: Migrate Tracking page**

The tracking page may have a different layout (map view). Keep the existing implementation if it doesn't use a table, or migrate to ProTable if it does.

- [ ] **Step 5: Verify build compiles**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/(authenticated)/ops/
git commit -m "feat: migrate operations pages to ProTable"
```

---

## Task 13: Migrate Finance & Manager Pages to ProTable

**Files:**
- Modify: `frontend/src/app/(authenticated)/finance/expense-console/page.tsx`
- Modify: `frontend/src/app/(authenticated)/finance/invoice-verification/page.tsx`
- Modify: `frontend/src/app/(authenticated)/manager/approvals/page.tsx`
- Modify: `frontend/src/app/(authenticated)/manager/payments/page.tsx`

- [ ] **Step 1: Migrate Expense Console page to ProTable**

Apply the ProTable pattern, adapting columns for expense console fields.

- [ ] **Step 2: Migrate Invoice Verification page to ProTable**

Apply the ProTable pattern, adapting columns for invoice verification fields.

- [ ] **Step 3: Migrate Approvals page to ProTable**

Apply the ProTable pattern, adapting columns for approval fields.

- [ ] **Step 4: Migrate Payments page to ProTable**

Apply the ProTable pattern, adapting columns for payment fields.

- [ ] **Step 5: Verify build compiles**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/(authenticated)/finance/ frontend/src/app/(authenticated)/manager/
git commit -m "feat: migrate finance and manager pages to ProTable"
```

---

## Task 14: Migrate Settings Pages to ProTable

**Files:**
- Modify: `frontend/src/app/(authenticated)/settings/clients/page.tsx`
- Modify: `frontend/src/app/(authenticated)/settings/transport/locations/page.tsx`
- Modify: `frontend/src/app/(authenticated)/settings/transport/cargo-types/page.tsx`
- Modify: `frontend/src/app/(authenticated)/settings/transport/vehicle-statuses/page.tsx`
- Modify: `frontend/src/app/(authenticated)/settings/transport/border-posts/page.tsx`
- Modify: `frontend/src/app/(authenticated)/settings/finance/page.tsx`
- Modify: `frontend/src/app/(authenticated)/settings/finance/office-expense-types/page.tsx`
- Modify: `frontend/src/app/(authenticated)/settings/trip-expenses/page.tsx`
- Modify: `frontend/src/app/(authenticated)/settings/company/page.tsx`
- Modify: `frontend/src/app/(authenticated)/settings/users/page.tsx`

- [ ] **Step 1: Migrate Clients page to ProTable**

Apply the ProTable pattern, adapting columns for client fields.

- [ ] **Step 2: Migrate Locations page to ProTable**

Apply the ProTable pattern, adapting columns for location fields.

- [ ] **Step 3: Migrate remaining settings pages to ProTable**

Apply the same pattern for all remaining settings pages.

- [ ] **Step 4: Verify build compiles**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/(authenticated)/settings/
git commit -m "feat: migrate settings pages to ProTable"
```

---

## Task 15: Migrate Dashboard to ProCard

**Files:**
- Modify: `frontend/src/app/(authenticated)/dashboard/page.tsx`
- Modify: `frontend/src/components/dashboard/MetricCard.tsx`
- Modify: `frontend/src/components/dashboard/ProfitTrendChart.tsx`
- Modify: `frontend/src/components/dashboard/IncomeVsExpenseChart.tsx`
- Modify: `frontend/src/components/dashboard/ExpenseDistributionChart.tsx`
- Modify: `frontend/src/components/dashboard/UtilizationChart.tsx`
- Modify: `frontend/src/components/dashboard/RecentTripsTable.tsx`
- Modify: `frontend/src/components/dashboard/QuickActionsWidget.tsx`

- [ ] **Step 1: Migrate MetricCard to use ProCard**

Update MetricCard component to use ProCard instead of custom Card.

- [ ] **Step 2: Migrate chart containers to ProCard**

Update chart wrapper components to use ProCard with built-in loading skeleton.

- [ ] **Step 3: Migrate RecentTripsTable to ProTable**

Update RecentTripsTable to use ProTable.

- [ ] **Step 4: Update Dashboard page layout**

Update dashboard page to use ProCard grid layout.

- [ ] **Step 5: Verify build compiles**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/(authenticated)/dashboard/ frontend/src/components/dashboard/
git commit -m "feat: migrate dashboard to ProCard and ProTable"
```

---

## Task 16: Remove ThemeContext and ThemeToggle

**Files:**
- Delete: `frontend/src/contexts/ThemeContext.tsx`
- Delete: `frontend/src/components/ui/ThemeToggle.tsx`

- [ ] **Step 1: Remove ThemeContext.tsx**

```bash
rm frontend/src/contexts/ThemeContext.tsx
```

- [ ] **Step 2: Remove ThemeToggle.tsx**

```bash
rm frontend/src/components/ui/ThemeToggle.tsx
```

- [ ] **Step 3: Update any remaining imports**

Search for imports of ThemeContext and ThemeToggle and remove them:

```bash
grep -r "ThemeContext\|ThemeToggle\|useThemeMode" frontend/src/ --include="*.tsx" --include="*.ts"
```

Update any files that still import these.

- [ ] **Step 4: Verify build compiles**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove ThemeContext and ThemeToggle (replaced by SettingDrawer)"
```

---

## Task 17: Remove NotificationCenter and themeConfig

**Files:**
- Delete: `frontend/src/components/layout/NotificationCenter.tsx`
- Delete: `frontend/src/theme/themeConfig.ts`

- [ ] **Step 1: Remove NotificationCenter.tsx**

```bash
rm frontend/src/components/layout/NotificationCenter.tsx
```

- [ ] **Step 2: Remove themeConfig.ts**

```bash
rm frontend/src/theme/themeConfig.ts
```

- [ ] **Step 3: Update any remaining imports**

Search for imports and remove them:

```bash
grep -r "NotificationCenter\|themeConfig\|getThemeConfig" frontend/src/ --include="*.tsx" --include="*.ts"
```

Update any files that still import these.

- [ ] **Step 4: Verify build compiles**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove NotificationCenter and themeConfig (final cleanup)"
```

---

## Task 18: Final Verification

- [ ] **Step 1: Run full build**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run tests**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm test
```

Expected: All tests pass (or update tests as needed).

- [ ] **Step 3: Run linter**

```bash
cd /home/clinton/dev/universal-tms/frontend
npm run lint
```

Expected: No errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification and cleanup"
```

---

## Self-Review Checklist

Before marking this plan complete, verify:

- [ ] All spec requirements are covered by a task
- [ ] No placeholders (TBD, TODO, "implement later") in the plan
- [ ] All file paths are exact
- [ ] All code blocks are complete
- [ ] All commands have expected output descriptions
- [ ] Type consistency across tasks (SettingsState → LayoutSettings)
- [ ] Each task produces self-contained, testable changes
- [ ] Commit messages follow conventional commit format
- [ ] References to local ant-design-pro source files are included
- [ ] Uses `createStyles` from `antd-style` (not inline styles) where appropriate
- [ ] AvatarDropdown includes theme settings option
- [ ] Default theme is light mode (not dark)
