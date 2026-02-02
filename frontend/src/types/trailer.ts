/**
 * Trailer types for Story 1.6: Trailer Registry Management
 */

export type TrailerStatus = "Idle" | "Loading" | "In Transit" | "At Border" | "Offloaded" | "Returned" | "Waiting for PODs" | "Maintenance";
export type TrailerType = "Flatbed" | "Skeleton" | "Box" | "Tanker";

export interface Trailer {
  id: string;
  plate_number: string;
  type: TrailerType;
  make: string;
  status: TrailerStatus;
  created_at: string | null;
}

export interface TrailerCreate {
  plate_number: string;
  type: TrailerType;
  make: string;
  status?: TrailerStatus;
}

export interface TrailerUpdate {
  plate_number?: string;
  type?: TrailerType;
  make?: string;
  status?: TrailerStatus;
}

export interface TrailersResponse {
  data: Trailer[];
  count: number;
}
