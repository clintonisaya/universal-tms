/**
 * Truck types for Story 1.4: Truck Registry Management
 */

export type TruckStatus = "Idle" | "Loading" | "In Transit" | "At Border" | "Offloaded" | "Returned" | "Waiting for PODs" | "Maintenance";

export interface Truck {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  status: TruckStatus;
  created_at: string | null;
}

export interface TruckCreate {
  plate_number: string;
  make: string;
  model: string;
  status?: TruckStatus;
}

export interface TruckUpdate {
  plate_number?: string;
  make?: string;
  model?: string;
  status?: TruckStatus;
}

export interface TrucksResponse {
  data: Truck[];
  count: number;
}
