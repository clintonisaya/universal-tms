/**
 * Waybill types for Story 2.7: Waybill Management
 */

import type { UserSummary } from "./expense";

export type WaybillStatus = "Open" | "In Progress" | "Completed" | "Invoiced";
export type WaybillProgressStatus = Exclude<WaybillStatus, "Invoiced">;

export function getWaybillProgressStatus(status: WaybillStatus): WaybillProgressStatus {
  return status === "Invoiced" ? "Completed" : status;
}

export interface Waybill {
  id: string;
  waybill_number: string;
  client_name: string;
  description: string;
  cargo_type: string | null;
  weight_kg: number;
  origin: string;
  destination: string;
  expected_loading_date: string;
  status: WaybillStatus;
  agreed_rate: number;
  currency: string;
  risk_level: string;
  created_at: string | null;
  // Audit trail (Story 6.13)
  created_by_id: string | null;
  updated_by_id: string | null;
  created_by: UserSummary | null;
  updated_by: UserSummary | null;
  // Invoice enrichment
  invoice_id?: string | null;
  invoice_number?: string | null;
  invoice_status?: string | null;
  // Trip enrichment
  trip_number?: string | null;
}

export interface WaybillCreate {
  client_name: string;
  description: string;
  cargo_type: string | null;
  weight_kg: number;
  origin: string;
  destination: string;
  expected_loading_date: string;
  currency: string;
  risk_level: string;
}

export interface WaybillUpdate {
  client_name?: string;
  description?: string;
  cargo_type?: string | null;
  weight_kg?: number;
  origin?: string;
  destination?: string;
  expected_loading_date?: string;
  status?: WaybillStatus;
  agreed_rate?: number;
  currency?: string;
  risk_level?: string;
  border_ids?: string[] | null;
}

export interface WaybillsResponse {
  data: Waybill[];
  count: number;
}
