"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Form, Input, Typography, message, Space, Spin } from "antd";
import { UserOutlined, LockOutlined, CrownOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";

const { Title, Text } = Typography;

interface LoginFormFields {
  username: string;
  password: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Get the callback URL from query params (set by middleware when redirecting)
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push(callbackUrl);
    }
  }, [user, authLoading, router, callbackUrl]);

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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1F1F1F 0%, #2c3e50 100%)", // Dark Charcoal Gradient
          padding: "20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Watermark Background */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: 0.03,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <CrownOutlined style={{ fontSize: "600px", color: "#ffffff" }} />
        </div>

        <Card
          style={{
            width: "100%",
            maxWidth: 400,
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.2)",
            borderRadius: "8px",
            border: "none",
            zIndex: 1,
            background: "rgba(255, 255, 255, 0.98)",
          }}
          styles={{ body: { padding: "40px 32px" } }}
        >
          <Space
            orientation="vertical"
            size="large"
            style={{ width: "100%", textAlign: "center" }}
          >
            <div style={{ marginBottom: "16px" }}>
              <CrownOutlined style={{ fontSize: "42px", color: "#D4AF37", marginBottom: "12px" }} />
              <Title level={3} style={{ margin: 0, color: "#1F1F1F", letterSpacing: "-0.5px", fontWeight: 700 }}>
                EDUPO TMS
              </Title>
              <Text type="secondary" style={{ fontSize: "13px", letterSpacing: "1px", textTransform: "uppercase" }}>
                Secure Login
              </Text>
            </div>

            <Form
              name="login"
              onFinish={onFinish}
              layout="vertical"
              size="large"
              style={{ textAlign: "left" }}
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: "Please enter your username" },
                ]}
              >
                <Input
                  prefix={<UserOutlined style={{ color: "#bfbfbf" }} />}
                  placeholder="Username"
                  autoComplete="username"
                  style={{ borderRadius: "4px" }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: "Please enter your password" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
                  placeholder="Password"
                  autoComplete="current-password"
                  style={{ borderRadius: "4px" }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: "24px" }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  style={{ height: "44px", fontSize: "14px", fontWeight: 600, letterSpacing: "0.5px" }}
                >
                  SIGN IN
                </Button>
              </Form.Item>
            </Form>
          </Space>
        </Card>
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
