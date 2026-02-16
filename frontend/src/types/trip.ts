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
  | "Offloaded"
  | "Returned"
  | "Waiting for PODs"
  | "Completed"
  | "Cancelled";

export interface Trip {
  id: string;
  truck_id: string;
  trailer_id: string;
  driver_id: string;
  route_name: string;
  trip_number: string;
  waybill_id: string | null;
  status: TripStatus;
  current_location: string | null;
  pod_documents: string[];
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  dispatch_date: string | null;
  arrival_loading_date: string | null;
  loading_start_date: string | null;
  loading_end_date: string | null;
  arrival_offloading_date: string | null;
  offloading_date: string | null;
  arrival_return_date: string | null;
  trip_duration_days: number | null;
  // Waybill enrichment fields (Story 4.6)
  waybill_rate: number | null;
  waybill_currency: string | null;
  waybill_risk_level: string | null;
  location_update_time: string | null;
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
  dispatch_date?: string | null;
  arrival_loading_date?: string | null;
  loading_start_date?: string | null;
  loading_end_date?: string | null;
  arrival_offloading_date?: string | null;
  offloading_date?: string | null;
  arrival_return_date?: string | null;
}

export interface TripsResponse {
  data: Trip[];
  count: number;
}
