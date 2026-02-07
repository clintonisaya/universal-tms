/**
 * Waybill types for Story 2.7: Waybill Management
 */

export type WaybillStatus = "Open" | "In Progress" | "Completed" | "Invoiced";

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
}

export interface WaybillCreate {
  client_name: string;
  description: string;
  cargo_type: string | null;
  weight_kg: number;
  origin: string;
  destination: string;
  expected_loading_date: string;
  agreed_rate: number;
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
}

export interface WaybillsResponse {
  data: Waybill[];
  count: number;
}
