/**
 * Client types for Story 4.5: Client Settings Management
 */

export interface Client {
  id: string;
  system_id: string;
  name: string;
  tin: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ClientCreate {
  system_id: string;
  name: string;
  tin?: string | null;
}

export interface ClientUpdate {
  system_id?: string;
  name?: string;
  tin?: string | null;
}

export interface ClientsResponse {
  data: Client[];
  count: number;
}
