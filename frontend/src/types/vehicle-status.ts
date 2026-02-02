/**
 * Vehicle Status types for Story 2.8: Transport Master Data
 */

export interface VehicleStatus {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface VehicleStatusCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface VehicleStatusUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface VehicleStatusesResponse {
  data: VehicleStatus[];
  count: number;
}
