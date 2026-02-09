import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Generic fetch function with error handling
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error(`API error: ${response.status}`);
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
export function useTrips(params?: { limit?: number; skip?: number }) {
  const queryString = params
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : "";
  return useQuery({
    queryKey: [...queryKeys.trips, params],
    queryFn: () =>
      apiFetch<{ data: any[]; count: number }>(`/api/v1/trips${queryString}`),
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
export function useWaybills() {
  return useQuery({
    queryKey: queryKeys.waybills,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/waybills"),
  });
}

// Expenses
export function useExpenses() {
  return useQuery({
    queryKey: queryKeys.expenses,
    queryFn: () => apiFetch<{ data: any[]; count: number }>("/api/v1/expenses"),
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
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => apiFetch<any>("/api/v1/dashboard/stats"),
  });
}

// Recent trips for dashboard
export function useRecentTrips(limit = 5) {
  return useQuery({
    queryKey: [...queryKeys.recentTrips, limit],
    queryFn: () =>
      apiFetch<{ data: any[]; count: number }>(
        `/api/v1/trips/?limit=${limit}&skip=0`
      ),
  });
}

// Todo count for dashboard
export function useTodoCount() {
  return useQuery({
    queryKey: queryKeys.todoCount,
    queryFn: () =>
      apiFetch<{ total: number }>(
        "/api/v1/tasks/my-tasks?sort_by=date&sort_order=desc"
      ),
  });
}

// Financial pulse for dashboard
export function useFinancialPulse() {
  return useQuery({
    queryKey: queryKeys.financialPulse,
    queryFn: () => apiFetch<any>("/api/v1/reports/financial-pulse"),
  });
}

// Tracking report
export function useTracking() {
  return useQuery({
    queryKey: queryKeys.tracking,
    queryFn: () => apiFetch<any[]>("/api/v1/reports/waybill-tracking"),
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
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}
