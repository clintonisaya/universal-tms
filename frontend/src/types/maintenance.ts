export interface MaintenanceEventExpense {
  id: string;
  trip_id: string | null;
  amount: number;
  category: string;
  description: string;
  status: string;
  created_by_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface MaintenanceEvent {
  id: string;
  truck_id: string;
  expense_id: string;
  garage_name: string;
  description: string;
  start_date: string; // ISO date
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
  expense?: MaintenanceEventExpense | null;
}

export interface MaintenanceEventCreate {
  truck_id: string;
  garage_name: string;
  description: string;
  start_date: string;
  end_date?: string | null;
  cost: number;
  update_truck_status?: boolean;
}

export interface MaintenanceEventsResponse {
  data: MaintenanceEvent[];
  count: number;
}

export interface MaintenanceHistoryResponse {
  data: MaintenanceEvent[];
  count: number;
  total_maintenance_cost: number;
}
