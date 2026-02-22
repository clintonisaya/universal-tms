"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Form, Input, Typography, message, Spin } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";

const { Text } = Typography;

interface LoginFormFields {
  username: string;
  password: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Get the callback URL from query params (set by middleware when redirecting)
  // Note: Redirect for already logged-in users is handled by AuthContext
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const onFinish = async (values: LoginFormFields) => {
    setLoading(true);
    try {
      const success = await login(values.username, values.password);

      if (success) {
        messageApi.success("Login successful!");
        router.push(callbackUrl);
      } else {
        messageApi.error("Invalid username or password");
      }
    } catch {
      messageApi.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}

      {/* ── KEYFRAME ANIMATIONS ── */}
      <style>{`
        @keyframes bgBreath {
          0%, 100% { opacity: 0.07; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 0.11; transform: translate(-50%, -50%) scale(1.04); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes brandIn {
          from { opacity: 0; letter-spacing: 14px; }
          to   { opacity: 1; letter-spacing: 6px; }
        }
        @keyframes lineExpand {
          from { width: 0px; opacity: 0; }
          to   { width: 32px; opacity: 1; }
        }
        @keyframes fieldIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(212,175,55,0.25); }
          50%       { box-shadow: 0 4px 28px rgba(212,175,55,0.50); }
        }
        .login-card { animation: cardIn 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .login-brand { animation: brandIn 0.7s ease-out 0.2s both; }
        .login-separator { animation: lineExpand 0.5s ease-out 0.6s both; }
        .login-field-1 { animation: fieldIn 0.4s ease-out 0.45s both; }
        .login-field-2 { animation: fieldIn 0.4s ease-out 0.55s both; }
        .login-btn { animation: fieldIn 0.4s ease-out 0.65s both; }
        .login-btn:not(:disabled) { animation: fieldIn 0.4s ease-out 0.65s both, goldPulse 3s ease-in-out 1.5s infinite; }
        .login-btn:hover:not(:disabled) {
          background: #e8c44a !important;
          box-shadow: 0 6px 32px rgba(212,175,55,0.55) !important;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#121417",
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden"
        }}
      >

        {/* ── BACKGROUND WATERMARK — slow breathing pulse ── */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "120vh",
            height: "120vh",
            background: "url('/login-bg.png') center center / contain no-repeat",
            pointerEvents: "none",
            zIndex: 0,
            animation: "bgBreath 8s ease-in-out infinite",
          }}
        />

        {/* ── LOGIN PANEL ── */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: 420,
            padding: "0 24px"
          }}
        >
          <div
            className="login-card"
            style={{
              background: "#181A1F",
              border: "1px solid rgba(212, 175, 55, 0.20)",
              borderBottom: "2px solid rgba(212, 175, 55, 0.55)",
              borderRadius: "4px",
              padding: "48px 40px 40px",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0,0,0,0.3)",
            }}
          >
            {/* Header — brand + separator */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              {/* Brand name */}
              <Text
                className="login-brand"
                style={{
                  color: "#D4AF37",
                  fontSize: 28,
                  display: "block",
                  letterSpacing: "6px",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                EDUPO
              </Text>
              {/* Thin gold separator line */}
              <div
                className="login-separator"
                style={{
                  width: 32,
                  height: 1,
                  background: "rgba(212,175,55,0.4)",
                  margin: "14px auto 0",
                }}
              />
            </div>

            <Form
              name="login"
              onFinish={onFinish}
              layout="vertical"
              size="large"
              requiredMark={false}
            >
              <Form.Item
                name="username"
                label={<span style={{ color: "rgba(255,255,255,0.50)", fontSize: 11, letterSpacing: "1.5px" }}>USERNAME</span>}
                rules={[{ required: true, message: "Username is required" }]}
                style={{ marginBottom: 20 }}
                className="login-field-1"
              >
                <Input
                  prefix={<UserOutlined style={{ color: "rgba(255,255,255,0.25)", marginRight: 8 }} />}
                  autoComplete="username"
                  style={{
                    background: "#0D0E11",
                    borderColor: "#2a2c31",
                    color: "#FFF",
                    borderRadius: "2px",
                  }}
                  styles={{ input: { background: "transparent", color: "#FFF" } }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ color: "rgba(255,255,255,0.50)", fontSize: 11, letterSpacing: "1.5px" }}>PASSWORD</span>}
                rules={[{ required: true, message: "Password is required" }]}
                style={{ marginBottom: 32 }}
                className="login-field-2"
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "rgba(255,255,255,0.25)", marginRight: 8 }} />}
                  autoComplete="current-password"
                  style={{
                    background: "#0D0E11",
                    borderColor: "#2a2c31",
                    color: "#FFF",
                    borderRadius: "2px",
                  }}
                  styles={{ input: { background: "transparent", color: "#FFF" } }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  className="login-btn"
                  style={{
                    height: "48px",
                    background: "#D4AF37",
                    borderColor: "#D4AF37",
                    color: "#000000",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    borderRadius: "2px",
                    boxShadow: "0 4px 16px rgba(212,175,55,0.25)",
                  }}
                >
                  ACCESS SYSTEM
                </Button>
              </Form.Item>
            </Form>

          </div>

        </div>

      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1F1F1F' }}>
        <Spin size="large" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
