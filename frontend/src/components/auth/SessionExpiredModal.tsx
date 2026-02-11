"use client";

import { useState } from "react";
import { Modal, Form, Input, Button, Typography, App } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";

const { Text } = Typography;

interface SessionExpiredModalProps {
  open: boolean;
  onSuccess: () => void;
}

export function SessionExpiredModal({ open, onSuccess }: SessionExpiredModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { message } = App.useApp(); // Use the hook instead of static method

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const success = await login(values.username, values.password);
      if (success) {
        message.success("Session restored");
        form.resetFields();
        onSuccess();
      } else {
        message.error("Invalid credentials");
      }
    } catch {
      message.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Session Expired"
      open={open}
      footer={null}
      closable={false}
      maskClosable={false}
      centered
      zIndex={2000} // Ensure it appears above everything
    >
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Text type="secondary">
          Your session has expired. Please log in again to continue working.
        </Text>
      </div>
      <Form
        form={form}
        name="session_login"
        onFinish={handleLogin}
        layout="vertical"
        size="large"
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: "Please input your Username!" }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Username" />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: "Please input your Password!" }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Log in & Continue
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
