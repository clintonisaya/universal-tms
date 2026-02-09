"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SocketProvider } from "@/lib/socket";
import { SessionExpiredModal } from "@/components/auth/SessionExpiredModal";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // Redirect to login if auth check completes and no user found
    // AND we are not already showing the modal (though if !user, we likely want full redirect unless it's an expiry)
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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
    return null;
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
