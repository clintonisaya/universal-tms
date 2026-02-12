/**
 * Trailer types for Story 1.6: Trailer Registry Management
 */

/** Known built-in trailer statuses. Backend accepts any string (including custom VehicleStatus values). */
export const TRAILER_STATUSES = ["Idle", "Loading", "In Transit", "At Border", "Offloaded", "Returned", "Waiting for PODs", "Maintenance"] as const;
export type TrailerStatus = (typeof TRAILER_STATUSES)[number];
export type TrailerType = "Flatbed" | "Skeleton" | "Box" | "Tanker" | "Lowbed";

export interface Trailer {
  id: string;
  plate_number: string;
  type: TrailerType;
  make: string;
  status: string;
  created_at: string | null;
}

export interface TrailerCreate {
  plate_number: string;
  type: TrailerType;
  make: string;
  status?: string;
}

export interface TrailerUpdate {
  plate_number?: string;
  type?: TrailerType;
  make?: string;
  status?: string;
}

export interface TrailersResponse {
  data: Trailer[];
  count: number;
}
