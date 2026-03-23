"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Typography,
  message,
  Tooltip,
} from "antd";
import {
  ReloadOutlined,
  PlusOutlined,
  PrinterOutlined,
  HistoryOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ExpenseRequestDetailed, ExpenseStatus } from "@/types/expense";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenses, useInvalidateQueries } from "@/hooks/useApi";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";

import { ExpenseReviewModal } from "@/components/expenses/ExpenseReviewModal";
import { ExpenseHistoryModal } from "@/components/expenses/ExpenseHistoryModal";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { OfficePaymentPrintLayout } from "@/components/expenses/OfficePaymentPrintLayout";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";
import { EmptyState } from "@/components/ui";

const { Title } = Typography;

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  "Pending Manager": "orange",
  "Pending Finance": "blue",
  "Paid": "green",
  "Rejected": "red",
  "Returned": "purple",
  "Voided": "red",
};

const STATUS_FILTERS = Object.keys(STATUS_COLORS).map((status) => ({
  text: status,
  value: status,
}));

export default function OfficeExpensesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { invalidateExpenses } = useInvalidateQueries();

  // TanStack Query for expenses data
  const { data: expensesData, isLoading: loading, refetch } = useExpenses();

  // Filter to show only office expenses (expense_number starts with "EX")
  // Matches both old format (EXP-2026-0001) and new format (EX-2026-0001)
  const expenses = useMemo(() => {
    const allExpenses = (expensesData?.data || []) as ExpenseRequestDetailed[];
    return allExpenses.filter(
      (e: ExpenseRequestDetailed) => e.expense_number?.startsWith("EX")
    );
  }, [expensesData]);

  const totalCount = expenses.length;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Payment Modal State

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<ExpenseRequestDetailed | null>(null);

  // History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyExpense, setHistoryExpense] = useState<ExpenseRequestDetailed | null>(null);

  // Print Preview Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printExpenseIds, setPrintExpenseIds] = useState<string[]>([]);

  const handleViewDetail = (record: ExpenseRequestDetailed) => {
    setDetailExpense(record);
    setDetailModalOpen(true);
  };

  const handlePrint = (id: string) => {
    setPrintExpenseIds([id]);
    setPrintModalOpen(true);
  };

  // Bulk print - open print preview modal with all selected expenses
  const handleBulkPrint = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select expenses to print");
      return;
    }
    setPrintExpenseIds(selectedRowKeys as string[]);
    setPrintModalOpen(true);
  };

  const handleViewHistory = (record: ExpenseRequestDetailed) => {
    setHistoryExpense(record);
    setHistoryModalOpen(true);
  };

  // Check if print is allowed (after manager approval)
  const canPrint = (status: ExpenseStatus) => {
    return ["Pending Finance", "Paid"].includes(status);
  };

  const columns: ColumnsType<ExpenseRequestDetailed> = [
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<HistoryOutlined />}
            title="View History"
            aria-label="View Expense History"
            onClick={() => handleViewHistory(record)}
          />
          {canPrint(record.status) && (
            <Button
              type="text"
              size="small"
              icon={<PrinterOutlined />}
              title="Print Voucher"
              aria-label="Print Expense Voucher"
              onClick={() => handlePrint(record.id)}
            />
          )}
        </Space>
      ),
    },
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 140,
      render: (num: string | null, record: ExpenseRequestDetailed) => (
        <a
          onClick={() => handleViewDetail(record)}
          style={{ fontWeight: 600, color: "var(--color-gold)", cursor: "pointer" }}
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
            {cur} {Number(amount).toLocaleString("en-US")}
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
      ...getColumnFilterProps("status", STATUS_FILTERS),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        padding: "var(--space-xl)",
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
              {selectedRowKeys.length > 0 && (
                <Button
                  icon={<PrinterOutlined />}
                  onClick={handleBulkPrint}
                >
                  Print Selected ({selectedRowKeys.length})
                </Button>
              )}
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

          {user?.role === 'ops' && (
            <div style={{ marginBottom: 8 }}>
              <Typography.Text type="secondary">
                Showing: all trip expenses · your office expenses{' '}
                <Tooltip title="Ops users see all trip expenses and their own submitted office expenses. Managers and Finance see all office expenses.">
                  <QuestionCircleOutlined style={{ cursor: 'help' }} />
                </Tooltip>
              </Typography.Text>
            </div>
          )}

          <Table<ExpenseRequestDetailed>
            columns={resizableColumns}
            components={components}
            dataSource={expenses}
            rowKey="id"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: <EmptyState message="No office expenses found." /> }}
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

      <ExpenseReviewModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailExpense(null);
        }}
        expense={detailExpense}
      />

      <ExpenseHistoryModal
        open={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryExpense(null);
        }}
        expense={historyExpense}
      />

      <OfficePaymentPrintLayout
        open={printModalOpen}
        onClose={() => {
          setPrintModalOpen(false);
          setPrintExpenseIds([]);
        }}
        expenseIds={printExpenseIds}
      />
    </div>
  );
}
