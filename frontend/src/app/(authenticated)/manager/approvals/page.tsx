"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Select,
  Typography,
  App,
  Modal,
  Input,
  Flex,
} from "antd";
import {
  PlayCircleOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ExpenseRequest, ExpenseStatus, ExpenseRequestDetailed } from "@/types/expense";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenses, useInvalidateQueries } from "@/hooks/useApi";
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
const { TextArea } = Input;

const STATUS_FILTERS = EXPENSE_STATUS_FILTERS;

function ApprovalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { message, modal } = App.useApp();
  const { invalidateExpenses } = useInvalidateQueries();

  // Initialise from URL (AC-3, Story 6.17)
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus>(
    (searchParams.get("status") as ExpenseStatus) || "Pending Manager"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    searchParams.get("category") || ""
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewExpense, setReviewExpense] = useState<ExpenseRequestDetailed | null>(null);
  const [loadingExpense, setLoadingExpense] = useState(false);

  // Bulk action state
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentModalAction, setCommentModalAction] = useState<"reject" | "return">("reject");
  const [bulkComment, setBulkComment] = useState("");

  // Server-side paginated query
  const isAuthenticated = !!user;
  const { data: apiResponse, isLoading: loading, refetch } = useExpenses(
    { skip: (currentPage - 1) * pageSize, limit: pageSize, status: statusFilter, category: categoryFilter || undefined },
    isAuthenticated,
  );
  const expenses: ExpenseRequest[] = apiResponse?.data || [];
  const totalCount = apiResponse?.count || 0;

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
    refetch();
  };

  // Determine actions based on the expense status
  const getActions = (): string[] => {
    if (!reviewExpense) return [];
    if (reviewExpense.status === "Pending Manager") {
      return ["approve", "reject", "return"];
    }
    return [];
  };

  // -- Bulk actions --

  const getSelectedExpenses = (): ExpenseRequest[] => {
    const keySet = new Set(selectedRowKeys.map(String));
    return expenses.filter((e) => keySet.has(String(e.id)));
  };

  const handleBulkAction = async (status: string, comment?: string) => {
    const selected = getSelectedExpenses();
    if (selected.length === 0) {
      message.warning("No expenses selected");
      return;
    }

    // Confirm destructive actions
    if (status === "Rejected" || status === "Returned") {
      const label = status === "Rejected" ? "reject" : "return";
      modal.confirm({
        title: `Batch ${label} ${selected.length} expense${selected.length > 1 ? "s" : ""}?`,
        content: status === "Rejected"
          ? "This action cannot be undone."
          : "Expenses will be sent back for correction.",
        okText: `Yes, ${label}`,
        okType: status === "Rejected" ? "danger" : "primary",
        onOk: () => executeBulkAction(status, selected, comment),
      });
      return;
    }

    await executeBulkAction(status, selected, comment);
  };

  const executeBulkAction = async (status: string, selected: ExpenseRequest[], comment?: string) => {
    setBulkProcessing(true);
    try {
      const body: Record<string, unknown> = {
        ids: selected.map((e) => e.id),
        status,
      };
      if (comment?.trim()) body.comment = comment.trim();
      const response = await fetch("/api/v1/expenses/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const label = status === "Pending Finance" ? "approved" : status === "Rejected" ? "rejected" : "returned";
        message.success(`${selected.length} expense${selected.length > 1 ? "s" : ""} ${label}`);
        setSelectedRowKeys([]);
        refetch();
      } else {
        const err = await response.json();
        message.error(err.detail || "Batch update failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBatchApprove = () => {
    const pendingManager = getSelectedExpenses().filter((e) => e.status === "Pending Manager");
    if (pendingManager.length === 0) {
      message.warning("Select at least one Pending Manager expense");
      return;
    }
    if (pendingManager.length < getSelectedExpenses().length) {
      modal.confirm({
        title: "Some selected expenses are not Pending Manager",
        content: `Only ${pendingManager.length} of ${getSelectedExpenses().length} selected expenses can be approved. Continue?`,
        onOk: () => {
          // Temporarily update selection to only pending ones
          const keySet = new Set(pendingManager.map((e) => String(e.id)));
          setSelectedRowKeys(selectedRowKeys.filter((k) => keySet.has(String(k))));
          executeBulkAction("Pending Finance", pendingManager);
        },
      });
      return;
    }
    executeBulkAction("Pending Finance", pendingManager);
  };

  const openCommentModal = (action: "reject" | "return") => {
    const selected = getSelectedExpenses();
    if (selected.length === 0) {
      message.warning("No expenses selected");
      return;
    }
    setCommentModalAction(action);
    setBulkComment("");
    setCommentModalOpen(true);
  };

  const handleCommentModalSubmit = () => {
    const targetStatus = commentModalAction === "reject" ? "Rejected" : "Returned";
    handleBulkAction(targetStatus, bulkComment);
    setCommentModalOpen(false);
    setBulkComment("");
  };

  const hasPendingSelection = selectedRowKeys.length > 0 &&
    getSelectedExpenses().some((e) => e.status === "Pending Manager");

  const columns: ColumnsType<ExpenseRequest> = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 140,
      render: (num: string | null, record: ExpenseRequest) => (
        <a
          onClick={() => openReviewModal(record)}
          style={{ fontWeight: 600, color: "var(--color-primary)", cursor: "pointer" }}
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
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", padding: "var(--space-xl)" }}>
      <Card>
        <Flex vertical gap="middle" style={{ width: "100%" }}>
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
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
            </Space>
          </div>

          {/* Bulk Action Bar */}
          {selectedRowKeys.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 16px",
                background: "var(--color-surface)",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
              }}
            >
              <Text strong>{selectedRowKeys.length} selected</Text>
              <Space>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleBatchApprove}
                  loading={bulkProcessing}
                  disabled={!hasPendingSelection}
                  style={{
                    background: hasPendingSelection ? "var(--color-green)" : undefined,
                    borderColor: hasPendingSelection ? "var(--color-green)" : undefined,
                  }}
                >
                  Batch Approve
                </Button>
                <Button
                  icon={<UndoOutlined />}
                  onClick={() => openCommentModal("return")}
                  loading={bulkProcessing}
                  style={{ color: "var(--color-orange)", borderColor: "var(--color-orange)" }}
                >
                  Return
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => openCommentModal("reject")}
                  loading={bulkProcessing}
                >
                  Reject
                </Button>
                <Button onClick={() => setSelectedRowKeys([])}>
                  Clear Selection
                </Button>
              </Space>
            </div>
          )}

          {/* Table */}
          <Table<ExpenseRequest>
            columns={resizableColumns}
            components={components}
            dataSource={expenses}
            rowKey="id"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            scroll={{ x: "max-content" }}
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
        </Flex>
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

      {/* Bulk Comment Modal */}
      <Modal
        title={commentModalAction === "reject" ? "Reject Expenses" : "Return Expenses"}
        open={commentModalOpen}
        onCancel={() => { setCommentModalOpen(false); setBulkComment(""); }}
        onOk={handleCommentModalSubmit}
        okText={commentModalAction === "reject" ? "Reject" : "Return"}
        okButtonProps={{
          danger: commentModalAction === "reject",
          loading: bulkProcessing,
          style: commentModalAction === "return"
            ? { color: "var(--color-orange)", borderColor: "var(--color-orange)" }
            : undefined,
        }}
        confirmLoading={bulkProcessing}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">
            {commentModalAction === "reject"
              ? `Reject ${selectedRowKeys.length} expense${selectedRowKeys.length > 1 ? "s" : ""}. Provide a reason:`
              : `Return ${selectedRowKeys.length} expense${selectedRowKeys.length > 1 ? "s" : ""} for correction. What needs to be fixed?`}
          </Text>
        </div>
        <TextArea
          rows={3}
          value={bulkComment}
          onChange={(e) => setBulkComment(e.target.value)}
          placeholder={commentModalAction === "reject"
            ? "e.g. Not a valid business expense"
            : "e.g. Attach receipt, correct amount"}
        />
      </Modal>
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
