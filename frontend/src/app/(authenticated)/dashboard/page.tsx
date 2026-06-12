"use client";

import { useEffect, useState } from "react";
import { Empty, Typography, App, notification } from "antd";
import { ProCard } from "@ant-design/pro-components";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/lib/socket";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/application/useNotifications";
import {
  useDashboardStats,
  useRecentTrips,
  useTodoCount,
  useFinancialPulse,
  useInvalidateQueries,
  queryKeys,
} from "@/hooks/application/useApi";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ProfitTrendChart } from "@/components/dashboard/ProfitTrendChart";
import { IncomeVsExpenseChart } from "@/components/dashboard/IncomeVsExpenseChart";
import { ExpenseDistributionChart } from "@/components/dashboard/ExpenseDistributionChart";
import { UtilizationChart } from "@/components/dashboard/UtilizationChart";
import { RecentTripsTable } from "@/components/dashboard/RecentTripsTable";
import { QuickActionsWidget } from "@/components/dashboard/QuickActionsWidget";
import type { TaskType } from "@/types/notification";
import { TASK_TYPE_ICONS, TOAST_DURATION_SECONDS } from "@/types/notification";

const { Text } = Typography;

interface DashboardStats {
  total_trucks: number;
  trucks_in_transit: number;
  trucks_idle: number;
  trucks_maintenance: number;
  trucks_at_border: number;
  trucks_by_status: Record<string, number>;
  total_trips: number;
  completed_trips: number;
  in_transit_trips: number;
  trips_by_status: Record<string, number>;
  total_drivers: number;
  active_drivers: number;
  pending_approvals: number;
  pending_manager: number;
  pending_finance: number;
  total_paid_amount: number;
  profit_trend: Array<{ date: string; profit: number }>;
}

interface FinancialPulseData {
  quarterly_trend: Array<{ quarter: string; label: string; profit: number; revenue: number; expense: number }>;
  monthly_stats: {
    income: number;
    expenses: number;
    net_profit: number;
    month: string;
  };
  expense_breakdown: Array<{ category: string; amount: number }>;
}

// Role visibility helpers
// Admin and Manager see everything 
const FULL_ACCESS_ROLES = ["admin", "manager"];

function canSee(role: string | undefined, allowedRoles: string[]): boolean {
  if (!role) return false;
  if (FULL_ACCESS_ROLES.includes(role)) return true;
  return allowedRoles.includes(role);
}

// Shape of data the server sends with task_created / task_updated events
interface TaskSocketEvent {
  task_id?: string;
  task_type?: TaskType;
  requester?: string;
  expense_type?: string;
  amount?: number;
  currency?: string;
  count?: number;
  manager?: string;
}

// AC-4: Tracks seconds since last data refresh, resets when dependency changes
function useLastUpdated(dependency: unknown): number {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setLastUpdated(new Date());
    setSecondsAgo(0);
  }, [dependency]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return secondsAgo;
}

function buildToastMessage(taskType: TaskType | undefined, data: TaskSocketEvent): string {
  switch (taskType) {
    case "expense_approval":
      return `${data.requester || "Someone"} submitted ${data.expense_type || "an"} expense${data.amount ? ` (${Number(data.amount).toLocaleString("en-US")} ${data.currency || "TZS"})` : ""}`;
    case "payment_processing": {
      const c = data.count ?? 1;
      return `${c} expense${c > 1 ? "s" : ""} ready for payment`;
    }
    case "expense_correction":
      return `Your ${data.expense_type || ""} expense was returned by ${data.manager || "Manager"}`;
    default:
      return "New task requires your attention";
  }
}

function DashboardContent() {
  const router = useRouter();
  const socket = useSocket();
  const { user } = useAuth();
  const { message: msg } = App.useApp();
  const role = user?.role;
  const { addNotification } = useNotifications(user?.id);
  const queryClient = useQueryClient();
  const { invalidateTodoCount, invalidateDashboard } = useInvalidateQueries();

  // Only fetch when user is authenticated
  const isAuthenticated = !!user;

  // TanStack Query hooks for data fetching with stale-while-revalidate
  const { data: statsData, isLoading: statsLoading } = useDashboardStats(isAuthenticated);
  const { data: tripsData, isLoading: tripsLoading } = useRecentTrips(5, isAuthenticated);
  const { data: todoData, isLoading: todoCountLoading } = useTodoCount(isAuthenticated);

  // Month selector for financial pulse (YYYY-MM format)
  const [pulseMonth, setPulseMonth] = useState<string | null>(null);
  const { data: pulseData, isLoading: financialLoading } = useFinancialPulse(isAuthenticated, pulseMonth);

  // Show loading while data is loading
  const loading = statsLoading;

  // Derive values from query data
  const stats = statsData || null;
  const recentTrips = tripsData?.data || [];
  const todoCount = todoData?.count ?? 0;
  const financialPulse = pulseData || null;

  // AC-4: Freshness indicator — resets when stats data changes
  const secondsAgo = useLastUpdated(statsData);

  // Listen for notification-click events to navigate to tasks
  useEffect(() => {
    const handler = (e: Event) => {
      const taskId = (e as CustomEvent<string>).detail;
      router.push(`/dashboard/tasks?highlight=${taskId}`);
    };
    window.addEventListener("notification-click", handler);
    return () => window.removeEventListener("notification-click", handler);
  }, [router]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on("expense_created", () => {
      // Optimistically update the cache for pending_approvals
      queryClient.setQueryData(queryKeys.dashboard, (prev: DashboardStats | undefined) =>
        prev
          ? { ...prev, pending_approvals: prev.pending_approvals + 1 }
          : prev
      );
    });

    socket.on("metrics_update", (data: Partial<DashboardStats>) => {
      queryClient.setQueryData(queryKeys.dashboard, (prev: DashboardStats | undefined) =>
        prev ? { ...prev, ...data } : prev
      );
    });

    // Story 4.2 + 4.3: To-Do real-time updates with contextual toast notifications
    socket.on("task_created", (data?: TaskSocketEvent) => {
      // Optimistically increment todo count in cache
      queryClient.setQueryData(queryKeys.todoCount, (prev: { total: number } | undefined) =>
        prev ? { ...prev, total: prev.total + 1 } : { total: 1 }
      );

      const eventData = data || {};
      const taskType = eventData.task_type;
      const toastMsg = buildToastMessage(taskType, eventData);
      const taskId = eventData.task_id || "";

      // Create persistent notification
      addNotification({
        type: "task_created",
        taskId,
        taskType: taskType || "expense_approval",
        message: toastMsg,
        requester: eventData.requester,
        amount: eventData.amount,
        currency: eventData.currency,
      });

      // Show contextual toast (bottom-right, clickable)
      notification.open({
        message: "New Task",
        description: toastMsg,
        icon: <span>{TASK_TYPE_ICONS[taskType || "expense_approval"]}</span>,
        placement: "bottomRight",
        duration: TOAST_DURATION_SECONDS,
        onClick: () => {
          router.push(`/dashboard/tasks?highlight=${taskId}`);
          notification.destroy();
        },
        style: { cursor: "pointer" },
      });
    });

    socket.on("task_updated", (data?: TaskSocketEvent) => {
      // Invalidate to refetch the accurate count
      invalidateTodoCount();

      if (data?.task_type) {
        const toastMsg = buildToastMessage(data.task_type, data);
        addNotification({
          type: "task_updated",
          taskId: data.task_id || "",
          taskType: data.task_type,
          message: toastMsg,
          requester: data.requester,
          amount: data.amount,
          currency: data.currency,
        });
      }
    });

    return () => {
      socket.off("expense_created");
      socket.off("metrics_update");
      socket.off("task_created");
      socket.off("task_updated");
    };
  }, [socket, queryClient, invalidateTodoCount, addNotification, router]);

  // Build utilization data from trucks_by_status for the chart
  const utilizationData = stats
    ? [
      {
        name: "Fleet",
        Idle: stats.trucks_idle,
        Transit: stats.trucks_in_transit,
        Border: stats.trucks_at_border,
        Maintenance: stats.trucks_maintenance,
      },
    ]
    : [];

  return (
    <div>
      <QuickActionsWidget />

      {/* KPI Cards Row */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        {!statsLoading && (
          <Text type="secondary">
            Last updated: {secondsAgo}s ago
          </Text>
        )}
      </div>
      <ProCard gutter={16} wrap style={{ marginBottom: 16 }}>
        {/* AC-4: Ops/Dispatcher priority — Trucks In Transit appears first */}
        {(role === 'ops' || role === 'dispatcher') && (
          <ProCard colSpan={6} style={{ minWidth: 180 }}>
            <MetricCard
              title="Trucks In Transit"
              value={stats?.trucks_in_transit ?? 0}
              accent="var(--color-blue)"
              status={
                (stats?.trucks_in_transit ?? 0) > 0 ? "active" : "normal"
              }
              loading={loading}
              onClick={() => router.push("/ops/trips")}
            />
          </ProCard>
        )}

        {/* Pending Approvals: admin, manager, finance — first for manager/finance roles */}
        {canSee(role, ["finance"]) && (
          <ProCard colSpan={6} style={{ minWidth: 180 }}>
            <MetricCard
              title="Pending Approvals"
              value={
                role === "manager"
                  ? (stats?.pending_manager ?? 0)
                  : (stats?.pending_approvals ?? 0)
              }
              accent="var(--color-orange)"
              status={
                (role === "manager"
                  ? (stats?.pending_manager ?? 0)
                  : (stats?.pending_approvals ?? 0)) > 0
                  ? "active"
                  : "normal"
              }
              loading={loading}
              onClick={() => router.push("/dashboard/tasks")}
            />
          </ProCard>
        )}

        {/* Total Trucks: admin, manager, ops */}
        {canSee(role, ["ops"]) && (
          <ProCard colSpan={6} style={{ minWidth: 180 }}>
            <MetricCard
              title="Total Trucks"
              value={stats?.total_trucks ?? 0}
              accent="var(--color-blue)"
              loading={loading}
              onClick={() => router.push("/fleet/trucks")}
            />
          </ProCard>
        )}

        {/* Completed Trips: admin, manager, ops, finance */}
        {canSee(role, ["ops", "finance"]) && (
          <ProCard colSpan={6} style={{ minWidth: 180 }}>
            <MetricCard
              title="Completed Trips"
              value={stats?.completed_trips ?? 0}
              accent="var(--color-green)"
              loading={loading}
              onClick={() => router.push("/ops/trips")}
            />
          </ProCard>
        )}

        {/* Trucks In Transit: admin, manager only — ops/dispatcher already see it first above */}
        {canSee(role, ["ops"]) && role !== 'ops' && role !== 'dispatcher' && (
          <ProCard colSpan={6} style={{ minWidth: 180 }}>
            <MetricCard
              title="Trucks In Transit"
              value={stats?.trucks_in_transit ?? 0}
              accent="var(--color-blue)"
              status={
                (stats?.trucks_in_transit ?? 0) > 0 ? "active" : "normal"
              }
              loading={loading}
              onClick={() => router.push("/ops/trips")}
            />
          </ProCard>
        )}

        {/* Idle Drivers: admin, manager, ops */}
        {canSee(role, ["ops"]) && (
          <ProCard colSpan={6} style={{ minWidth: 180 }}>
            <MetricCard
              title="Active Drivers"
              value={stats?.active_drivers ?? 0}
              accent="var(--color-cyan)"
              loading={loading}
              onClick={() => router.push("/fleet/drivers")}
            />
          </ProCard>
        )}

        {/* Idle Trucks: admin, manager, ops */}
        {canSee(role, ["ops"]) && (
          <ProCard colSpan={6} style={{ minWidth: 180 }}>
            <MetricCard
              title="Idle Trucks"
              value={stats?.trucks_idle ?? 0}
              status={
                (stats?.trucks_idle ?? 0) > 0 ? "critical" : "active"
              }
              loading={loading}
              onClick={() => router.push("/fleet/trucks")}
            />
          </ProCard>
        )}
      </ProCard>

      {/* Financial Pulse Section: admin, manager, finance */}
      {canSee(role, ["finance"]) && (
        <ProCard
          title="Financial Pulse"
          headerBordered
          gutter={16}
          wrap
          style={{ marginTop: 16, marginBottom: 16 }}
        >
          {/* Quarterly Profit Trend Chart */}
          <ProCard colSpan={12}>
            <ProfitTrendChart
              data={financialPulse?.quarterly_trend || []}
              loading={financialLoading}
            />
          </ProCard>

          {/* Monthly Income vs Expense */}
          <ProCard colSpan={6}>
            <IncomeVsExpenseChart
              data={financialPulse?.monthly_stats || null}
              loading={financialLoading}
              selectedMonth={pulseMonth}
              onMonthChange={setPulseMonth}
            />
          </ProCard>

          {/* Expense Distribution Donut */}
          <ProCard colSpan={6}>
            <ExpenseDistributionChart
              data={financialPulse?.expense_breakdown || []}
              loading={financialLoading}
              monthLabel={financialPulse?.monthly_stats?.month}
            />
          </ProCard>
        </ProCard>
      )}

      {/* Recent Trips Table: visible to all roles */}
      <RecentTripsTable data={recentTrips} loading={tripsLoading} />

      {/* Empty state for roles with very limited access */}
      {!canSee(role, ["ops", "finance"]) && (
        <Empty
          description="No additional dashboard widgets for your role"
          style={{ marginTop: 48 }}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <App>
      <DashboardContent />
    </App>
  );
}
