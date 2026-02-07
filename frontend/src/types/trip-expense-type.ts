/**
 * Trip Expense Type types - Story 2.19
 */

export interface TripExpenseType {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  created_at: string | null;
}

export interface TripExpenseTypeCreate {
  name: string;
  category: string;
  is_active?: boolean;
}

export interface TripExpenseTypeUpdate {
  name?: string;
  category?: string;
  is_active?: boolean;
}

export interface TripExpenseTypesResponse {
  data: TripExpenseType[];
  count: number;
}
