"use client";

import { useState, useEffect } from "react";
import {
  ProForm,
  ProFormText,
} from "@ant-design/pro-components";
import { Button, App, Typography, Divider } from "antd";
import { ReloadOutlined, BankOutlined } from "@ant-design/icons";
import { usePermissions } from "@/hooks/application/usePermissions";
import { useCompanySettings, useInvalidateQueries } from "@/hooks/application/useApi";

const { Text } = Typography;

export default function CompanySettingsPage() {
  const { message } = App.useApp();
  const { hasPermission } = usePermissions();
  const { data, isLoading: loading, refetch } = useCompanySettings();
  const { invalidateCompanySettings } = useInvalidateQueries();
  const canEdit = hasPermission("settings:company");

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={2} style={{ margin: 0 }}>
          <BankOutlined style={{ marginRight: 8 }} />
          Company Settings
        </Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
        Bank details shown on invoices. Changes apply to new invoices only —
        existing invoices retain their original details.
      </Text>

      <ProForm
        loading={loading}
        disabled={!canEdit}
        initialValues={data || {}}
        onFinish={async (values) => {
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
              return true;
            }
            const error = await response.json();
            message.error(error.detail || "Update failed");
            return false;
          } catch {
            message.error("Network error");
            return false;
          }
        }}
        submitter={{
          searchConfig: { submitText: "Save Changes" },
          submitButtonProps: { icon: undefined },
          render: (_, dom) =>
            canEdit ? (
              <div style={{ textAlign: "right" }}>{dom}</div>
            ) : null,
        }}
      >
        <Typography.Title level={4}>
          Tanzanian Shilling (TZS) Account
        </Typography.Title>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ProFormText
            name="bank_name_tzs"
            label="Bank Name"
            rules={[
              { required: true, message: "Bank name is required" },
              { max: 255 },
            ]}
            placeholder="e.g. CRDB BANK - AZIKIWE BRANCH"
          />
          <ProFormText
            name="bank_account_tzs"
            label="Account Number"
            rules={[
              { required: true, message: "Account number is required" },
              { max: 100 },
            ]}
            placeholder="e.g. 015C001CVAW00"
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ProFormText
            name="bank_account_name"
            label="Account Holder Name"
            rules={[
              { required: true, message: "Account holder name is required" },
              { max: 255 },
            ]}
            placeholder="e.g. NABLAFLEET COMPANY LIMITED"
          />
          <ProFormText
            name="bank_currency_tzs"
            label="Currency Label"
            rules={[
              { required: true, message: "Currency label is required" },
              { max: 50 },
            ]}
            placeholder="e.g. Tanzanian Shilling"
          />
        </div>

        <Divider />

        <Typography.Title level={4}>USD Account</Typography.Title>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ProFormText
            name="bank_name_usd"
            label="Bank Name"
            rules={[
              { required: true, message: "Bank name is required" },
              { max: 255 },
            ]}
            placeholder="e.g. CRDB BANK - AZIKIWE BRANCH"
          />
          <ProFormText
            name="bank_account_usd"
            label="Account Number"
            rules={[
              { required: true, message: "Account number is required" },
              { max: 100 },
            ]}
            placeholder="e.g. 025C001CVAW00"
          />
        </div>
        <ProFormText
          name="bank_currency_usd"
          label="Currency Label"
          rules={[
            { required: true, message: "Currency label is required" },
            { max: 50 },
          ]}
          placeholder="e.g. USD"
          style={{ maxWidth: "50%" }}
        />
      </ProForm>
    </div>
  );
}
