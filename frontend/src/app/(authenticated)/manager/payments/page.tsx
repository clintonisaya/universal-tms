"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Statistic,
  Typography,
  App,
} from "antd";
import {
  PlayCircleOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ExpenseRequest, ExpenseStatus, ExpenseRequestDetailed } from "@/types/expense";
import { useAuth } from "@/contexts/AuthContext";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { ExpenseReviewModal } from "@/components/expenses/ExpenseReviewModal";
import { CATEGORY_FILTERS } from "@/constants/expenseConstants";

const { Title, Text } = Typography;


function PaymentsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewExpense, setReviewExpense] = useState<ExpenseRequestDetailed | null>(null);
  const [loadingExpense, setLoadingExpense] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", String(pageSize));
      params.append("skip", String((currentPage - 1) * pageSize));
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
  }, [router, message, currentPage, pageSize]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user, fetchExpenses]);

  const openReviewModal = async (record: ExpenseRequest) => {
    setLoadingExpense(true);
    setReviewModalOpen(true);
    try {
      const response = await fetch(`/api/v1/expenses/${record.id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setReviewExpense(data);
      } else {
        message.error("Failed to load expense details");
        setReviewModalOpen(false);
      }
    } catch {
      message.error("Network error");
      setReviewModalOpen(false);
    } finally {
      setLoadingExpense(false);
    }
  };

  const handleActionComplete = () => {
    setReviewModalOpen(false);
    setReviewExpense(null);
    fetchExpenses();
  };

  // Story 6.12: Group totals by currency — avoids misleading mixed-currency sum
  const totalsByCurrency = expenses.reduce((acc, e) => {
    const cur = e.currency || "TZS";
    acc[cur] = (acc[cur] || 0) + Number(e.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  const columns: ColumnsType<ExpenseRequest> = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 140,
      render: (num: string | null, record: ExpenseRequest) => (
        <a
          onClick={() => openReviewModal(record)}
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
            {cur} {Number(amount).toLocaleString("en-US")}
          </div>
        );
      },
      sorter: (a, b) => Number(a.amount) - Number(b.amount),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 260,
      render: (status: ExpenseStatus) => <ExpenseStatusBadge status={status} />,
    },
    {
      title: "",
      key: "actions",
      width: 90,
      fixed: "right",
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => openReviewModal(record)}
        >
          Review
        </Button>
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", padding: "var(--space-xl)" }}>
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
              {Object.entries(totalsByCurrency).map(([cur, total]) => (
                <Statistic
                  key={cur}
                  title={`Pending (${cur})`}
                  value={total}
                  precision={2}
                  prefix={cur}
                  style={{ marginRight: 16 }}
                />
              ))}
              {Object.keys(totalsByCurrency).length === 0 && (
                <Statistic title="Pending Total" value={0} prefix="TZS" style={{ marginRight: 16 }} />
              )}
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
            scroll={{ x: "max-content" }}
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

      {/* Expense Review Modal with inline payment form + return action */}
      <ExpenseReviewModal
        open={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setReviewExpense(null);
        }}
        expense={reviewExpense}
        actions={["pay", "return"]}
        loading={loadingExpense}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}

export default function FinancePaymentsPage() {
  return (
    <App>
      <PaymentsPageContent />
    </App>
  );
}
