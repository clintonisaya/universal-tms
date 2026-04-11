import type { ExpenseCategory } from "@/types/expense";

/** Company name used across all expense form headers. */
export const COMPANY_NAME = "NABLAFLEET COMPANY LIMITED";

/** All valid expense categories. */
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Fuel",
  "Allowance",
  "Maintenance",
  "Office",
  "Border",
  "Other",
];

/**
 * Maps Trip Expense Type category labels (from backend) to ExpenseCategory.
 * Shared by AddExpenseModal, EditExpenseModal, and ExpenseReviewModal.
 */
export const CATEGORY_MAPPING: Record<string, ExpenseCategory> = {
  Fuel: "Fuel",
  "Driver Allowance": "Allowance",
  "Cargo Charges": "Border",
  "Transportation Costs-Others": "Other",
  "Toll Gates": "Border",
  "Road Toll": "Border",
  "Port Fee": "Border",
  "Parking Fee": "Other",
  Council: "Border",
  Bond: "Border",
  "Agency Fee": "Border",
  "CNPR Tax": "Border",
  Bonus: "Allowance",
  "Border Expenses": "Border",
  Miscellaneous: "Other",
};

/** Expense approval pipeline step labels for the Steps progress indicator. */
export const EXPENSE_STEPS = [
  "Submitted",
  "Manager Review",
  "Finance Payment",
  "Paid",
];

/** Table column filter options for expense category columns. */
export const CATEGORY_FILTERS = EXPENSE_CATEGORIES.map((c) => ({
  text: c,
  value: c,
}));

/** Select dropdown options for expense category (label/value format for Ant Design Select). */
export const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({
  label: c,
  value: c,
}));

/** All expense status values (excluding Breakdown which is a trip status). */
export const EXPENSE_STATUSES = [
  "Pending Manager",
  "Pending Finance",
  "Paid",
  "Rejected",
  "Returned",
  "Voided",
] as const;

/** Table column filter options for expense status columns. */
export const EXPENSE_STATUS_FILTERS: { text: string; value: string }[] =
  EXPENSE_STATUSES.map((s) => ({ text: s, value: s }));

/** Select dropdown options for expense status (label/value format for Ant Design Select). */
export const STATUS_OPTIONS = EXPENSE_STATUSES.map((s) => ({
  label: s,
  value: s,
}));
