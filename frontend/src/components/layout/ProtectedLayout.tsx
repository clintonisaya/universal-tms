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
const WAS_AUTHENTICATED_KEY = "edupo_was_authenticated";

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
      // Mark that user was authenticated in this browser session
      sessionStorage.setItem(WAS_AUTHENTICATED_KEY, "true");
    }
  }, [user]);

  // Handle initial auth check result
  useEffect(() => {
    if (loading || hasCheckedAuth.current) return;

    // Auth check complete
    hasCheckedAuth.current = true;

    if (!user) {
      // Check if user was previously authenticated (session expired)
      const wasAuthenticated = typeof window !== "undefined"
        && sessionStorage.getItem(WAS_AUTHENTICATED_KEY) === "true";

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
    const handleSessionExpiry = () => {
      // Only show modal if we have a user (still in the app)
      // This handles mid-session expiry while user is working
      setShowLoginModal(true);
    };
    window.addEventListener("session-expired", handleSessionExpiry);
    return () => window.removeEventListener("session-expired", handleSessionExpiry);
  }, []);

  // Handle successful re-login from modal
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // Refresh the page data after re-login
    window.location.reload();
  };

  // Show loading spinner while auth is checking
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

  // Show redirecting state
  if (isRedirecting) {
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

  // Show session expired modal over current page (user can continue after re-login)
  if (showLoginModal && !user) {
    return (
      <SocketProvider>
        <DashboardLayout>{children}</DashboardLayout>
        <SessionExpiredModal
          open={true}
          onSuccess={handleLoginSuccess}
        />
      </SocketProvider>
    );
  }

  // User is authenticated - render normally
  if (!user) {
    // Fallback - shouldn't reach here normally
    return null;
  }

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
