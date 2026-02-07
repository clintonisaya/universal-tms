export interface OfficeExpenseType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface OfficeExpenseTypeCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface OfficeExpenseTypeUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface OfficeExpenseTypesResponse {
  data: OfficeExpenseType[];
  count: number;
}
