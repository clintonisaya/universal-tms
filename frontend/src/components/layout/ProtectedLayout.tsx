"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Spin, Typography } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SocketProvider } from "@/lib/socket";
import { SessionExpiredModal } from "@/components/auth/SessionExpiredModal";

const { Text } = Typography;

// Key to track if user was previously authenticated in this browser session
const WAS_AUTHENTICATED_KEY = "nablafleet_was_authenticated";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasCheckedAuth = useRef(false);

  // Track when user becomes authenticated
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      sessionStorage.setItem(WAS_AUTHENTICATED_KEY, "true");
    }
  }, [user]);

  // Handle initial auth check result
  useEffect(() => {
    if (loading || hasCheckedAuth.current) return;

    hasCheckedAuth.current = true;

    if (!user) {
      const wasAuthenticated =
        typeof window !== "undefined" &&
        sessionStorage.getItem(WAS_AUTHENTICATED_KEY) === "true";

      if (wasAuthenticated) {
        // User was logged in before → show modal so they can continue
        setShowLoginModal(true);
      } else {
        // First visit, never authenticated → redirect to login
        setIsRedirecting(true);
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  // Listen for session expiry during active use (API calls returning 401)
  useEffect(() => {
    const handleSessionExpiry = () => setShowLoginModal(true);
    window.addEventListener("session-expired", handleSessionExpiry);
    return () => window.removeEventListener("session-expired", handleSessionExpiry);
  }, []);

  // Handle successful re-login from modal
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    window.location.reload();
  };

  // Loading state with explicit light background
  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "var(--color-bg)",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Redirecting state
  if (isRedirecting) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: "16px",
          background: "var(--color-bg)",
        }}
      >
        <Spin size="large" />
        <Text type="secondary">Redirecting to login...</Text>
      </div>
    );
  }

  // Session expired - show modal on light background (don't render DashboardLayout without user)
  if (showLoginModal && !user) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "var(--color-bg)",
        }}
      >
        <SessionExpiredModal open={true} onSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Fallback for no user (shouldn't normally reach here)
  if (!user) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "var(--color-bg)",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // User is authenticated - render normally
  return (
    <SocketProvider>
      <DashboardLayout>{children}</DashboardLayout>
      <SessionExpiredModal
        open={showLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </SocketProvider>
  );
}

export default ProtectedLayout;
