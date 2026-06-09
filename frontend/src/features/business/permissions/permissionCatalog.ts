export const PERMISSION = {
  FLEET_VIEW: "fleet:view",
  FLEET_CREATE: "fleet:create",
  FLEET_EDIT: "fleet:edit",
  FLEET_MAINTENANCE_EDIT: "fleet:maintenance-edit",
  FLEET_MAINTENANCE_DELETE: "fleet:maintenance-delete",
  WAYBILLS_VIEW: "waybills:view",
  WAYBILLS_CREATE: "waybills:create",
  WAYBILLS_EDIT: "waybills:edit",
  WAYBILLS_DELETE: "waybills:delete",
  WAYBILLS_UNLOCK: "waybills:unlock",
  WAYBILLS_VIEW_RATE: "waybills:view-rate",
  TRIPS_VIEW: "trips:view",
  TRIPS_CREATE: "trips:create",
  TRIPS_EDIT: "trips:edit",
  TRIPS_DELETE: "trips:delete",
  TRIPS_REOPEN: "trips:reopen",
  TRIPS_VIEW_FINANCIALS: "trips:view-financials",
  TRACKING_VIEW: "tracking:view",
  INVOICES_VIEW: "invoices:view",
  INVOICES_CREATE: "invoices:create",
  INVOICES_EDIT: "invoices:edit",
  INVOICES_ISSUE: "invoices:issue",
  EXPENSES_VIEW: "expenses:view",
  EXPENSES_CREATE: "expenses:create",
  OFFICE_EXPENSES_VIEW: "office-expenses:view",
  OFFICE_EXPENSES_CREATE: "office-expenses:create",
  EXPENSES_APPROVE: "expenses:approve",
  INVOICES_VOID: "invoices:void",
  INVOICES_REISSUE: "invoices:reissue",
  EXPENSES_PAY: "expenses:pay",
  SETTINGS_EXCHANGE_RATES: "settings:exchange-rates",
  EXPENSES_AUDIT_CONSOLE: "expenses:audit-console",
  EXPENSES_VOID: "expenses:void",
  EXPENSES_AMEND_ATTACHMENT: "expenses:amend-attachment",
  INVOICES_POP_MANAGE: "invoices:pop-manage",
  INVOICES_VERIFY: "invoices:verify",
  INVOICES_PAYMENT: "invoices:payment",
  REPORTS_VIEW: "reports:view",
  SETTINGS_CLIENTS: "settings:clients",
  SETTINGS_OFFICE_EXPENSE_TYPES: "settings:office-expense-types",
  SETTINGS_TRIP_EXPENSE_TYPES: "settings:trip-expense-types",
  SETTINGS_LOCATIONS: "settings:locations",
  SETTINGS_CARGO_TYPES: "settings:cargo-types",
  SETTINGS_VEHICLE_STATUSES: "settings:vehicle-statuses",
  SETTINGS_BORDER_POSTS: "settings:border-posts",
  SETTINGS_COMPANY: "settings:company",
  USERS_MANAGE: "users:manage",
} as const;

export type PermissionValue = (typeof PERMISSION)[keyof typeof PERMISSION];

export interface PermissionDefinition {
  label: string;
  value: PermissionValue;
  group: string;
}

export const AVAILABLE_PERMISSIONS = [
  { label: "View Fleet", value: PERMISSION.FLEET_VIEW, group: "Fleet" },
  { label: "Create Fleet", value: PERMISSION.FLEET_CREATE, group: "Fleet" },
  { label: "Edit Fleet", value: PERMISSION.FLEET_EDIT, group: "Fleet" },
  { label: "Edit Maintenance", value: PERMISSION.FLEET_MAINTENANCE_EDIT, group: "Fleet" },
  { label: "Delete Maintenance", value: PERMISSION.FLEET_MAINTENANCE_DELETE, group: "Fleet" },
  { label: "View Waybills", value: PERMISSION.WAYBILLS_VIEW, group: "Operations" },
  { label: "Create Waybills", value: PERMISSION.WAYBILLS_CREATE, group: "Operations" },
  { label: "Edit Waybills", value: PERMISSION.WAYBILLS_EDIT, group: "Operations" },
  { label: "Delete Waybills", value: PERMISSION.WAYBILLS_DELETE, group: "Operations" },
  { label: "Unlock Waybills", value: PERMISSION.WAYBILLS_UNLOCK, group: "Operations" },
  { label: "View Waybill Rates", value: PERMISSION.WAYBILLS_VIEW_RATE, group: "Operations" },
  { label: "View Trips", value: PERMISSION.TRIPS_VIEW, group: "Operations" },
  { label: "Create Trips", value: PERMISSION.TRIPS_CREATE, group: "Operations" },
  { label: "Edit Trips", value: PERMISSION.TRIPS_EDIT, group: "Operations" },
  { label: "Delete Trips", value: PERMISSION.TRIPS_DELETE, group: "Operations" },
  { label: "Reopen Trips", value: PERMISSION.TRIPS_REOPEN, group: "Operations" },
  { label: "View Trip Financials", value: PERMISSION.TRIPS_VIEW_FINANCIALS, group: "Operations" },
  { label: "View Tracking", value: PERMISSION.TRACKING_VIEW, group: "Operations" },
  { label: "View Invoices", value: PERMISSION.INVOICES_VIEW, group: "Operations" },
  { label: "Create Invoices", value: PERMISSION.INVOICES_CREATE, group: "Operations" },
  { label: "Edit Invoices", value: PERMISSION.INVOICES_EDIT, group: "Operations" },
  { label: "Issue Invoices", value: PERMISSION.INVOICES_ISSUE, group: "Operations" },
  { label: "View Expenses", value: PERMISSION.EXPENSES_VIEW, group: "Expenses" },
  { label: "Create Expenses", value: PERMISSION.EXPENSES_CREATE, group: "Expenses" },
  { label: "View Office Expenses", value: PERMISSION.OFFICE_EXPENSES_VIEW, group: "Expenses" },
  { label: "Create Office Expenses", value: PERMISSION.OFFICE_EXPENSES_CREATE, group: "Expenses" },
  { label: "Approve Expenses", value: PERMISSION.EXPENSES_APPROVE, group: "Manager" },
  { label: "Void Invoices", value: PERMISSION.INVOICES_VOID, group: "Manager" },
  { label: "Reissue Invoices", value: PERMISSION.INVOICES_REISSUE, group: "Manager" },
  { label: "Pay Expenses", value: PERMISSION.EXPENSES_PAY, group: "Finance" },
  { label: "Exchange Rates", value: PERMISSION.SETTINGS_EXCHANGE_RATES, group: "Finance" },
  { label: "Expense Console Access", value: PERMISSION.EXPENSES_AUDIT_CONSOLE, group: "Finance" },
  { label: "Void Expenses", value: PERMISSION.EXPENSES_VOID, group: "Finance" },
  { label: "Amend Attachments", value: PERMISSION.EXPENSES_AMEND_ATTACHMENT, group: "Finance" },
  { label: "Manage POP Attachments", value: PERMISSION.INVOICES_POP_MANAGE, group: "Finance" },
  { label: "Verify Invoices", value: PERMISSION.INVOICES_VERIFY, group: "Finance" },
  { label: "Record Invoice Payments", value: PERMISSION.INVOICES_PAYMENT, group: "Finance" },
  { label: "View Reports", value: PERMISSION.REPORTS_VIEW, group: "Reports" },
  { label: "Clients", value: PERMISSION.SETTINGS_CLIENTS, group: "Settings" },
  { label: "Office Expense Types", value: PERMISSION.SETTINGS_OFFICE_EXPENSE_TYPES, group: "Settings" },
  { label: "Trip Expense Types", value: PERMISSION.SETTINGS_TRIP_EXPENSE_TYPES, group: "Settings" },
  { label: "Locations", value: PERMISSION.SETTINGS_LOCATIONS, group: "Settings" },
  { label: "Cargo Types", value: PERMISSION.SETTINGS_CARGO_TYPES, group: "Settings" },
  { label: "Vehicle Statuses", value: PERMISSION.SETTINGS_VEHICLE_STATUSES, group: "Settings" },
  { label: "Border Posts", value: PERMISSION.SETTINGS_BORDER_POSTS, group: "Settings" },
  { label: "Company Settings", value: PERMISSION.SETTINGS_COMPANY, group: "Settings" },
  { label: "Manage Users", value: PERMISSION.USERS_MANAGE, group: "Admin" },
] as const satisfies readonly PermissionDefinition[];

export const ALL_PERMISSIONS = AVAILABLE_PERMISSIONS.map((permission) => permission.value);

const uniquePermissions = (permissions: PermissionValue[]) => [...new Set(permissions)];

const groupPerms = (group: string) =>
  AVAILABLE_PERMISSIONS.filter((permission) => permission.group === group).map(
    (permission) => permission.value,
  );

export const ROLE_PERMISSION_PRESETS: Record<string, PermissionValue[]> = {
  ops: uniquePermissions([
    ...groupPerms("Fleet"),
    ...groupPerms("Operations"),
    PERMISSION.INVOICES_VIEW,
    PERMISSION.INVOICES_CREATE,
    PERMISSION.INVOICES_EDIT,
    PERMISSION.INVOICES_ISSUE,
  ]),
  finance: uniquePermissions([
    ...groupPerms("Expenses"),
    ...groupPerms("Finance"),
    PERMISSION.INVOICES_VIEW,
    PERMISSION.REPORTS_VIEW,
    PERMISSION.SETTINGS_COMPANY,
    PERMISSION.SETTINGS_OFFICE_EXPENSE_TYPES,
    PERMISSION.SETTINGS_TRIP_EXPENSE_TYPES,
  ]),
  manager: ALL_PERMISSIONS.filter((permission) => permission !== PERMISSION.USERS_MANAGE),
  admin: [...ALL_PERMISSIONS],
};

export const FULL_ACCESS_ROLES = ["admin"] as const;

export function hasFullAccessRole(role: string): boolean {
  return (FULL_ACCESS_ROLES as readonly string[]).includes(role);
}
