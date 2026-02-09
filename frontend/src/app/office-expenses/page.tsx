"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Typography,
  Spin,
} from "antd";
import {
  ReloadOutlined,
  PlusOutlined,
  DollarOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ExpenseRequestDetailed, ExpenseStatus } from "@/types/expense";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenses, useInvalidateQueries } from "@/hooks/useApi";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { PaymentModal } from "@/components/expenses/PaymentModal";
import { ExpenseDetailModal } from "@/components/expenses/ExpenseDetailModal";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title } = Typography;

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  "Pending Manager": "orange",
  "Pending Finance": "blue",
  "Paid": "green",
  "Rejected": "red",
  "Returned": "purple",
};

export default function OfficeExpensesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { invalidateExpenses } = useInvalidateQueries();

  // TanStack Query for expenses data
  const { data: expensesData, isLoading: loading, refetch } = useExpenses();

  // Filter to show only office expenses (expense_number starts with "EXP")
  const expenses = useMemo(() => {
    const allExpenses = (expensesData?.data || []) as ExpenseRequestDetailed[];
    return allExpenses.filter(
      (e: ExpenseRequestDetailed) => e.expense_number?.startsWith("EXP")
    );
  }, [expensesData]);

  const totalCount = expenses.length;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequestDetailed | null>(null);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<ExpenseRequestDetailed | null>(null);

  const handleViewDetail = (record: ExpenseRequestDetailed) => {
    setDetailExpense(record);
    setDetailModalOpen(true);
  };

  const handlePay = (record: ExpenseRequestDetailed) => {
    setSelectedExpense(record);
    setPaymentModalOpen(true);
  };

  const handlePrint = (id: string) => {
    window.open(`/finance/vouchers/${id}`, '_blank');
  };

  const columns: ColumnsType<ExpenseRequestDetailed> = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 140,
      render: (num: string | null, record: ExpenseRequestDetailed) => (
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
      render: (date: string | null) =>
        date ? new Date(date).toLocaleDateString() : "-",
      sorter: (a, b) => {
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      },
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
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 220,
      render: (status: ExpenseStatus) => <ExpenseStatusBadge status={status} />,
      ...getColumnFilterProps("status", Object.keys(STATUS_COLORS).map((s) => ({ text: s, value: s }))),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
          <Space size="small">
            {(user?.role === "finance" || user?.role === "admin") &&
              record.status === "Pending Finance" && (
                <Button
                  type="primary"
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => handlePay(record)}
                >
                  Pay
                </Button>
              )}

            {record.status === "Paid" && (
              <Button
                type="default"
                size="small"
                icon={<PrinterOutlined />}
                onClick={() => handlePrint(record.id)}
              />
            )}
          </Space>
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
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "24px",
      }}
    >
      <Card>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Title level={2} style={{ margin: 0 }}>
              Office Expenses
            </Title>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsModalOpen(true)}
              >
                New Office Expense
              </Button>
            </Space>
          </div>

          <Table<ExpenseRequestDetailed>
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
              showTotal: (total) => `Total ${total} expenses`,
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
      
      <AddExpenseModal 
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => invalidateExpenses()}
      />

      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={() => invalidateExpenses()}
        expense={selectedExpense}
      />

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