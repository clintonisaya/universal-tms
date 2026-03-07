"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Select,
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
import { EmptyState } from "@/components/ui";
import { CATEGORY_FILTERS, EXPENSE_STATUS_FILTERS, CATEGORY_OPTIONS, STATUS_OPTIONS } from "@/constants/expenseConstants";

const { Title, Text } = Typography;

const STATUS_FILTERS = EXPENSE_STATUS_FILTERS;

function ApprovalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  // Initialise from URL (AC-3, Story 6.17)
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus>(
    (searchParams.get("status") as ExpenseStatus) || "Pending Manager"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.get("category") || ""
  );
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
      params.append("limit", "100");
      params.append("skip", "0");
      if (statusFilter) params.append("status", statusFilter);
      if (categoryFilter) params.append("category", categoryFilter);

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
  }, [router, statusFilter, categoryFilter, message]);

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

  // Determine actions based on the expense status
  const getActions = (): string[] => {
    if (!reviewExpense) return [];
    if (reviewExpense.status === "Pending Manager") {
      return ["approve", "reject", "return"];
    }
    return [];
  };

  const columns: ColumnsType<ExpenseRequest> = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 140,
      render: (num: string | null, record: ExpenseRequest) => (
        <a
          onClick={() => openReviewModal(record)}
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
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : "-"),
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
      width: 220,
      render: (status: ExpenseStatus) => <ExpenseStatusBadge status={status} />,
      ...getColumnFilterProps("status", STATUS_FILTERS),
    },
    {
      title: "Comment",
      dataIndex: "manager_comment",
      key: "manager_comment",
      width: 160,
      ellipsis: true,
      render: (comment: string | null) => comment || "-",
    },
    {
      title: "",
      key: "actions",
      width: 90,
      fixed: "right",
      render: (_, record) =>
        record.status === "Pending Manager" ? (
          <Button
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => openReviewModal(record)}
          >
            Review
          </Button>
        ) : null,
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
                Expense Approvals
              </Title>
            </Space>
            <Space wrap>
              <Select
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  const params = new URLSearchParams(searchParams.toString());
                  if (val) params.set("status", val); else params.delete("status");
                  router.replace(`?${params.toString()}`, { scroll: false });
                }}
                style={{ width: 180 }}
                options={STATUS_OPTIONS}
                allowClear
                placeholder="Filter by Status"
              />
              <Select
                value={categoryFilter || undefined}
                onChange={(val) => {
                  setCategoryFilter(val || "");
                  const params = new URLSearchParams(searchParams.toString());
                  if (val) params.set("category", val); else params.delete("category");
                  router.replace(`?${params.toString()}`, { scroll: false });
                }}
                style={{ width: 160 }}
                options={CATEGORY_OPTIONS}
                allowClear
                placeholder="Filter by Category"
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
            locale={{
              emptyText:
                statusFilter === "Pending Manager" && !categoryFilter ? (
                  <EmptyState message="All caught up! No pending approvals." />
                ) : (
                  <EmptyState
                    message="No results match your filters."
                    action={{
                      label: "Clear Filters",
                      onClick: () => {
                        setStatusFilter("Pending Manager");
                        setCategoryFilter("");
                        router.replace("?", { scroll: false });
                      },
                    }}
                  />
                ),
            }}
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

      {/* Expense Review Modal with approve/reject/return actions */}
      <ExpenseReviewModal
        open={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setReviewExpense(null);
        }}
        expense={reviewExpense}
        actions={getActions()}
        loading={loadingExpense}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}

export default function ApprovalPage() {
  return (
    <App>
      <Suspense>
        <ApprovalPageContent />
      </Suspense>
    </App>
  );
}
