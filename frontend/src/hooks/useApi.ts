import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// AC-4 (Story 5.7): Typed API error for field-level validation mapping
export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === "string" ? detail : `API error: ${status}`);
    this.name = "ApiError";
  }
}

// Generic fetch function with error handling
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Dispatch event for UI to handle (e.g., show login modal)
      window.dispatchEvent(new Event("session-expired"));
      throw new ApiError(401, "Unauthorized");
    }
    let detail: unknown = `API error: ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail ?? body.message ?? detail;
    } catch (_) {}
    throw new ApiError(response.status, detail);
  }

  return response.json();
}

// Query keys for cache management
export const queryKeys = {
  trucks: ["trucks"] as const,
  truck: (id: string) => ["trucks", id] as const,
  trailers: ["trailers"] as const,
  trailer: (id: string) => ["trailers", id] as const,
  drivers: ["drivers"] as const,
  driver: (id: string) => ["drivers", id] as const,
  trips: ["trips"] as const,
  trip: (id: string) => ["trips", id] as const,
  waybills: ["waybills"] as const,
  expenses: ["expenses"] as const,
  users: ["users"] as const,
  maintenance: ["maintenance"] as const,
  dashboard: ["dashboard"] as const,
  clients: ["clients"] as const,
  recentTrips: ["recentTrips"] as const,
  todoCount: ["todoCount"] as const,
  financialPulse: ["financialPulse"] as const,
  tracking: ["tracking"] as const,
  tripExpenseTypes: ["tripExpenseTypes"] as const,
  countries: ["countries"] as const,
  cities: ["cities"] as const,
  vehicleStatuses: ["vehicleStatuses"] as const,
  borderPosts: ["borderPosts"] as const,
  tripBorderCrossings: (tripId: string) => ["tripBorderCrossings", tripId] as const,
  nextBorder: (tripId: string, direction: string) => ["nextBorder", tripId, direction] as const,
  invoices: ["invoices"] as const,
  invoicePayments: (id: string) => ["invoicePayments", id] as const,
  invoicePopAttachments: (id: string) => ["invoicePopAttachments", id] as const,
  invoice: (id: string) => ["invoices", id] as const,
};

// Trucks
export function useTrucks() {
  return useQuery({
    queryKey: queryKeys.trucks,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/trucks"),
  });
}

export function useTruck(id: string) {
  return useQuery({
    queryKey: queryKeys.truck(id),
    queryFn: () => apiFetch<any>(`/api/v1/trucks/${id}`),
    enabled: !!id,
  });
}

// Trailers
export function useTrailers() {
  return useQuery({
    queryKey: queryKeys.trailers,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/trailers"),
  });
}

// Drivers
export function useDrivers() {
  return useQuery({
    queryKey: queryKeys.drivers,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/drivers"),
  });
}

// Trips
export function useTrips(params?: { limit?: number; skip?: number }, enabled = true) {
  const queryString = params
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : "";
  return useQuery({
    queryKey: [...queryKeys.trips, params],
    queryFn: () =>
      apiFetch<{ data: any[]; count: number }>(`/api/v1/trips${queryString}`),
    enabled,
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: queryKeys.trip(id),
    queryFn: () => apiFetch<any>(`/api/v1/trips/${id}`),
    enabled: !!id,
  });
}

// Waybills
export function useWaybills(enabled = true) {
  return useQuery({
    queryKey: queryKeys.waybills,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/waybills"),
    enabled,
  });
}

// Invoices
export function useInvoices(params?: { status?: string }, enabled = true) {
  const qs = params?.status ? `?status=${params.status}` : "";
  return useQuery({
    queryKey: [...queryKeys.invoices, params?.status || "all"],
    queryFn: () => apiFetch<{ data: any[]; count: number }>(`/api/v1/invoices${qs}`),
    enabled,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.invoice(id),
    queryFn: () => apiFetch<any>(`/api/v1/invoices/${id}`),
    enabled: !!id,
  });
}

// Invoice Payments
export function useInvoicePayments(invoiceId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invoicePayments(invoiceId ?? ""),
    queryFn: () => apiFetch<{ data: any[]; count: number }>(`/api/v1/invoices/${invoiceId}/payments`),
    enabled: !!invoiceId && enabled,
  });
}

// Invoice POP Attachments
export function usePopAttachments(invoiceId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invoicePopAttachments(invoiceId ?? ""),
    queryFn: () => apiFetch<any[]>(`/api/v1/invoices/${invoiceId}/pop-attachments`),
    enabled: !!invoiceId && enabled,
  });
}

// Expenses
export function useExpenses(params?: { skip?: number; limit?: number }, enabled = true) {
  const qs =
    params && Object.keys(params).length
      ? `?${new URLSearchParams(
          Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
        ).toString()}`
      : "";
  return useQuery({
    queryKey: [...queryKeys.expenses, params],
    queryFn: () => apiFetch<{ data: any[]; count: number }>(`/api/v1/expenses${qs}`),
    enabled,
  });
}

// Users
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/users"),
  });
}

// Maintenance
export function useMaintenance() {
  return useQuery({
    queryKey: queryKeys.maintenance,
    queryFn: () =>
      apiFetch<{ data: any[]; count: number }>("/api/v1/maintenance"),
  });
}

// Clients
export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/clients"),
  });
}

// Dashboard stats
export function useDashboardStats(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => apiFetch<any>("/api/v1/dashboard/stats"),
    enabled,
  });
}

// Recent trips for dashboard
export function useRecentTrips(limit = 5, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.recentTrips, limit],
    queryFn: () =>
      apiFetch<{ data: any[]; count: number }>(
        `/api/v1/trips/?limit=${limit}&skip=0`
      ),
    enabled,
  });
}

// Todo count for dashboard
export function useTodoCount(enabled = true) {
  return useQuery({
    queryKey: queryKeys.todoCount,
    queryFn: () =>
      apiFetch<{ total: number }>(
        "/api/v1/tasks/my-tasks?sort_by=date&sort_order=desc"
      ),
    enabled,
  });
}

// Financial pulse for dashboard
export function useFinancialPulse(enabled = true) {
  return useQuery({
    queryKey: queryKeys.financialPulse,
    queryFn: () => apiFetch<any>("/api/v1/reports/financial-pulse"),
    enabled,
  });
}

// Tracking report — server-side pagination & filtering (Story 6-19)
export function useTracking(
  params: { skip?: number; limit?: number; search?: string; status?: string; export?: boolean } = {},
  enabled = true,
) {
  const qs = new URLSearchParams();
  if (params.skip !== undefined) qs.set("skip", String(params.skip));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.export) qs.set("export", "true");
  const query = qs.toString();
  return useQuery({
    queryKey: [...queryKeys.tracking, query],
    queryFn: () => apiFetch<{ data: any[]; count: number }>(`/api/v1/reports/waybill-tracking${query ? `?${query}` : ""}`),
    enabled,
  });
}

// Trip Expense Types
export function useTripExpenseTypes(activeOnly = false) {
  return useQuery({
    queryKey: [...queryKeys.tripExpenseTypes, activeOnly],
    queryFn: () =>
      apiFetch<{ data: any[]; count: number }>(`/api/v1/trip-expense-types/?active_only=${activeOnly}`),
  });
}

// Office Expense Types
export function useOfficeExpenseTypes(activeOnly = false) {
  return useQuery({
    queryKey: ["officeExpenseTypes", activeOnly] as const,
    queryFn: () =>
      apiFetch<{ data: any[]; count: number }>(`/api/v1/office-expense-types/?active_only=${activeOnly}`),
  });
}

// Countries
export function useCountries() {
  return useQuery({
    queryKey: queryKeys.countries,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/countries"),
  });
}

// Cities
export function useCities() {
  return useQuery({
    queryKey: queryKeys.cities,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/cities"),
  });
}

// Vehicle Statuses
export function useVehicleStatuses() {
  return useQuery({
    queryKey: queryKeys.vehicleStatuses,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/vehicle-statuses"),
  });
}

// Cargo Types
export function useCargoTypes() {
  return useQuery({
    queryKey: ["cargoTypes"] as const,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/cargo-types"),
  });
}

// Exchange Rates
export function useExchangeRates() {
  return useQuery({
    queryKey: ["exchangeRates"] as const,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/finance/exchange-rates"),
  });
}

// Border Posts
export function useBorderPosts(activeOnly = false, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.borderPosts, activeOnly] as const,
    queryFn: () => apiFetch<{ data: any[]; count: number }>(`/api/v1/border-posts?active_only=${activeOnly}&limit=500`),
    enabled,
  });
}

// Trip Border Crossings (for detail drawer and status modal pre-fill)
export function useTripBorderCrossings(tripId: string | null) {
  return useQuery({
    queryKey: queryKeys.tripBorderCrossings(tripId ?? ""),
    queryFn: () => apiFetch<any[]>(`/api/v1/trips/${tripId}/border-crossings`),
    enabled: !!tripId,
  });
}

// Next uncompleted border for a trip (for status modal auto-pop)
export function useNextBorder(tripId: string | null, direction: "go" | "return") {
  return useQuery({
    queryKey: queryKeys.nextBorder(tripId ?? "", direction),
    queryFn: () => apiFetch<any | null>(`/api/v1/trips/${tripId}/next-border?direction=${direction}`),
    enabled: !!tripId,
  });
}

// Hook to invalidate queries after mutations
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateTrucks: () => queryClient.invalidateQueries({ queryKey: queryKeys.trucks }),
    invalidateTrailers: () => queryClient.invalidateQueries({ queryKey: queryKeys.trailers }),
    invalidateDrivers: () => queryClient.invalidateQueries({ queryKey: queryKeys.drivers }),
    invalidateTrips: () => queryClient.invalidateQueries({ queryKey: queryKeys.trips }),
    invalidateWaybills: () => queryClient.invalidateQueries({ queryKey: queryKeys.waybills }),
    invalidateExpenses: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses }),
    invalidateUsers: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
    invalidateMaintenance: () => queryClient.invalidateQueries({ queryKey: queryKeys.maintenance }),
    invalidateClients: () => queryClient.invalidateQueries({ queryKey: queryKeys.clients }),
    invalidateDashboard: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    invalidateRecentTrips: () => queryClient.invalidateQueries({ queryKey: queryKeys.recentTrips }),
    invalidateTodoCount: () => queryClient.invalidateQueries({ queryKey: queryKeys.todoCount }),
    invalidateFinancialPulse: () => queryClient.invalidateQueries({ queryKey: queryKeys.financialPulse }),
    invalidateTracking: () => queryClient.invalidateQueries({ queryKey: queryKeys.tracking }),
    invalidateTripExpenseTypes: () => queryClient.invalidateQueries({ queryKey: queryKeys.tripExpenseTypes }),
    invalidateOfficeExpenseTypes: () => queryClient.invalidateQueries({ queryKey: ["officeExpenseTypes"] }),
    invalidateCountries: () => queryClient.invalidateQueries({ queryKey: queryKeys.countries }),
    invalidateCities: () => queryClient.invalidateQueries({ queryKey: queryKeys.cities }),
    invalidateVehicleStatuses: () => queryClient.invalidateQueries({ queryKey: queryKeys.vehicleStatuses }),
    invalidateCargoTypes: () => queryClient.invalidateQueries({ queryKey: ["cargoTypes"] }),
    invalidateExchangeRates: () => queryClient.invalidateQueries({ queryKey: ["exchangeRates"] }),
    invalidateBorderPosts: () => queryClient.invalidateQueries({ queryKey: queryKeys.borderPosts }),
    invalidateTripBorderCrossings: (tripId: string) => queryClient.invalidateQueries({ queryKey: queryKeys.tripBorderCrossings(tripId) }),
    invalidateNextBorder: (tripId: string) => queryClient.invalidateQueries({ queryKey: ["nextBorder", tripId] }),
    invalidateInvoices: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices }),
    invalidateInvoice: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.invoice(id) }),
    invalidateInvoicePayments: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.invoicePayments(id) }),
    invalidatePopAttachments: (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.invoicePopAttachments(id) }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}
