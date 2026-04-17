"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  Space,
  message,
  Typography,
  Form,
  Input,
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  ReloadOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanySettings, useInvalidateQueries } from "@/hooks/useApi";

const { Title, Text } = Typography;

interface BankFormValues {
  bank_name_tzs: string;
  bank_account_tzs: string;
  bank_account_name: string;
  bank_currency_tzs: string;
  bank_name_usd: string;
  bank_account_usd: string;
  bank_currency_usd: string;
}

export default function CompanySettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { data, isLoading: loading, refetch } = useCompanySettings();
  const { invalidateCompanySettings } = useInvalidateQueries();

  const [form] = Form.useForm<BankFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const canEdit = hasPermission("settings:company");

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        bank_name_tzs: data.bank_name_tzs,
        bank_account_tzs: data.bank_account_tzs,
        bank_account_name: data.bank_account_name,
        bank_currency_tzs: data.bank_currency_tzs,
        bank_name_usd: data.bank_name_usd,
        bank_account_usd: data.bank_account_usd,
        bank_currency_usd: data.bank_currency_usd,
      });
    }
  }, [data, form]);

  const handleSubmit = async (values: BankFormValues) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/company-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (response.ok) {
        message.success("Company settings updated");
        invalidateCompanySettings();
      } else {
        const error = await response.json();
        message.error(error.detail || "Update failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "var(--space-xl)", minHeight: "100vh", background: "var(--color-bg)" }}>
      <Card>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/dashboard")}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                <BankOutlined style={{ marginRight: 8 }} />
                Company Settings
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
            </Space>
          </div>

          <Text type="secondary">
            Bank details shown on invoices. Changes apply to new invoices only — existing invoices retain their original details.
          </Text>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            disabled={!canEdit}
          >
            {/* TZS Bank Details */}
            <Title level={4}>Tanzanian Shilling (TZS) Account</Title>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Form.Item
                name="bank_name_tzs"
                label="Bank Name"
                rules={[{ required: true, message: "Bank name is required" }, { max: 255 }]}
              >
                <Input placeholder="e.g. CRDB BANK - AZIKIWE BRANCH" />
              </Form.Item>
              <Form.Item
                name="bank_account_tzs"
                label="Account Number"
                rules={[{ required: true, message: "Account number is required" }, { max: 100 }]}
              >
                <Input placeholder="e.g. 015C001CVAW00" />
              </Form.Item>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Form.Item
                name="bank_account_name"
                label="Account Holder Name"
                rules={[{ required: true, message: "Account holder name is required" }, { max: 255 }]}
              >
                <Input placeholder="e.g. NABLAFLEET COMPANY LIMITED" />
              </Form.Item>
              <Form.Item
                name="bank_currency_tzs"
                label="Currency Label"
                rules={[{ required: true, message: "Currency label is required" }, { max: 50 }]}
              >
                <Input placeholder="e.g. Tanzanian Shilling" />
              </Form.Item>
            </div>

            <Divider />

            {/* USD Bank Details */}
            <Title level={4}>USD Account</Title>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Form.Item
                name="bank_name_usd"
                label="Bank Name"
                rules={[{ required: true, message: "Bank name is required" }, { max: 255 }]}
              >
                <Input placeholder="e.g. CRDB BANK - AZIKIWE BRANCH" />
              </Form.Item>
              <Form.Item
                name="bank_account_usd"
                label="Account Number"
                rules={[{ required: true, message: "Account number is required" }, { max: 100 }]}
              >
                <Input placeholder="e.g. 025C001CVAW00" />
              </Form.Item>
            </div>
            <Form.Item
              name="bank_currency_usd"
              label="Currency Label"
              style={{ maxWidth: "50%" }}
              rules={[{ required: true, message: "Currency label is required" }, { max: 50 }]}
            >
              <Input placeholder="e.g. USD" />
            </Form.Item>

            {canEdit && (
              <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  htmlType="submit"
                  loading={submitting}
                >
                  Save Changes
                </Button>
              </Form.Item>
            )}
          </Form>
        </Space>
      </Card>
    </div>
  );
}
