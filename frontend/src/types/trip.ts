/**
 * Trip types for Story 2.1: Trip Creation & Dispatch
 */

import type { Driver } from "./driver";
import type { Trailer } from "./trailer";
import type { Truck } from "./truck";

export type TripStatus =
  | "Waiting"
  | "Dispatched"
  | "Arrived at Loading Point"        // renamed from "Waiting for Loading"
  | "Loading"
  | "Loaded"                          // auto-set when loading_end_date recorded
  | "In Transit"
  | "At Border"
  | "Arrived at Destination"          // manual, fills arrival_offloading_date
  | "Offloading"
  | "Offloaded"                       // auto-set when offloading_date recorded
  | "Returning Empty"                 // renamed from "Returning to Yard" (no return WB)
  // Return leg statuses — only when return_waybill_id is set
  | "Waiting (Return)"                // first return status, waiting for return cargo
  | "Dispatched (Return)"
  | "Arrived at Loading Point (Return)"  // renamed from "Waiting for Loading (Return)"
  | "Loading (Return)"
  | "Loaded (Return)"                 // auto-set when loading_return_end_date recorded
  | "In Transit (Return)"
  | "At Border (Return)"
  | "Arrived at Destination (Return)" // manual, fills arrival_destination_return_date
  | "Offloading (Return)"
  | "Offloaded (Return)"              // auto-set when offloading_return_date recorded
  // End of journey
  | "Arrived at Yard"
  | "Waiting for PODs"
  | "Completed"
  | "Cancelled";

// POD document entry — supports legacy string URLs and new structured format
export type PodDocument =
  | string
  | { name: string; url: string; leg: "go" | "return" };

export interface Trip {
  id: string;
  truck_id: string;
  trailer_id: string;
  driver_id: string;
  route_name: string;
  trip_number: string;
  waybill_id: string | null;
  return_waybill_id: string | null; // Story 2.25: return leg waybill
  status: TripStatus;
  current_location: string | null;
  pod_documents: PodDocument[];
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  // Go leg tracking dates
  dispatch_date: string | null;
  arrival_loading_date: string | null;
  loading_start_date: string | null;
  loading_end_date: string | null;
  arrival_offloading_date: string | null;
  offloading_date: string | null;
  // Return leg tracking dates (Story 2.25)
  dispatch_return_date: string | null;
  arrival_loading_return_date: string | null;
  loading_return_start_date: string | null;
  loading_return_end_date: string | null;
  offloading_return_date: string | null;
  arrival_destination_return_date: string | null;
  arrival_return_date: string | null;
  trip_duration_days: number | null;
  // Waybill enrichment fields (Story 4.6)
  waybill_rate: number | null;
  waybill_currency: string | null;
  waybill_risk_level: string | null;
  return_waybill_rate: number | null;
  return_waybill_currency: string | null;
  waybill_number: string | null;
  return_waybill_number: string | null;
  return_route_name: string | null;
  location_update_time: string | null;
  // Trip-level document attachments
  attachments: string[];
  pods_confirmed_date: string | null;
}

export interface TripDetailed extends Trip {
  truck: Truck | null;
  trailer: Trailer | null;
  driver: Driver | null;
}

export interface TripCreate {
  truck_id: string;
  trailer_id: string;
  driver_id: string;
  route_name: string;
  waybill_id?: string | null;
  current_location?: string | null;
}

export interface TripUpdate {
  truck_id?: string;
  trailer_id?: string;
  driver_id?: string;
  route_name?: string;
  waybill_id?: string | null;
  status?: TripStatus;
  current_location?: string | null;
  pod_documents?: PodDocument[];
  // Go leg tracking dates
  dispatch_date?: string | null;
  arrival_loading_date?: string | null;
  loading_start_date?: string | null;
  loading_end_date?: string | null;
  arrival_offloading_date?: string | null;
  offloading_date?: string | null;
  // Return leg tracking dates (Story 2.25)
  dispatch_return_date?: string | null;
  arrival_loading_return_date?: string | null;
  loading_return_start_date?: string | null;
  loading_return_end_date?: string | null;
  offloading_return_date?: string | null;
  arrival_destination_return_date?: string | null;
  arrival_return_date?: string | null;
  // Trip extra fields
  return_empty_container_date?: string | null;
  remarks?: string | null;
  return_remarks?: string | null;
  pods_confirmed_date?: string | null;
  // Cancellation control flags (Story 2.25)
  cancel_go_waybill?: boolean;
  cancel_return_waybill?: boolean;
}

export interface TripsResponse {
  data: Trip[];
  count: number;
}
