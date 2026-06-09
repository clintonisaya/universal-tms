"use client";

import { useRef } from "react";
import {
  ProTable,
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProFormDigit,
  type ProColumns,
  type ActionType,
} from "@ant-design/pro-components";
import { Button, App, Space } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { amountInputProps } from "@/lib/utils";
import type { ExchangeRate, ExchangeRateCreate } from "@/types/finance";
import { usePermissions } from "@/hooks/application/usePermissions";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_OPTIONS = MONTHS.map((name, idx) => ({
  label: name,
  value: idx + 1,
}));

export default function ExchangeRateSettingsPage() {
  const { message } = App.useApp();
  const { hasPermission } = usePermissions();
  const actionRef = useRef<ActionType>(null);

  const handleDelete = async (rate: ExchangeRate) => {
    try {
      const response = await fetch(
        `/api/v1/finance/exchange-rates/${rate.id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (response.ok) {
        message.success("Rate deleted");
        actionRef.current?.reload();
      } else {
        message.error("Delete failed");
      }
    } catch {
      message.error("Network error");
    }
  };

  const columns: ProColumns<ExchangeRate>[] = [
    {
      title: "Month",
      key: "month",
      width: 120,
      render: (_, record) => (
        <div style={{ fontWeight: 600 }}>{MONTHS[record.month - 1]}</div>
      ),
      search: false,
    },
    {
      title: "Year",
      dataIndex: "year",
      key: "year",
      width: 100,
      sorter: (a, b) => a.year * 100 + a.month - (b.year * 100 + b.month),
      defaultSortOrder: "descend",
      search: false,
    },
    {
      title: "Rate (1 USD = X TZS)",
      dataIndex: "rate",
      key: "rate",
      align: "right",
      render: (_, record) => (
        <div style={{ fontWeight: 600 }}>
          {new Intl.NumberFormat("en-TZ", {
            minimumFractionDigits: 2,
          }).format(record.rate)}
        </div>
      ),
      search: false,
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      valueType: "option",
      render: (_, record) => (
        <Space size="small">
          <ModalForm<ExchangeRateCreate>
            title="Edit Exchange Rate"
            trigger={
              <Button type="text" size="small" icon={<EditOutlined />} />
            }
            onFinish={async (values) => {
              try {
                const response = await fetch(
                  `/api/v1/finance/exchange-rates/${record.id}`,
                  {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ rate: values.rate }),
                  }
                );
                if (response.ok) {
                  message.success("Rate updated");
                  actionRef.current?.reload();
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
            initialValues={{
              month: record.month,
              year: record.year,
              rate: record.rate,
            }}
          >
            <ProFormSelect
              name="month"
              label="Month"
              options={MONTH_OPTIONS}
              disabled
            />
            <ProFormDigit
              name="year"
              label="Year"
              min={2020}
              max={2100}
              disabled
              fieldProps={{ precision: 0 }}
            />
            <ProFormDigit
              name="rate"
              label="Rate (1 USD = X TZS)"
              rules={[
                { required: true, message: "Please enter the rate" },
              ]}
              min={1}
              fieldProps={{
                precision: 2,
                ...amountInputProps,
              }}
              placeholder="e.g. 2600.00"
            />
          </ModalForm>
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <ProTable<ExchangeRate>
      headerTitle="Exchange Rates (USD → TZS)"
      actionRef={actionRef}
      columns={columns}
      rowKey="id"
      request={async () => {
        const response = await fetch("/api/v1/finance/exchange-rates", {
          credentials: "include",
        });
        const data = await response.json();
        return {
          data: data.data || [],
          total: data.count || 0,
          success: true,
        };
      }}
      search={false}
      pagination={{
        defaultPageSize: 20,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
      }}
      toolBarRender={() => [
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={() => actionRef.current?.reload()}
        >
          Refresh
        </Button>,
        ...(hasPermission("settings:exchange-rates")
          ? [
              <ModalForm<ExchangeRateCreate>
                key="create"
                title="Set Exchange Rate"
                trigger={
                  <Button type="primary" icon={<PlusOutlined />}>
                    Set Rate
                  </Button>
                }
                onFinish={async (values) => {
                  try {
                    const response = await fetch(
                      "/api/v1/finance/exchange-rates",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify(values),
                      }
                    );
                    if (response.ok) {
                      message.success("Rate created");
                      actionRef.current?.reload();
                      return true;
                    }
                    const error = await response.json();
                    message.error(error.detail || "Creation failed");
                    return false;
                  } catch {
                    message.error("Network error");
                    return false;
                  }
                }}
                initialValues={{
                  month: new Date().getMonth() + 1,
                  year: new Date().getFullYear(),
                }}
              >
                <ProFormSelect
                  name="month"
                  label="Month"
                  options={MONTH_OPTIONS}
                  rules={[{ required: true }]}
                />
                <ProFormDigit
                  name="year"
                  label="Year"
                  min={2020}
                  max={2100}
                  rules={[{ required: true }]}
                  fieldProps={{ precision: 0 }}
                />
                <ProFormDigit
                  name="rate"
                  label="Rate (1 USD = X TZS)"
                  rules={[
                    { required: true, message: "Please enter the rate" },
                  ]}
                  min={1}
                  fieldProps={{
                    precision: 2,
                    ...amountInputProps,
                  }}
                  placeholder="e.g. 2600.00"
                />
              </ModalForm>,
            ]
          : []),
      ]}
    />
  );
}
