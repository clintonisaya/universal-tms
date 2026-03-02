"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  message,
  Typography,
  Modal,
  Form,
  InputNumber,
  Select,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { amountInputProps } from "@/lib/utils";
import type { ColumnsType } from "antd/es/table";
import type { ExchangeRate, ExchangeRateCreate } from "@/types/finance";
import { useAuth } from "@/contexts/AuthContext";
import { useExchangeRates, useInvalidateQueries } from "@/hooks/useApi";
import { getStandardRowSelection, useResizableColumns } from "@/components/ui/tableUtils";

const { Title } = Typography;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ExchangeRateSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // TanStack Query
  const { data, isLoading: loading, refetch } = useExchangeRates();
  const { invalidateExchangeRates } = useInvalidateQueries();

  const rates = (data?.data || []) as ExchangeRate[];

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [form] = Form.useForm<ExchangeRateCreate>();

  const openCreate = () => {
    setEditingRate(null);
    const now = new Date();
    form.resetFields();
    form.setFieldsValue({ month: now.getMonth() + 1, year: now.getFullYear() });
    setModalOpen(true);
  };

  const openEdit = (rate: ExchangeRate) => {
    setEditingRate(rate);
    form.setFieldsValue({ month: rate.month, year: rate.year, rate: rate.rate });
    setModalOpen(true);
  };

  const handleSubmit = async (values: ExchangeRateCreate) => {
    setSubmitting(true);
    try {
      if (editingRate) {
        const response = await fetch(
          `/api/v1/finance/exchange-rates/${editingRate.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ rate: values.rate }),
          }
        );
        if (response.ok) {
          message.success("Rate updated");
          setModalOpen(false);
          invalidateExchangeRates();
        } else {
          const error = await response.json();
          message.error(error.detail || "Update failed");
        }
      } else {
        const response = await fetch("/api/v1/finance/exchange-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(values),
        });
        if (response.ok) {
          message.success("Rate created");
          setModalOpen(false);
          invalidateExchangeRates();
        } else {
          const error = await response.json();
          message.error(error.detail || "Creation failed");
        }
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rate: ExchangeRate) => {
    try {
      const response = await fetch(
        `/api/v1/finance/exchange-rates/${rate.id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (response.ok) {
        message.success("Rate deleted");
        invalidateExchangeRates();
      } else {
        message.error("Delete failed");
      }
    } catch {
      message.error("Network error");
    }
  };

  const columns: ColumnsType<ExchangeRate> = [
    {
      title: "Month",
      key: "month",
      width: 120,
      render: (_, record) => (
        <div style={{ fontWeight: 600 }}>{MONTHS[record.month - 1]}</div>
      ),
    },
    {
      title: "Year",
      dataIndex: "year",
      key: "year",
      width: 100,
      sorter: (a, b) => a.year * 100 + a.month - (b.year * 100 + b.month),
      defaultSortOrder: "descend",
    },
    {
      title: "Rate (1 USD = X TZS)",
      dataIndex: "rate",
      key: "rate",
      align: "right",
      render: (rate: number) => (
        <div style={{ fontWeight: 600 }}>
          {new Intl.NumberFormat("en-TZ", { minimumFractionDigits: 2 }).format(rate)}
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
              aria-label="Edit Exchange Rate"
            />
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
              aria-label="Delete Exchange Rate"
            />
          </Space>
        </div>
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  return (
    <div style={{ padding: "24px", minHeight: "100vh", background: "#f0f2f5" }}>
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
                Exchange Rates (USD → TZS)
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
              {(user?.role === "finance" || user?.role === "admin" || user?.is_superuser) && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreate}
                >
                  Set Rate
                </Button>
              )}
            </Space>
          </div>
          <Table<ExchangeRate>
            columns={resizableColumns}
            components={components}
            dataSource={rates}
            rowKey="id"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            rowSelection={getStandardRowSelection(
              currentPage,
              pageSize,
              selectedRowKeys,
              setSelectedRowKeys
            )}
            pagination={{
              current: currentPage,
              pageSize,
              total: rates.length, // Client-side pagination
              showTotal: (total) => `Total ${total} rates`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
          />
        </Space>
      </Card>

      <Modal
        title={editingRate ? "Edit Exchange Rate" : "Set Exchange Rate"}
        open={modalOpen}
        width={600}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Form.Item
              name="month"
              label="Month"
              rules={[{ required: true }]}
            >
              <Select disabled={!!editingRate}>
                {MONTHS.map((name, idx) => (
                  <Select.Option key={idx + 1} value={idx + 1}>
                    {name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="year"
              label="Year"
              rules={[{ required: true }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={2020}
                max={2100}
                disabled={!!editingRate}
              />
            </Form.Item>
          </div>
          <Form.Item
            name="rate"
            label="Rate (1 USD = X TZS)"
            rules={[
              { required: true, message: "Please enter the rate" },
              { type: "number", min: 1, message: "Rate must be > 0" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={1}
              precision={2}
              placeholder="e.g. 2600.00"
              {...amountInputProps}
            />
          </Form.Item>
          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingRate ? "Update" : "Create"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}