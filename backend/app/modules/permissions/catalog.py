from dataclasses import dataclass
from typing import Protocol

from app.models import UserRole


@dataclass(frozen=True)
class PermissionDefinition:
    label: str
    value: str
    group: str


class Permission:
    FLEET_VIEW = "fleet:view"
    FLEET_CREATE = "fleet:create"
    FLEET_EDIT = "fleet:edit"
    FLEET_MAINTENANCE_EDIT = "fleet:maintenance-edit"
    FLEET_MAINTENANCE_DELETE = "fleet:maintenance-delete"
    WAYBILLS_VIEW = "waybills:view"
    WAYBILLS_CREATE = "waybills:create"
    WAYBILLS_EDIT = "waybills:edit"
    WAYBILLS_DELETE = "waybills:delete"
    WAYBILLS_UNLOCK = "waybills:unlock"
    WAYBILLS_VIEW_RATE = "waybills:view-rate"
    TRIPS_VIEW = "trips:view"
    TRIPS_CREATE = "trips:create"
    TRIPS_EDIT = "trips:edit"
    TRIPS_DELETE = "trips:delete"
    TRIPS_REOPEN = "trips:reopen"
    TRIPS_VIEW_FINANCIALS = "trips:view-financials"
    TRACKING_VIEW = "tracking:view"
    INVOICES_VIEW = "invoices:view"
    INVOICES_CREATE = "invoices:create"
    INVOICES_EDIT = "invoices:edit"
    INVOICES_ISSUE = "invoices:issue"
    EXPENSES_VIEW = "expenses:view"
    EXPENSES_CREATE = "expenses:create"
    OFFICE_EXPENSES_VIEW = "office-expenses:view"
    OFFICE_EXPENSES_CREATE = "office-expenses:create"
    EXPENSES_APPROVE = "expenses:approve"
    INVOICES_VOID = "invoices:void"
    INVOICES_REISSUE = "invoices:reissue"
    EXPENSES_PAY = "expenses:pay"
    SETTINGS_EXCHANGE_RATES = "settings:exchange-rates"
    EXPENSES_AUDIT_CONSOLE = "expenses:audit-console"
    EXPENSES_VOID = "expenses:void"
    EXPENSES_AMEND_ATTACHMENT = "expenses:amend-attachment"
    INVOICES_POP_MANAGE = "invoices:pop-manage"
    INVOICES_VERIFY = "invoices:verify"
    INVOICES_PAYMENT = "invoices:payment"
    REPORTS_VIEW = "reports:view"
    SETTINGS_CLIENTS = "settings:clients"
    SETTINGS_OFFICE_EXPENSE_TYPES = "settings:office-expense-types"
    SETTINGS_TRIP_EXPENSE_TYPES = "settings:trip-expense-types"
    SETTINGS_LOCATIONS = "settings:locations"
    SETTINGS_CARGO_TYPES = "settings:cargo-types"
    SETTINGS_VEHICLE_STATUSES = "settings:vehicle-statuses"
    SETTINGS_BORDER_POSTS = "settings:border-posts"
    SETTINGS_COMPANY = "settings:company"
    USERS_MANAGE = "users:manage"


AVAILABLE_PERMISSIONS: tuple[PermissionDefinition, ...] = (
    PermissionDefinition("View Fleet", Permission.FLEET_VIEW, "Fleet"),
    PermissionDefinition("Create Fleet", Permission.FLEET_CREATE, "Fleet"),
    PermissionDefinition("Edit Fleet", Permission.FLEET_EDIT, "Fleet"),
    PermissionDefinition("Edit Maintenance", Permission.FLEET_MAINTENANCE_EDIT, "Fleet"),
    PermissionDefinition("Delete Maintenance", Permission.FLEET_MAINTENANCE_DELETE, "Fleet"),
    PermissionDefinition("View Waybills", Permission.WAYBILLS_VIEW, "Operations"),
    PermissionDefinition("Create Waybills", Permission.WAYBILLS_CREATE, "Operations"),
    PermissionDefinition("Edit Waybills", Permission.WAYBILLS_EDIT, "Operations"),
    PermissionDefinition("Delete Waybills", Permission.WAYBILLS_DELETE, "Operations"),
    PermissionDefinition("Unlock Waybills", Permission.WAYBILLS_UNLOCK, "Operations"),
    PermissionDefinition("View Waybill Rates", Permission.WAYBILLS_VIEW_RATE, "Operations"),
    PermissionDefinition("View Trips", Permission.TRIPS_VIEW, "Operations"),
    PermissionDefinition("Create Trips", Permission.TRIPS_CREATE, "Operations"),
    PermissionDefinition("Edit Trips", Permission.TRIPS_EDIT, "Operations"),
    PermissionDefinition("Delete Trips", Permission.TRIPS_DELETE, "Operations"),
    PermissionDefinition("Reopen Trips", Permission.TRIPS_REOPEN, "Operations"),
    PermissionDefinition("View Trip Financials", Permission.TRIPS_VIEW_FINANCIALS, "Operations"),
    PermissionDefinition("View Tracking", Permission.TRACKING_VIEW, "Operations"),
    PermissionDefinition("View Invoices", Permission.INVOICES_VIEW, "Operations"),
    PermissionDefinition("Create Invoices", Permission.INVOICES_CREATE, "Operations"),
    PermissionDefinition("Edit Invoices", Permission.INVOICES_EDIT, "Operations"),
    PermissionDefinition("Issue Invoices", Permission.INVOICES_ISSUE, "Operations"),
    PermissionDefinition("View Expenses", Permission.EXPENSES_VIEW, "Expenses"),
    PermissionDefinition("Create Expenses", Permission.EXPENSES_CREATE, "Expenses"),
    PermissionDefinition("View Office Expenses", Permission.OFFICE_EXPENSES_VIEW, "Expenses"),
    PermissionDefinition("Create Office Expenses", Permission.OFFICE_EXPENSES_CREATE, "Expenses"),
    PermissionDefinition("Approve Expenses", Permission.EXPENSES_APPROVE, "Manager"),
    PermissionDefinition("Void Invoices", Permission.INVOICES_VOID, "Manager"),
    PermissionDefinition("Reissue Invoices", Permission.INVOICES_REISSUE, "Manager"),
    PermissionDefinition("Pay Expenses", Permission.EXPENSES_PAY, "Finance"),
    PermissionDefinition("Exchange Rates", Permission.SETTINGS_EXCHANGE_RATES, "Finance"),
    PermissionDefinition("Expense Console Access", Permission.EXPENSES_AUDIT_CONSOLE, "Finance"),
    PermissionDefinition("Void Expenses", Permission.EXPENSES_VOID, "Finance"),
    PermissionDefinition("Amend Attachments", Permission.EXPENSES_AMEND_ATTACHMENT, "Finance"),
    PermissionDefinition("Manage POP Attachments", Permission.INVOICES_POP_MANAGE, "Finance"),
    PermissionDefinition("Verify Invoices", Permission.INVOICES_VERIFY, "Finance"),
    PermissionDefinition("Record Invoice Payments", Permission.INVOICES_PAYMENT, "Finance"),
    PermissionDefinition("View Reports", Permission.REPORTS_VIEW, "Reports"),
    PermissionDefinition("Clients", Permission.SETTINGS_CLIENTS, "Settings"),
    PermissionDefinition("Office Expense Types", Permission.SETTINGS_OFFICE_EXPENSE_TYPES, "Settings"),
    PermissionDefinition("Trip Expense Types", Permission.SETTINGS_TRIP_EXPENSE_TYPES, "Settings"),
    PermissionDefinition("Locations", Permission.SETTINGS_LOCATIONS, "Settings"),
    PermissionDefinition("Cargo Types", Permission.SETTINGS_CARGO_TYPES, "Settings"),
    PermissionDefinition("Vehicle Statuses", Permission.SETTINGS_VEHICLE_STATUSES, "Settings"),
    PermissionDefinition("Border Posts", Permission.SETTINGS_BORDER_POSTS, "Settings"),
    PermissionDefinition("Company Settings", Permission.SETTINGS_COMPANY, "Settings"),
    PermissionDefinition("Manage Users", Permission.USERS_MANAGE, "Admin"),
)

ALL_PERMISSIONS: tuple[str, ...] = tuple(
    permission.value for permission in AVAILABLE_PERMISSIONS
)
FULL_ACCESS_ROLES: frozenset[UserRole] = frozenset({UserRole.admin})


def _unique_permissions(permissions: list[str]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(permissions))


def permissions_for_group(group: str) -> tuple[str, ...]:
    return tuple(
        permission.value
        for permission in AVAILABLE_PERMISSIONS
        if permission.group == group
    )


ROLE_PERMISSION_PRESETS: dict[UserRole, tuple[str, ...]] = {
    UserRole.ops: _unique_permissions(
        [
            *permissions_for_group("Fleet"),
            *permissions_for_group("Operations"),
            Permission.INVOICES_VIEW,
            Permission.INVOICES_CREATE,
            Permission.INVOICES_EDIT,
            Permission.INVOICES_ISSUE,
        ]
    ),
    UserRole.finance: _unique_permissions(
        [
            *permissions_for_group("Expenses"),
            *permissions_for_group("Finance"),
            Permission.INVOICES_VIEW,
            Permission.REPORTS_VIEW,
            Permission.SETTINGS_COMPANY,
            Permission.SETTINGS_OFFICE_EXPENSE_TYPES,
            Permission.SETTINGS_TRIP_EXPENSE_TYPES,
        ]
    ),
    UserRole.manager: tuple(
        permission for permission in ALL_PERMISSIONS if permission != Permission.USERS_MANAGE
    ),
    UserRole.admin: ALL_PERMISSIONS,
}


class PermissionedUser(Protocol):
    is_superuser: bool
    role: UserRole
    permissions: list[str] | None


def role_permission_preset(role: UserRole | str) -> tuple[str, ...]:
    if isinstance(role, str):
        try:
            role = UserRole(role)
        except ValueError:
            return ()
    return ROLE_PERMISSION_PRESETS.get(role, ())


def has_full_access(user: PermissionedUser) -> bool:
    return user.is_superuser or user.role in FULL_ACCESS_ROLES


def has_permission(user: PermissionedUser, permission: str) -> bool:
    if has_full_access(user):
        return True
    return permission in (user.permissions or [])


def has_any_permission(user: PermissionedUser, *permissions: str) -> bool:
    if has_full_access(user):
        return True
    user_permissions = user.permissions or []
    return any(permission in user_permissions for permission in permissions)
