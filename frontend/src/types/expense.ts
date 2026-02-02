/**
 * Expense types for Story 2.2: Expense Request Submission
 * Payment fields added for Story 2.4: Finance Payment Processing
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

export interface ExpenseRequest {
  id: string;
  trip_id: string | null;
  amount: number;
  category: ExpenseCategory;
  description: string;
  status: ExpenseStatus;
  manager_comment?: string | null;
  payment_method?: PaymentMethod | null;
  payment_reference?: string | null;
  payment_date?: string | null;
  paid_by_id?: string | null;
  created_by_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ExpenseRequestDetailed extends ExpenseRequest {
  trip: Trip | null;
  created_by: {
    id: string;
    username: string;
    full_name: string | null;
  } | null;
}

export interface ExpenseRequestCreate {
  trip_id?: string | null;
  amount: number;
  category: ExpenseCategory;
  description: string;
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
  data: ExpenseRequest[];
  count: number;
}
