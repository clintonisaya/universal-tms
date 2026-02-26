/**
 * Trip types for Story 2.1: Trip Creation & Dispatch
 */

import type { Driver } from "./driver";
import type { Trailer } from "./trailer";
import type { Truck } from "./truck";

export type TripStatus =
  | "Waiting"
  | "Dispatch"
  | "Wait to Load"
  | "Loading"
  | "In Transit"
  | "At Border"
  | "Offloading"
  // Return leg statuses (Story 2.25) — only when return_waybill_id is set
  | "Dispatch (Return)"
  | "Wait to Load (Return)"
  | "Loading (Return)"
  | "In Transit (Return)"
  | "At Border (Return)"
  | "Offloading (Return)"
  // End of journey
  | "Returned"
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
  arrival_return_date: string | null;
  trip_duration_days: number | null;
  // Waybill enrichment fields (Story 4.6)
  waybill_rate: number | null;
  waybill_currency: string | null;
  waybill_risk_level: string | null;
  waybill_number: string | null;
  return_waybill_number: string | null;
  return_route_name: string | null;
  location_update_time: string | null;
  // Trip-level document attachments
  attachments: string[];
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
  arrival_return_date?: string | null;
  // Trip extra fields
  return_empty_container_date?: string | null;
  remarks?: string | null;
  // Cancellation control flags (Story 2.25)
  cancel_go_waybill?: boolean;
  cancel_return_waybill?: boolean;
}

export interface TripsResponse {
  data: Trip[];
  count: number;
}
