/**
 * Driver types for Story 1.5: Driver Registry Management
 */

import type { Dayjs } from "dayjs";

export type DriverStatus = "Active" | "Assigned" | "On Trip" | "Inactive";

export interface Driver {
  id: string;
  full_name: string;
  license_number: string;
  license_expiry_date: string | null;
  passport_number: string | null;
  passport_expiry_date: string | null;
  phone_number: string;
  status: DriverStatus;
  created_at: string | null;
}

export interface DriverCreate {
  full_name: string;
  license_number: string;
  license_expiry_date?: string | null;
  passport_number?: string | null;
  passport_expiry_date?: string | null;
  phone_number: string;
  status?: DriverStatus;
}

export interface DriverUpdate {
  full_name?: string;
  license_number?: string;
  license_expiry_date?: string | null;
  passport_number?: string | null;
  passport_expiry_date?: string | null;
  phone_number?: string;
  status?: DriverStatus;
}

export interface DriversResponse {
  data: Driver[];
  count: number;
}

// Form value types - use Dayjs for date pickers
export interface DriverFormValues {
  full_name: string;
  license_number: string;
  license_expiry_date?: Dayjs | null;
  passport_number?: string | null;
  passport_expiry_date?: Dayjs | null;
  phone_number: string;
  status?: DriverStatus;
}
