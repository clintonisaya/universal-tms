/**
 * Truck types for Story 1.4: Truck Registry Management
 */

/** Known built-in truck statuses. Backend accepts any string (including custom VehicleStatus values). */
export const TRUCK_STATUSES = ["Idle", "Loading", "In Transit", "At Border", "Offloaded", "Returned", "Waiting for PODs", "Maintenance"] as const;
export type TruckStatus = (typeof TRUCK_STATUSES)[number];

export interface Truck {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  status: string;
  created_at: string | null;
}

export interface TruckCreate {
  plate_number: string;
  make: string;
  model: string;
  status?: string;
}

export interface TruckUpdate {
  plate_number?: string;
  make?: string;
  model?: string;
  status?: string;
}

export interface TrucksResponse {
  data: Truck[];
  count: number;
}
