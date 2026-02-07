/**
 * Expense types for Story 2.2: Expense Request Submission
 * Payment fields added for Story 2.4: Finance Payment Processing
 * Currency fields added for Story 2.14: Multi-Currency Support
 * Audit fields added for Story 2.15: Expense Audit Trail
 */

import type { Trip } from "./trip";

export type ExpenseStatus =
  | "Pending Manager"
  | "Pending Finance"
  | "Paid"
  | "Rejected"
  | "Returned";

export type ExpenseCategory =
  | "Fuel"
  | "Allowance"
  | "Maintenance"
  | "Office"
  | "Border"
  | "Other";

export type PaymentMethod = "CASH" | "TRANSFER";

export interface ExpenseMetadata {
  item_details?: string;
  item_name?: string;
  invoice_state?: string;
  application_date?: string;
  payment_method?: string;
  remarks?: string;
  bank_details?: {
    bank_name: string;
    account_name: string;
    account_no: string;
  } | null;
}

export interface UserSummary {
  id: string;
  username: string;
  full_name: string | null;
}

export interface ExpenseRequest {
  id: string;
  expense_number: string | null;
  trip_id: string | null;
  amount: number;
  currency: string;
  exchange_rate: number | null;
  category: ExpenseCategory;
  description: string;
  status: ExpenseStatus;
  manager_comment?: string | null;
  payment_method?: PaymentMethod | null;
  payment_reference?: string | null;
  payment_date?: string | null;
  paid_by_id?: string | null;
  approved_by_id?: string | null;
  approved_at?: string | null;
  expense_metadata?: ExpenseMetadata | null;
  created_by_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ExpenseRequestDetailed extends ExpenseRequest {
  trip: Trip | null;
  created_by: UserSummary | null;
  paid_by: UserSummary | null;
  approved_by: UserSummary | null;
}

export interface ExpenseRequestCreate {
  trip_id?: string | null;
  amount: number;
  category: ExpenseCategory;
  description: string;
  currency?: string;
  exchange_rate?: number | null;
  expense_metadata?: ExpenseMetadata | null;
}

export interface ExpenseRequestUpdate {
  amount?: number;
  category?: ExpenseCategory;
  description?: string;
  status?: ExpenseStatus;
}

export interface ExpensePayment {
  method: PaymentMethod;
  reference?: string | null;
}

export interface ExpenseRequestsResponse {
  data: ExpenseRequestDetailed[];
  count: number;
}
