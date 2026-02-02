/**
 * Cargo Type types for Story 2.8: Transport Master Data
 */

export interface CargoType {
  id: string;
  name: string;
  description: string | null;
  created_at: string | null;
}

export interface CargoTypeCreate {
  name: string;
  description?: string;
}

export interface CargoTypeUpdate {
  name?: string;
  description?: string;
}

export interface CargoTypesResponse {
  data: CargoType[];
  count: number;
}
