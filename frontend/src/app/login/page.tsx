"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm, ProFormText } from "@ant-design/pro-components";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { App, Alert, Typography } from "antd";
import { createStyles } from "antd-style";
import { useAuth } from "@/contexts/AuthContext";

const { Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100vh",
    overflow: "auto",
    backgroundImage:
      "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
    backgroundSize: "100% 100%",
  },
}));

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { styles } = useStyles();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { message } = App.useApp();

  // P6: validate callbackUrl is relative to prevent open redirect
  const raw = searchParams.get("callbackUrl") || "/dashboard";
  const callbackUrl = raw.startsWith("/") ? raw : "/dashboard";

  const handleSubmit = async (values: {
    username: string;
    password: string;
  }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const success = await login(values.username, values.password);
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
    <div className={styles.container}>
      <div style={{ flex: "1", padding: "32px 0" }}>
        <LoginForm
          contentStyle={{ minWidth: 280, maxWidth: "75vw" }}
          logo={null}
          title="Nablafleet"
          subTitle="Fleet Management System"
          loading={loading}
          onFinish={handleSubmit}
        >
          {errorMsg && (
            <Alert
              style={{ marginBottom: 24 }}
              message={errorMsg}
              type="error"
              showIcon
            />
          )}

          <ProFormText
            name="username"
            fieldProps={{
              size: "large",
              prefix: <UserOutlined />,
            }}
            placeholder="Username"
            rules={[
              { required: true, message: "Please enter your username" },
            ]}
          />

          <ProFormText.Password
            name="password"
            fieldProps={{
              size: "large",
              prefix: <LockOutlined />,
            }}
            placeholder="Password"
            rules={[
              { required: true, message: "Please enter your password" },
            ]}
          />
        </LoginForm>
      </div>

      <div style={{ textAlign: "center", padding: "16px 24px" }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Nablafleet TMS © {new Date().getFullYear()}
        </Text>
      </div>
    </div>
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
          }}
        >
          Loading...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
