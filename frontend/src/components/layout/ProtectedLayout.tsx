"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spin, Typography } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SocketProvider } from "@/lib/socket";
import { SessionExpiredModal } from "@/components/auth/SessionExpiredModal";

const { Text } = Typography;

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { user, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // If not loading and no user, force hard redirect
    // Use window.location.href to ensure reliable navigation even if router is stuck
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [user, loading]);

  useEffect(() => {
    const handleSessionExpiry = () => setShowLoginModal(true);
    window.addEventListener("session-expired", handleSessionExpiry);
    return () => window.removeEventListener("session-expired", handleSessionExpiry);
  }, []);

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    // Render a redirecting state instead of null to prevent "blank screen" confusion
    return (
      <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", gap: "16px" }}>
        <Spin size="large" />
        <Text type="secondary">Redirecting to login...</Text>
      </div>
    );
  }

  // Always render the layout - middleware handles initial access control
  // This prevents infinite loading if backend is slow/down
  // If auth check eventually fails, the useEffect will redirect
  return (
    <SocketProvider>
      <DashboardLayout>{children}</DashboardLayout>
      <SessionExpiredModal 
        open={showLoginModal} 
        onSuccess={() => setShowLoginModal(false)} 
      />
    </SocketProvider>
  );
}

export default ProtectedLayout;
