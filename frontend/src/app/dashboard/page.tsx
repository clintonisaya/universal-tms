"use client";

import { useEffect, useState, useCallback } from "react";
import { Row, Col, message, Empty, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/socket";
import { useAuth } from "@/contexts/AuthContext";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ProfitTrendChart } from "@/components/dashboard/ProfitTrendChart";
import { UtilizationChart } from "@/components/dashboard/UtilizationChart";
import { RecentTripsTable } from "@/components/dashboard/RecentTripsTable";

const { Title } = Typography;

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
}

// Role visibility helpers
// Admin and Manager see everything (Clinton's requirement)
const FULL_ACCESS_ROLES = ["admin", "manager"];

function canSee(role: string | undefined, allowedRoles: string[]): boolean {
  if (!role) return false;
  if (FULL_ACCESS_ROLES.includes(role)) return true;
  return allowedRoles.includes(role);
}

export default function DashboardPage() {
  const router = useRouter();
  const socket = useSocket();
  const { user } = useAuth();
  const role = user?.role;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTrips, setRecentTrips] = useState<any[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/dashboard/stats", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        router.push("/login");
      }
    } catch {
      message.error("Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchRecentTrips = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/trips/?limit=5&skip=0", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setRecentTrips(data.data || []);
      }
    } catch {
      // Silent fail for trips
    } finally {
      setTripsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecentTrips();
  }, [fetchStats, fetchRecentTrips]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.on("expense_created", () => {
      setStats((prev) =>
        prev
          ? { ...prev, pending_approvals: prev.pending_approvals + 1 }
          : prev
      );
    });

    socket.on("metrics_update", (data: Partial<DashboardStats>) => {
      setStats((prev) => (prev ? { ...prev, ...data } : prev));
    });

    return () => {
      socket.off("expense_created");
      socket.off("metrics_update");
    };
  }, [socket]);

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
      <Title level={3} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>

      {/* KPI Cards Row */}
      <Row gutter={[16, 16]}>
        {/* Pending Approvals: admin, manager, finance */}
        {canSee(role, ["finance"]) && (
          <Col xs={24} sm={12} lg={6} xl={4}>
            <MetricCard
              title="Pending Approvals"
              value={stats?.pending_approvals ?? 0}
              status={
                (stats?.pending_approvals ?? 0) > 0 ? "active" : "normal"
              }
              loading={loading}
              onClick={() => router.push("/manager/approvals")}
            />
          </Col>
        )}

        {/* Total Trucks: admin, manager, ops */}
        {canSee(role, ["ops"]) && (
          <Col xs={24} sm={12} lg={6} xl={4}>
            <MetricCard
              title="Total Trucks"
              value={stats?.total_trucks ?? 0}
              loading={loading}
              onClick={() => router.push("/fleet/trucks")}
            />
          </Col>
        )}

        {/* Completed Trips: admin, manager, ops, dispatcher */}
        {canSee(role, ["ops", "finance"]) && (
          <Col xs={24} sm={12} lg={6} xl={4}>
            <MetricCard
              title="Completed Trips"
              value={stats?.completed_trips ?? 0}
              loading={loading}
              onClick={() => router.push("/ops/trips")}
            />
          </Col>
        )}

        {/* Trucks In Transit: admin, manager, ops */}
        {canSee(role, ["ops"]) && (
          <Col xs={24} sm={12} lg={6} xl={4}>
            <MetricCard
              title="Trucks In Transit"
              value={stats?.trucks_in_transit ?? 0}
              status={
                (stats?.trucks_in_transit ?? 0) > 0 ? "active" : "normal"
              }
              loading={loading}
              onClick={() => router.push("/ops/trips")}
            />
          </Col>
        )}

        {/* Active Drivers: admin, manager, ops */}
        {canSee(role, ["ops"]) && (
          <Col xs={24} sm={12} lg={6} xl={4}>
            <MetricCard
              title="Active Drivers"
              value={stats?.active_drivers ?? 0}
              loading={loading}
              onClick={() => router.push("/fleet/drivers")}
            />
          </Col>
        )}

        {/* Total Paid Expenses: admin, manager, finance */}
        {canSee(role, ["finance"]) && (
          <Col xs={24} sm={12} lg={6} xl={4}>
            <MetricCard
              title="Total Paid"
              value={
                stats
                  ? `KES ${stats.total_paid_amount.toLocaleString()}`
                  : "KES 0"
              }
              isRevenue
              loading={loading}
              onClick={() => router.push("/manager/payments")}
            />
          </Col>
        )}
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* Profit / Expense Overview: admin, manager, finance */}
        {canSee(role, ["finance"]) && (
          <Col xs={24} lg={16}>
            <ProfitTrendChart data={[]} loading={false} />
          </Col>
        )}

        {/* Vehicle Utilization: admin, manager, ops */}
        {canSee(role, ["ops"]) && (
          <Col xs={24} lg={canSee(role, ["finance"]) ? 8 : 24}>
            <UtilizationChart data={utilizationData} loading={loading} />
          </Col>
        )}
      </Row>

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
