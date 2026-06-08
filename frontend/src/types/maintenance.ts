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
  expense_metadata?: {
    item_details?: string;
    item_name?: string;
    remarks?: string;
  } | null;
}

export interface MaintenanceVehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  status: string;
}

export interface MaintenanceEvent {
  id: string;
  truck_id?: string | null;
  trailer_id?: string | null;
  expense_id: string;
  garage_name: string;
  description: string;
  start_date: string; // ISO date
  end_date?: string | null;
  currency: string;
  created_at?: string;
  updated_at?: string;
  expense?: MaintenanceEventExpense | null;
  truck?: MaintenanceVehicle | null;
  trailer?: MaintenanceVehicle | null;
}

export interface BankDetails {
  bank_name: string;
  account_name: string;
  account_no: string;
}

export interface MaintenanceEventCreate {
  truck_id?: string | null;
  trailer_id?: string | null;
  garage_name: string;
  description: string;
  start_date: string;
  end_date?: string | null;
  cost: number;
  currency: string;
  payment_method?: string;
  bank_details?: BankDetails | null;
  update_truck_status?: boolean;
  update_trailer_status?: boolean;
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

export interface MaintenanceEventLinkExpense {
  expense_id: string;
  truck_id?: string | null;
  trailer_id?: string | null;
  garage_name: string;
  description: string;
  start_date: string;
  end_date?: string | null;
  update_truck_status?: boolean;
  update_trailer_status?: boolean;
}

export interface AvailableExpense {
  id: string;
  expense_number: string | null;
  amount: number;
  currency: string;
  description: string;
  status: string;
  created_at: string | null;
  expense_metadata?: {
    item_details?: string;
    item_name?: string;
    remarks?: string;
  } | null;
}

export interface AvailableExpensesResponse {
  data: AvailableExpense[];
  count: number;
}
