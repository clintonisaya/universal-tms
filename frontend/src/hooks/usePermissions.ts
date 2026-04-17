import { useAuth } from "@/contexts/AuthContext";

/**
 * All available permissions in the system.
 * Used by the sidebar filter and the user management page.
 */
export const AVAILABLE_PERMISSIONS = [
  // Fleet
  { label: "View Fleet", value: "fleet:view", group: "Fleet" },
  { label: "Create Fleet", value: "fleet:create", group: "Fleet" },
  { label: "Edit Fleet", value: "fleet:edit", group: "Fleet" },
  { label: "Edit Maintenance", value: "fleet:maintenance-edit", group: "Fleet" },
  { label: "Delete Maintenance", value: "fleet:maintenance-delete", group: "Fleet" },
  // Operations – Waybills
  { label: "View Waybills", value: "waybills:view", group: "Operations" },
  { label: "Create Waybills", value: "waybills:create", group: "Operations" },
  { label: "Edit Waybills", value: "waybills:edit", group: "Operations" },
  { label: "Delete Waybills", value: "waybills:delete", group: "Operations" },
  { label: "Unlock Waybills", value: "waybills:unlock", group: "Operations" },
  { label: "View Waybill Rates", value: "waybills:view-rate", group: "Operations" },
  // Operations – Trips
  { label: "View Trips", value: "trips:view", group: "Operations" },
  { label: "Create Trips", value: "trips:create", group: "Operations" },
  { label: "Edit Trips", value: "trips:edit", group: "Operations" },
  { label: "Delete Trips", value: "trips:delete", group: "Operations" },
  { label: "Reopen Trips", value: "trips:reopen", group: "Operations" },
  { label: "View Trip Financials", value: "trips:view-financials", group: "Operations" },
  // Operations – Tracking
  { label: "View Tracking", value: "tracking:view", group: "Operations" },
  // Operations – Invoices
  { label: "View Invoices", value: "invoices:view", group: "Operations" },
  { label: "Create Invoices", value: "invoices:create", group: "Operations" },
  { label: "Edit Invoices", value: "invoices:edit", group: "Operations" },
  { label: "Issue Invoices", value: "invoices:issue", group: "Operations" },
  // Expenses
  { label: "View Expenses", value: "expenses:view", group: "Expenses" },
  { label: "Create Expenses", value: "expenses:create", group: "Expenses" },
  // Office Expenses
  { label: "View Office Expenses", value: "office-expenses:view", group: "Expenses" },
  { label: "Create Office Expenses", value: "office-expenses:create", group: "Expenses" },
  // Manager
  { label: "Approve Expenses", value: "expenses:approve", group: "Manager" },
  { label: "Void Invoices", value: "invoices:void", group: "Manager" },
  { label: "Reissue Invoices", value: "invoices:reissue", group: "Manager" },
  // Finance
  { label: "Pay Expenses", value: "expenses:pay", group: "Finance" },
  { label: "Exchange Rates", value: "settings:exchange-rates", group: "Finance" },
  { label: "Expense Console Access", value: "expenses:audit-console", group: "Finance" },
  { label: "Void Expenses", value: "expenses:void", group: "Finance" },
  { label: "Amend Attachments", value: "expenses:amend-attachment", group: "Finance" },
  { label: "Manage POP Attachments", value: "invoices:pop-manage", group: "Finance" },
  { label: "Verify Invoices", value: "invoices:verify", group: "Finance" },
  { label: "Record Invoice Payments", value: "invoices:payment", group: "Finance" },
  // Reports
  { label: "View Reports", value: "reports:view", group: "Reports" },
  // Settings – granular per feature
  { label: "Clients", value: "settings:clients", group: "Settings" },
  { label: "Office Expense Types", value: "settings:office-expense-types", group: "Settings" },
  { label: "Trip Expense Types", value: "settings:trip-expense-types", group: "Settings" },
  { label: "Locations", value: "settings:locations", group: "Settings" },
  { label: "Cargo Types", value: "settings:cargo-types", group: "Settings" },
  { label: "Vehicle Statuses", value: "settings:vehicle-statuses", group: "Settings" },
  { label: "Border Posts", value: "settings:border-posts", group: "Settings" },
  { label: "Company Settings", value: "settings:company", group: "Settings" },
  // Admin
  { label: "Manage Users", value: "users:manage", group: "Admin" },
] as const;

/** Helper: all permission values */
const ALL_PERMS = AVAILABLE_PERMISSIONS.map((p) => p.value);

/** Helper: values for a given group */
const groupPerms = (group: string) =>
  AVAILABLE_PERMISSIONS.filter((p) => p.group === group).map((p) => p.value);

/**
 * Default permission presets per role.
 * Admin bypasses checks so no preset needed.
 */
export const ROLE_PERMISSION_PRESETS: Record<string, string[]> = {
  ops: [
    ...groupPerms("Fleet"),
    ...groupPerms("Operations"),
    "invoices:view",
    "invoices:create",
    "invoices:edit",
    "invoices:issue",
  ],
  finance: [
    ...groupPerms("Expenses"),
    ...groupPerms("Finance"),
    "invoices:view",
    "reports:view",
    "settings:company",
    "settings:office-expense-types",
    "settings:trip-expense-types",
  ],
  manager: ALL_PERMS.filter((p) => p !== "users:manage") as string[],
  admin: [...ALL_PERMS] as string[],
};

/** Full-access roles that bypass permission checks */
const FULL_ACCESS_ROLES = ["admin"];

/**
 * Hook for checking user permissions.
 * Admin role and superusers bypass all checks.
 */
export function usePermissions() {
  const { user } = useAuth();

  const hasFullAccess =
    !!user &&
    (user.is_superuser || FULL_ACCESS_ROLES.includes(user.role));

  /** Check if user has a specific permission */
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (hasFullAccess) return true;
    return (user.permissions ?? []).includes(permission);
  };

  /** Check if user has ANY of the given permissions */
  const hasAnyPermission = (...permissions: string[]): boolean => {
    if (!user) return false;
    if (hasFullAccess) return true;
    return permissions.some((p) => (user.permissions ?? []).includes(p));
  };

  return { hasPermission, hasAnyPermission, hasFullAccess };
}
