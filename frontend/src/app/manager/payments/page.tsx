"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  message,
  Modal,
  Form,
  Input,
  Radio,
  Typography,
  Spin,
  Statistic,
} from "antd";
import {
  DollarOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ExpenseRequest, PaymentMethod } from "@/types/expense";
import { useAuth } from "@/contexts/AuthContext";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { ExpenseDetailModal } from "@/components/expenses/ExpenseDetailModal";
import type { ExpenseStatus, ExpenseRequestDetailed } from "@/types/expense";

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  "Pending Manager": "orange",
  "Pending Finance": "blue",
  Paid: "green",
  Rejected: "red",
  Returned: "purple",
};

const CATEGORY_FILTERS = [
  { text: "Fuel", value: "Fuel" },
  { text: "Allowance", value: "Allowance" },
  { text: "Maintenance", value: "Maintenance" },
  { text: "Office", value: "Office" },
  { text: "Border", value: "Border" },
  { text: "Other", value: "Other" },
];

interface PaymentFormValues {
  method: PaymentMethod;
  reference?: string;
}

export default function FinancePaymentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [form] = Form.useForm<PaymentFormValues>();
  const paymentMethod = Form.useWatch("method", form);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<ExpenseRequestDetailed | null>(null);

  const handleViewDetail = (record: ExpenseRequest) => {
    setDetailExpense(record as ExpenseRequestDetailed);
    setDetailModalOpen(true);
  };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", "100");
      params.append("skip", "0");
      params.append("status", "Pending Finance");

      const response = await fetch(`/api/v1/expenses/?${params.toString()}`, {
        credentials: "include",
      });
      if (response.ok) {
        const result = await response.json();
        setExpenses(result.data);
        setTotalCount(result.count);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        message.error("Failed to fetch expenses");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchExpenses();
    }
  }, [authLoading, user, fetchExpenses]);

  const openPaymentModal = (expense: ExpenseRequest) => {
    setSelectedExpense(expense);
    form.resetFields();
    form.setFieldsValue({ method: "CASH" });
    setModalVisible(true);
  };

  const handlePayment = async (values: PaymentFormValues) => {
    if (!selectedExpense) return;

    setProcessing(true);
    try {
      const body: { method: string; reference?: string } = {
        method: values.method,
      };
      if (values.method === "TRANSFER" && values.reference) {
        body.reference = values.reference;
      }

      const response = await fetch(
        `/api/v1/expenses/${selectedExpense.id}/payment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );

      if (response.ok) {
        message.success("Payment processed successfully");
        setModalVisible(false);
        setSelectedExpense(null);
        form.resetFields();
        fetchExpenses();
      } else {
        const error = await response.json();
        message.error(error.detail || "Payment processing failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setProcessing(false);
    }
  };

  const totalPending = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const columns: ColumnsType<ExpenseRequest> = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 140,
      render: (num: string | null, record: ExpenseRequest) => (
        <a
          onClick={() => handleViewDetail(record)}
          style={{ fontWeight: 600, color: "#1890ff", cursor: "pointer" }}
        >
          {num || record.id?.slice(0, 8).toUpperCase()}
        </a>
      ),
      ...getColumnSearchProps("expense_number"),
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 110,
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString() : "-",
      sorter: (a, b) => (a.created_at || "").localeCompare(b.created_at || ""),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 120,
      ...getColumnFilterProps("category", CATEGORY_FILTERS),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      ...getColumnSearchProps("description"),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      align: "right",
      render: (amount: number, record) => {
        const cur = record.currency || "TZS";
        return (
          <div style={{ fontWeight: 600 }}>
            {cur} {Number(amount).toLocaleString()}
          </div>
        );
      },
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 220,
      render: (status: ExpenseStatus) => <ExpenseStatusBadge status={status} />,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
          <Button
            type="primary"
            icon={<DollarOutlined />}
            size="small"
            onClick={() => openPaymentModal(record)}
          >
            Pay
          </Button>
        </div>
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: "24px" }}>
      <Card>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
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
                Finance Payments
              </Title>
            </Space>
            <Space>
              <Statistic
                title="Pending Total"
                value={totalPending}
                precision={2}
                prefix="TZS"
                style={{ marginRight: 24 }}
              />
              <Button icon={<ReloadOutlined />} onClick={fetchExpenses}>
                Refresh
              </Button>
            </Space>
          </div>

          {/* Table */}
          <Table<ExpenseRequest>
            columns={resizableColumns}
            components={components}
            dataSource={expenses}
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
              total: totalCount,
              showTotal: (total) => `Total ${total} pending expenses`,
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

      {/* Payment Modal */}
      <Modal
        title={`Process Payment — ${selectedExpense?.description || ""}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedExpense(null);
          form.resetFields();
        }}
        footer={null}
        forceRender
      >
        {selectedExpense && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Amount: </Text>
            <Text strong>
              {selectedExpense.currency || "TZS"} {Number(selectedExpense.amount).toLocaleString()}
            </Text>
          </div>
        )}

        <Form<PaymentFormValues>
          form={form}
          layout="vertical"
          onFinish={handlePayment}
          initialValues={{ method: "CASH" }}
        >
          <Form.Item
            name="method"
            label="Payment Method"
            rules={[{ required: true, message: "Please select a payment method" }]}
          >
            <Radio.Group>
              <Radio.Button value="CASH">Cash</Radio.Button>
              <Radio.Button value="TRANSFER">Transfer</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {paymentMethod === "TRANSFER" && (
            <Form.Item
              name="reference"
              label="Reference Number"
              rules={[
                {
                  required: true,
                  message: "Reference Number is required for transfers",
                },
              ]}
            >
              <Input placeholder="e.g. Bank Transaction ID" />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setSelectedExpense(null);
                  form.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={processing}>
                Confirm Payment
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailExpense(null);
        }}
        expense={detailExpense}
      />
    </div>
  );
}
