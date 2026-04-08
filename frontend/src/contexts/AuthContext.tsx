"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";

export interface User {
  id: string;
  username: string;
  role: string;
  full_name: string | null;
  is_superuser: boolean;
  is_active: boolean;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = async (): Promise<User | null> => {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch("/api/v1/login/test-token", {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
      // 401/403 means not authenticated
      return null;
    } catch (error) {
      clearTimeout(timeoutId);
      // Network error, timeout, or API not available - treat as not authenticated
      if (process.env.NODE_ENV === "development") {
        if (error instanceof Error && error.name === "AbortError") {
          console.warn("Auth check timed out");
        } else {
          console.warn("Auth check failed:", error);
        }
      }
      return null;
    }
  };

  const refreshUser = async () => {
    const userData = await fetchUser();
    setUser(userData);
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch("/api/v1/login/access-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
      credentials: "include",
    });

    if (response.ok) {
      await refreshUser();
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await fetch("/api/v1/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      // Clear the "was authenticated" flag so next visit is treated as first visit
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("edupo_was_authenticated");
      }
      router.push("/login");
    }
  };

  // Initial auth check - only runs once on mount
  useEffect(() => {
    const init = async () => {
      const userData = await fetchUser();
      setUser(userData);
      setLoading(false);
    };
    init();
  }, []);

  // Handle redirect from login page when already logged in
  // Note: Redirect TO login for unauthenticated users is handled by ProtectedLayout
  useEffect(() => {
    if (loading) return; // Wait for auth check to complete

    // Only redirect authenticated users away from login page
    if (user && pathname === "/login") {
      router.push("/dashboard");
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
