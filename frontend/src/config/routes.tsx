// frontend/src/config/routes.tsx
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
 * Uses `MenuDataItem` with `children` for nesting (not `routes`, which is
 * typed as `undefined` in the current pro-components version).
 * Each route has: path, name, icon, access (permission key), and optional children.
 * ProLayout renders this as top nav (main sections) + sidebar (sub-pages) in mix mode.
 *
 * Note: The `component` field is intentionally omitted. Next.js App Router handles
 * page resolution via file-system routing, so `path` is sufficient for navigation
 * (router.push). See: https://nextjs.org/docs/app/building-your-application/routing
 *
 * Cross-section paths: Some Finance children route to pages outside /finance/
 * (e.g. /manager/payments, /settings/finance). These are grouped under Finance
 * for logical navigation but live at their actual page locations. ProLayout's
 * default path-prefix active-state matching won't highlight these — Task 8
 * should add custom matchMenuKeys logic to handle them.
 */
const routes: MenuDataItem[] = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: <DashboardOutlined />,
    // No access restriction — visible to all authenticated users
  },
  {
    path: "/fleet",
    name: "Fleet",
    icon: <CarOutlined />,
    children: [
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
    children: [
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
    children: [
      { path: "/manager/approvals", name: "Approvals", access: "expenses:approve" },
    ],
  },
  {
    path: "/finance",
    name: "Finance",
    icon: <BankOutlined />,
    children: [
      { path: "/finance/expense-console", name: "Expense Console", access: "expenses:audit-console" },
      // Cross-section: page lives at /manager/payments, grouped here for logical navigation
      { path: "/manager/payments", name: "Payments", access: "expenses:pay" },
      // Cross-section: page lives at /settings/finance, grouped here for logical navigation
      { path: "/settings/finance", name: "Exchange Rates", access: "settings:exchange-rates" },
      { path: "/finance/invoice-verification", name: "Invoice Verification", access: "invoices:verify" },
    ],
  },
  {
    path: "/reports",
    name: "Reports",
    icon: <BarChartOutlined />,
    children: [
      { path: "/reports/profitability", name: "Trip Profitability", access: "reports:view" },
    ],
  },
  {
    path: "/settings",
    name: "Settings",
    icon: <SettingOutlined />,
    children: [
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

export { routes };
export default routes;
