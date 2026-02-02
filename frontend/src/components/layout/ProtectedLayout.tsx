"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SocketProvider } from "@/lib/socket";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if auth check completes and no user found
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Always render the layout - middleware handles initial access control
  // This prevents infinite loading if backend is slow/down
  // If auth check eventually fails, the useEffect will redirect
  return (
    <SocketProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </SocketProvider>
  );
}

export default ProtectedLayout;
