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
  Statistic,
  Typography,
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
import { ProcessPaymentModal } from "@/components/expenses/ProcessPaymentModal";
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
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequestDetailed | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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
    if (user) {
      fetchExpenses();
    }
  }, [user, fetchExpenses]);

  const openPaymentModal = (expense: ExpenseRequest) => {
    setSelectedExpense(expense as ExpenseRequestDetailed);
    setModalVisible(true);
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
      <ProcessPaymentModal
        open={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedExpense(null);
        }}
        onSuccess={() => {
          fetchExpenses();
        }}
        expense={selectedExpense}
      />

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
