/**
 * Trip types for Story 2.1: Trip Creation & Dispatch
 */

import type { Driver } from "./driver";
import type { Trailer } from "./trailer";
import type { Truck } from "./truck";

export type TripStatus =
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
}

export interface TripsResponse {
  data: Trip[];
  count: number;
}
