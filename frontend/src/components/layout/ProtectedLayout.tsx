"use client";

import { useEffect, useState, useRef } from "react";
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
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const redirectAttempted = useRef(false);

  useEffect(() => {
    // Redirect to login if auth check completes and no user found
    // Use ref to prevent multiple redirect attempts
    if (!loading && !user && !redirectAttempted.current) {
      redirectAttempted.current = true;
      // Use window.location for reliable redirect (router.replace can fail silently)
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
      <div style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f7fa",
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    // Render a redirecting state with explicit light background
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: "16px",
        background: "#f5f7fa",
      }}>
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
