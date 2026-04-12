/**
 * Shared navigation constants — single source of truth for section resolution.
 * Used by DashboardLayout (page titles) and TabContext (tab management).
 */

export interface SectionDefinition {
  key: string;       // stable section identifier (e.g. "fleet-trucks")
  label: string;     // display name (e.g. "Trucks")
  path: string;      // section root path (e.g. "/fleet/trucks")
}

/**
 * All navigable sections, ordered longest-path-first for matching.
 * Each entry maps a route path to its section identity.
 */
export const SECTION_MAP: SectionDefinition[] = [
  // Dashboard
  { key: "dashboard", label: "Dashboard", path: "/dashboard" },

  // Fleet
  { key: "fleet-trucks", label: "Trucks", path: "/fleet/trucks" },
  { key: "fleet-trailers", label: "Trailers", path: "/fleet/trailers" },
  { key: "fleet-drivers", label: "Drivers", path: "/fleet/drivers" },
  { key: "fleet-maintenance", label: "Maintenance", path: "/fleet/maintenance" },

  // Operations
  { key: "ops-tracking", label: "Tracking", path: "/ops/tracking" },
  { key: "ops-waybills", label: "Waybills", path: "/ops/waybills" },
  { key: "ops-trips", label: "Trips", path: "/ops/trips" },
  { key: "ops-expenses", label: "Expenses", path: "/ops/expenses" },

  // Office Expenses
  { key: "office-expenses", label: "Office Expenses", path: "/office-expenses" },

  // Manager
  { key: "manager-approvals", label: "Approvals", path: "/manager/approvals" },
  { key: "manager-payments", label: "Payments", path: "/manager/payments" },

  // Finance
  { key: "finance-expense-console", label: "Expense Console", path: "/finance/expense-console" },
  { key: "finance-invoice-verification", label: "Invoice Verification", path: "/finance/invoice-verification" },

  // Reports
  { key: "reports-profitability", label: "Trip Profitability", path: "/reports/profitability" },

  // Settings
  { key: "settings-clients", label: "Clients", path: "/settings/clients" },
  { key: "settings-finance", label: "Exchange Rates", path: "/settings/finance" },
  { key: "settings-finance-office-expense-types", label: "Office Expense Types", path: "/settings/finance/office-expense-types" },
  { key: "settings-trip-expenses", label: "Trip Expense Types", path: "/settings/trip-expenses" },
  { key: "settings-locations", label: "Locations", path: "/settings/transport/locations" },
  { key: "settings-cargo-types", label: "Cargo Types", path: "/settings/transport/cargo-types" },
  { key: "settings-vehicle-statuses", label: "Vehicle Statuses", path: "/settings/transport/vehicle-statuses" },
  { key: "settings-border-posts", label: "Border Posts", path: "/settings/transport/border-posts" },
  { key: "settings-users", label: "Users", path: "/settings/users" },
  { key: "settings-company", label: "Company", path: "/settings/company" },
];

/**
 * Resolve any pathname to its matching section definition.
 * Uses longest-match-first: "/fleet/trucks/abc123" matches "Trucks" not "Dashboard".
 * Returns undefined for unrecognized paths (e.g. /login).
 */
export function resolveSection(pathname: string): SectionDefinition | undefined {
  // Exact match first
  const exact = SECTION_MAP.find((s) => s.path === pathname);
  if (exact) return exact;

  // Longest-prefix match for sub-routes
  const matches = SECTION_MAP.filter((s) => pathname.startsWith(s.path + "/"));
  if (matches.length === 0) return undefined;

  // Sort by path length descending — longest match wins
  matches.sort((a, b) => b.path.length - a.path.length);
  return matches[0];
}
