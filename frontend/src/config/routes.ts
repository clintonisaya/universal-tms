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
