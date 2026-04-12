"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { message, Spin } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

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
        messageApi.success("Login successful!");
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
    <>
      {contextHolder}

      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-login-bg)",

          position: "relative",
          overflow: "hidden",
          transition: "background 0.4s",
        }}
      >
        {/* Theme toggle — top-right */}
        <div style={{ position: "absolute", top: 24, right: 28 }}>
          <ThemeToggle />
        </div>

        {/* Login card */}
        <div
          style={{
            width: 380,
            background: "var(--color-login-card)",
            backdropFilter: "blur(40px)",
            border: "1px solid var(--color-border)",
            borderRadius: 20,
            padding: "48px 40px",
            boxShadow: "var(--color-shadow)",
            transition: "all 0.4s",
          }}
        >
          {/* Brand */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div
              style={{
                fontSize: "var(--font-sm)",
                color: "var(--color-text-muted)",
                marginTop: 6,
              }}
            >
              Fleet Management System
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit}>
            {/* Username */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
                autoComplete="username"
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: usernameFocused ? "var(--color-input-focus-bg)" : "var(--color-surface)",
                  border: `1px solid ${usernameFocused ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: 10,
                  color: "var(--color-text-primary)",
                  fontSize: 14,
                  outline: "none",
                  // P8: visible focus ring for keyboard accessibility
                  boxShadow: usernameFocused ? "0 0 0 2px var(--color-primary)" : "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 32 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                autoComplete="current-password"
                required
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: passwordFocused ? "var(--color-input-focus-bg)" : "var(--color-surface)",
                  border: `1px solid ${passwordFocused ? "var(--color-primary)" : "var(--color-border)"}`,
                  borderRadius: 10,
                  color: "var(--color-text-primary)",
                  fontSize: 14,
                  outline: "none",
                  // P8: visible focus ring for keyboard accessibility
                  boxShadow: passwordFocused ? "0 0 0 2px var(--color-primary)" : "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Error message — P4: use CSS vars for theme-aware error colors */}
            {errorMsg && (
              <div
                style={{
                  marginBottom: 20,
                  padding: "10px 14px",
                  background: "color-mix(in srgb, var(--color-red) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-red) 30%, transparent)",
                  borderRadius: 8,
                  color: "var(--color-red)",
                  fontSize: "var(--font-sm)",
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: "var(--color-primary)",
                border: "none",
                borderRadius: 10,
                color: "var(--color-primary-text)",
                fontSize: "var(--font-sm)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 20px var(--color-primary-glow)",
                opacity: loading ? 0.7 : 1,
                transition: "all 0.2s",
              }}
            >
              {loading ? "Signing in…" : "Access System"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            background: "var(--color-bg)",
          }}
        >
          <Spin size="large" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
