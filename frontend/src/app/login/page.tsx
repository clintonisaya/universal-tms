"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Spin } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Input, PasswordInput } from "@/components/forms";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { message } = App.useApp();

  // P6: validate callbackUrl is relative to prevent open redirect
  const raw = searchParams.get("callbackUrl") || "/dashboard";
  const callbackUrl = raw.startsWith("/") ? raw : "/dashboard";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg("Username and password are required.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const success = await login(username, password);
      if (success) {
        message.success("Login successful!");
        router.push(callbackUrl);
      } else {
        setErrorMsg("Invalid username or password. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full h-screen flex items-center justify-center",
        "bg-[var(--color-login-bg)] relative overflow-hidden",
        "transition-background duration-400"
      )}
    >
      {/* Theme toggle — top-right */}
      <div className="absolute top-6 right-7">
        <ThemeToggle />
      </div>

      {/* Login card */}
      <div
        className={cn(
          "w-[380px] backdrop-blur-[40px]",
          "bg-[var(--color-login-card)]",
          "border border-[var(--color-border)]",
          "rounded-[20px] py-12 px-10",
          "shadow-[var(--color-shadow)]",
          "transition-all duration-400"
        )}
      >
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="text-[var(--font-sm)] text-[var(--color-text-muted)] mt-1.5">
            Fleet Management System
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit}>
          {/* Username */}
          <div className="mb-5">
            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] tracking-[0.08em] uppercase mb-2">
              Username
            </label>
            <Input
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
              autoComplete="username"
              required
              placeholder="Enter your username"
            />
          </div>

          {/* Password */}
          <div className="mb-8">
            <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] tracking-[0.08em] uppercase mb-2">
              Password
            </label>
            <PasswordInput
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
            />
          </div>

          {/* Error message */}
          {errorMsg && (
            <div
              className={cn(
                "mb-5 px-3.5 py-2.5 rounded-lg",
                "bg-[color-mix(in_srgb,var(--color-red)_10%,transparent)]",
                "border border-[color-mix(in_srgb,var(--color-red)_30%,transparent)]",
                "text-[var(--color-red)] text-[var(--font-sm)]"
              )}
            >
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-3.5 bg-[var(--color-primary)] border-none rounded-[10px]",
              "text-[var(--color-primary-text)] text-[var(--font-sm)] font-bold",
              "tracking-[0.08em] uppercase",
              "shadow-[0_4px_20px_var(--color-primary-glow)]",
              "transition-all duration-200",
              loading ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:opacity-92"
            )}
          >
            {loading ? "Signing in…" : "Access System"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen bg-[var(--color-bg)]">
          <Spin size="large" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
