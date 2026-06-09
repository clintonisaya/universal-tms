"use client";

import { useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns, ActionType } from "@ant-design/pro-components";
import { Button, App, Modal, Input, Space, Typography } from "antd";
import {
  PlayCircleOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import type {
  ExpenseRequest,
  ExpenseStatus,
  ExpenseRequestDetailed,
} from "@/types/expense";
import { useAuth } from "@/contexts/AuthContext";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { ExpenseReviewModal } from "@/components/expenses/ExpenseReviewModal";
import {
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
} from "@/constants/expenseConstants";

const { Text } = Typography;
const { TextArea } = Input;

function ApprovalPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { message, modal } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  // Initialise from URL
  const initialStatus =
    (searchParams.get("status") as ExpenseStatus) || "Pending Manager";
  const initialCategory = searchParams.get("category") || "";

  const [statusFilter, setStatusFilter] =
    useState<ExpenseStatus>(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedExpenses, setSelectedExpenses] = useState<ExpenseRequest[]>(
    []
  );

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewExpense, setReviewExpense] =
    useState<ExpenseRequestDetailed | null>(null);
  const [loadingExpense, setLoadingExpense] = useState(false);

  // Bulk action state
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentModalAction, setCommentModalAction] = useState<
    "reject" | "return"
  >("reject");
  const [bulkComment, setBulkComment] = useState("");

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
    actionRef.current?.reload();
  };

  const getActions = (): string[] => {
    if (!reviewExpense) return [];
    if (reviewExpense.status === "Pending Manager") {
      return ["approve", "reject", "return"];
    }
    return [];
  };

  // -- Bulk actions --

  const executeBulkAction = async (
    status: string,
    selected: ExpenseRequest[],
    comment?: string
  ) => {
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
        const label =
          status === "Pending Finance"
            ? "approved"
            : status === "Rejected"
              ? "rejected"
              : "returned";
        message.success(
          `${selected.length} expense${selected.length > 1 ? "s" : ""} ${label}`
        );
        setSelectedRowKeys([]);
        setSelectedExpenses([]);
        actionRef.current?.reload();
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

  const handleBulkAction = async (status: string, comment?: string) => {
    if (selectedExpenses.length === 0) {
      message.warning("No expenses selected");
      return;
    }

    if (status === "Rejected" || status === "Returned") {
      const label = status === "Rejected" ? "reject" : "return";
      modal.confirm({
        title: `Batch ${label} ${selectedExpenses.length} expense${selectedExpenses.length > 1 ? "s" : ""}?`,
        content:
          status === "Rejected"
            ? "This action cannot be undone."
            : "Expenses will be sent back for correction.",
        okText: `Yes, ${label}`,
        okType: status === "Rejected" ? "danger" : "primary",
        onOk: () => executeBulkAction(status, selectedExpenses, comment),
      });
      return;
    }

    await executeBulkAction(status, selectedExpenses, comment);
  };

  const handleBatchApprove = () => {
    const pendingManager = selectedExpenses.filter(
      (e) => e.status === "Pending Manager"
    );
    if (pendingManager.length === 0) {
      message.warning("Select at least one Pending Manager expense");
      return;
    }
    if (pendingManager.length < selectedExpenses.length) {
      modal.confirm({
        title: "Some selected expenses are not Pending Manager",
        content: `Only ${pendingManager.length} of ${selectedExpenses.length} selected expenses can be approved. Continue?`,
        onOk: () => executeBulkAction("Pending Finance", pendingManager),
      });
      return;
    }
    executeBulkAction("Pending Finance", pendingManager);
  };

  const openCommentModal = (action: "reject" | "return") => {
    if (selectedExpenses.length === 0) {
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

  const hasPendingSelection = selectedExpenses.some(
    (e) => e.status === "Pending Manager"
  );

  const columns: ProColumns<ExpenseRequest>[] = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 140,
      fieldProps: { placeholder: "Search expense number" },
      render: (_, record) => (
        <a
          onClick={() => openReviewModal(record)}
          style={{
            fontWeight: 600,
            color: "var(--ant-color-primary)",
            cursor: "pointer",
          }}
        >
          {record.expense_number || record.id?.slice(0, 8).toUpperCase()}
        </a>
      ),
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 110,
      valueType: "date",
      search: false,
      sorter: true,
      render: (_, record) =>
        record.created_at
          ? new Date(record.created_at).toLocaleDateString()
          : "-",
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 120,
      valueType: "select",
      valueEnum: Object.fromEntries(
        CATEGORY_OPTIONS.map((o) => [o.value, { text: o.label }])
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      fieldProps: { placeholder: "Search description" },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      align: "right",
      search: false,
      sorter: true,
      render: (_, record) => {
        const cur = record.currency || "TZS";
        return (
          <div style={{ fontWeight: 600 }}>
            {cur} {Number(record.amount).toLocaleString("en-US")}
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 220,
      valueType: "select",
      valueEnum: Object.fromEntries(
        STATUS_OPTIONS.map((o) => [o.value, { text: o.label }])
      ),
      render: (_, record) => <ExpenseStatusBadge status={record.status} />,
    },
    {
      title: "Comment",
      dataIndex: "manager_comment",
      key: "manager_comment",
      width: 160,
      ellipsis: true,
      search: false,
      render: (_, record) => record.manager_comment || "-",
    },
    {
      title: "",
      key: "actions",
      width: 90,
      valueType: "option",
      search: false,
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

  return (
    <>
      <ProTable<ExpenseRequest>
        headerTitle="Expense Approvals"
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        request={async (params, sort) => {
          if (!user) return { data: [], total: 0, success: false };

          const currentPage = params.current ?? 1;
          const size = params.pageSize ?? 20;
          const skip = (currentPage - 1) * size;

          const queryParams = new URLSearchParams();
          queryParams.set("skip", String(skip));
          queryParams.set("limit", String(size));
          queryParams.set("status", statusFilter);
          if (categoryFilter) queryParams.set("category", categoryFilter);

          // Column-level filters from ProTable
          if (params.expense_number) {
            queryParams.set(
              "expense_number",
              String(params.expense_number)
            );
          }
          if (params.description) {
            queryParams.set("description", String(params.description));
          }
          if (params.category && !categoryFilter) {
            queryParams.set("category", String(params.category));
          }

          try {
            const response = await fetch(
              `/api/v1/expenses/?${queryParams.toString()}`,
              { credentials: "include" }
            );
            if (!response.ok) {
              if (response.status === 401) router.push("/login");
              return { data: [], total: 0, success: false };
            }
            const result = await response.json();
            let data: ExpenseRequest[] = (result.data ?? []) as ExpenseRequest[];

            // Client-side search filters
            if (params.expense_number) {
              const search = String(params.expense_number).toLowerCase();
              data = data.filter((e) =>
                (e.expense_number ?? "").toLowerCase().includes(search)
              );
            }
            if (params.description) {
              const search = String(params.description).toLowerCase();
              data = data.filter((e) =>
                (e.description ?? "").toLowerCase().includes(search)
              );
            }

            // Client-side sort
            if (sort && sort.created_at) {
              data.sort((a, b) => {
                const aDate = a.created_at ?? "";
                const bDate = b.created_at ?? "";
                return sort.created_at === "ascend"
                  ? aDate.localeCompare(bDate)
                  : bDate.localeCompare(aDate);
              });
            }
            if (sort && sort.amount) {
              data.sort((a, b) =>
                sort.amount === "ascend"
                  ? Number(a.amount) - Number(b.amount)
                  : Number(b.amount) - Number(a.amount)
              );
            }

            return {
              data,
              total: result.count ?? data.length,
              success: true,
            };
          } catch {
            message.error("Network error");
            return { data: [], total: 0, success: false };
          }
        }}
        search={{ labelWidth: "auto", defaultCollapsed: true }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total) => `Total ${total} expenses`,
        }}
        scroll={{ x: "max-content" }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys, rows) => {
            setSelectedRowKeys(keys);
            setSelectedExpenses(rows);
          },
        }}
        tableAlertRender={({ selectedRowKeys: keys }) =>
          keys.length > 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "4px 0",
              }}
            >
              <Text strong>{keys.length} selected</Text>
              <Space>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleBatchApprove}
                  loading={bulkProcessing}
                  disabled={!hasPendingSelection}
                  size="small"
                >
                  Batch Approve
                </Button>
                <Button
                  icon={<UndoOutlined />}
                  onClick={() => openCommentModal("return")}
                  loading={bulkProcessing}
                  size="small"
                >
                  Return
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => openCommentModal("reject")}
                  loading={bulkProcessing}
                  size="small"
                >
                  Reject
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedRowKeys([]);
                    setSelectedExpenses([]);
                  }}
                >
                  Clear
                </Button>
              </Space>
            </div>
          ) : null
        }
        tableAlertOptionRender={false}
        toolBarRender={() => [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            Refresh
          </Button>,
        ]}
        params={{
          statusFilter,
          categoryFilter,
        }}
      />

      {/* Expense Review Modal */}
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
        title={
          commentModalAction === "reject"
            ? "Reject Expenses"
            : "Return Expenses"
        }
        open={commentModalOpen}
        onCancel={() => {
          setCommentModalOpen(false);
          setBulkComment("");
        }}
        onOk={handleCommentModalSubmit}
        okText={commentModalAction === "reject" ? "Reject" : "Return"}
        okButtonProps={{
          danger: commentModalAction === "reject",
          loading: bulkProcessing,
        }}
        confirmLoading={bulkProcessing}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">
            {commentModalAction === "reject"
              ? `Reject ${selectedExpenses.length} expense${selectedExpenses.length > 1 ? "s" : ""}. Provide a reason:`
              : `Return ${selectedExpenses.length} expense${selectedExpenses.length > 1 ? "s" : ""} for correction. What needs to be fixed?`}
          </Text>
        </div>
        <TextArea
          rows={3}
          value={bulkComment}
          onChange={(e) => setBulkComment(e.target.value)}
          placeholder={
            commentModalAction === "reject"
              ? "e.g. Not a valid business expense"
              : "e.g. Attach receipt, correct amount"
          }
        />
      </Modal>
    </>
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
