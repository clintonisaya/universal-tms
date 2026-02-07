"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import {
  Table,
  Tag,
  Button,
  Flex,
  Space,
  Select,
  Modal,
  Input,
  App,
  Empty,
  Typography,
  Tooltip,
  Card,
  Spin,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  UndoOutlined,
  DollarOutlined,
  EditOutlined,
  SmileOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ExpenseDetailModal } from "@/components/expenses/ExpenseDetailModal";
import { EditExpenseModal } from "@/components/expenses/EditExpenseModal";
import type { ExpenseRequestDetailed } from "@/types/expense";

const { Text, Title } = Typography;
const { TextArea } = Input;

interface TodoTask {
  id: string;
  task_type: string;
  entity_type: string;
  requester: string;
  amount: number;
  currency: string;
  expense_type: string;
  description: string;
  status: string;
  trip_number: string;
  expense_number: string;
  manager_comment: string;
  created_at: string;
  actions: string[];
}

const TASK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  expense_approval: { label: "Expense Approval", color: "gold" },
  payment_processing: { label: "Payment Processing", color: "blue" },
  expense_correction: { label: "Expense Correction", color: "orange" },
};

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "-";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function TasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { message } = App.useApp();
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<string>("desc");

  // Action modal state
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<string>("");
  const [actionTaskId, setActionTaskId] = useState<string>("");
  const [actionComment, setActionComment] = useState("");
  const [processing, setProcessing] = useState(false);

  // Payment modal state
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payTaskId, setPayTaskId] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("CASH");
  const [payReference, setPayReference] = useState("");

  // Expense detail modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequestDetailed | null>(null);
  const [loadingExpense, setLoadingExpense] = useState(false);

  // Edit expense modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseRequestDetailed | null>(null);

  const highlightTaskId = searchParams.get("highlight");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append("task_type", typeFilter);
      params.append("sort_by", sortBy);
      params.append("sort_order", sortOrder);

      const response = await fetch(`/api/v1/tasks/my-tasks?${params.toString()}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else if (response.status === 401) {
        router.push("/login");
      }
    } catch {
      message.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, sortBy, sortOrder, router, message]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Highlight & scroll to task row when highlightTaskId changes
  useEffect(() => {
    if (!highlightTaskId || tasks.length === 0) return;

    // Small delay to let the table render
    const scrollTimer = setTimeout(() => {
      const row = document.getElementById(`task-row-${highlightTaskId}`);
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        row.style.backgroundColor = "#fff7e6";
        highlightTimerRef.current = setTimeout(() => {
          row.style.transition = "background-color 1s ease";
          row.style.backgroundColor = "transparent";
        }, 2000);
      }
    }, 300);

    return () => {
      clearTimeout(scrollTimer);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [highlightTaskId, tasks]);

  // --- Action handlers ---

  const handleViewExpense = async (expenseId: string) => {
    setLoadingExpense(true);
    try {
      const response = await fetch(`/api/v1/expenses/${expenseId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedExpense(data);
        setDetailModalVisible(true);
      } else {
        message.error("Failed to load expense details");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoadingExpense(false);
    }
  };

  const handleApprove = async (taskId: string) => {
    setProcessing(true);
    try {
      const response = await fetch("/api/v1/expenses/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ids: [taskId],
          status: "Pending Finance",
        }),
      });
      if (response.ok) {
        message.success("Expense approved");
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else {
        const err = await response.json();
        message.error(err.detail || "Failed to approve");
      }
    } catch {
      message.error("Network error");
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (taskId: string, type: string) => {
    setActionTaskId(taskId);
    setActionType(type);
    setActionComment("");
    setActionModalVisible(true);
  };

  const handleRejectOrReturn = async () => {
    if (!actionComment.trim()) {
      message.warning("Please provide a reason");
      return;
    }
    setProcessing(true);
    try {
      const statusMap: Record<string, string> = {
        reject: "Rejected",
        return: "Returned",
      };
      const response = await fetch("/api/v1/expenses/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ids: [actionTaskId],
          status: statusMap[actionType],
          comment: actionComment,
        }),
      });
      if (response.ok) {
        message.success(`Expense ${actionType}ed`);
        setTasks((prev) => prev.filter((t) => t.id !== actionTaskId));
        setActionModalVisible(false);
      } else {
        const err = await response.json();
        message.error(err.detail || `Failed to ${actionType}`);
      }
    } catch {
      message.error("Network error");
    } finally {
      setProcessing(false);
    }
  };

  const openPayModal = (taskId: string) => {
    setPayTaskId(taskId);
    setPayMethod("CASH");
    setPayReference("");
    setPayModalVisible(true);
  };

  const handlePay = async () => {
    if (payMethod === "TRANSFER" && !payReference.trim()) {
      message.warning("Reference is required for transfers");
      return;
    }
    setProcessing(true);
    try {
      const body: { method: string; reference?: string } = { method: payMethod };
      if (payMethod === "TRANSFER") body.reference = payReference;

      const response = await fetch(`/api/v1/expenses/${payTaskId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (response.ok) {
        message.success("Payment processed");
        setTasks((prev) => prev.filter((t) => t.id !== payTaskId));
        setPayModalVisible(false);
      } else {
        const err = await response.json();
        message.error(err.detail || "Payment failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = async (taskId: string) => {
    // Fetch expense details and open edit modal
    try {
      const response = await fetch(`/api/v1/expenses/${taskId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setEditExpense(data);
        setEditModalVisible(true);
      } else {
        message.error("Failed to load expense details");
      }
    } catch {
      message.error("Network error");
    }
  };

  // --- Table columns ---

  const columns: ColumnsType<TodoTask> = [
    {
      title: "Type",
      dataIndex: "task_type",
      key: "task_type",
      width: 160,
      render: (type: string) => {
        const info = TASK_TYPE_LABELS[type] || { label: type, color: "default" };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 200,
      render: (num: string, record: TodoTask) => (
        <Text
          strong
          style={{ color: "#1890ff", cursor: "pointer" }}
          onClick={() => handleViewExpense(record.id)}
        >
          {num || "-"}
        </Text>
      ),
    },
    {
      title: "Requester",
      dataIndex: "requester",
      key: "requester",
      width: 140,
      ellipsis: true,
    },
    {
      title: "Details",
      key: "details",
      render: (_: unknown, record: TodoTask) => (
        <div>
          <div>
            <Text strong>{record.expense_type}</Text>
            {record.description && (
              <Text type="secondary" style={{ marginLeft: 4 }}>| {record.description}</Text>
            )}
          </div>
          {record.trip_number && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Trip: {record.trip_number}
              </Text>
            </div>
          )}
          {record.manager_comment && (
            <div>
              <Text type="warning" style={{ fontSize: 12 }}>
                Note: {record.manager_comment}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Amount",
      key: "amount",
      width: 150,
      align: "right",
      render: (_: unknown, record: TodoTask) => (
        <Text strong>
          {record.currency} {record.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Text>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (date: string) => (
        <Tooltip title={date ? new Date(date).toLocaleString() : ""}>
          <Text type="secondary">{formatTimeAgo(date)}</Text>
        </Tooltip>
      ),
      sorter: (a, b) => (a.created_at || "").localeCompare(b.created_at || ""),
    },
    {
      title: "Actions",
      key: "actions",
      width: 280,
      fixed: "right",
      render: (_: unknown, record: TodoTask) => (
        <Space size="small">
          {record.actions.includes("approve") && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApprove(record.id)}
              loading={processing}
              style={{ background: "#52c41a", borderColor: "#52c41a" }}
            >
              Approve
            </Button>
          )}
          {record.actions.includes("reject") && (
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => openActionModal(record.id, "reject")}
            >
              Reject
            </Button>
          )}
          {record.actions.includes("return") && (
            <Button
              size="small"
              icon={<UndoOutlined />}
              onClick={() => openActionModal(record.id, "return")}
              style={{ color: "#fa8c16", borderColor: "#fa8c16" }}
            >
              Return
            </Button>
          )}
          {record.actions.includes("pay") && (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => openPayModal(record.id)}
            >
              Pay
            </Button>
          )}
          {record.actions.includes("edit") && (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record.id)}
              style={{ color: "#faad14", borderColor: "#faad14" }}
            >
              Fix
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Filter type options based on user role
  const typeOptions = [
    { value: "", label: "All Types" },
    ...(user?.role === "manager" || user?.role === "admin"
      ? [{ value: "expense_approval", label: "Expense Approval" }]
      : []),
    ...(user?.role === "finance" || user?.role === "admin"
      ? [{ value: "payment_processing", label: "Payment Processing" }]
      : []),
    ...(user?.role === "ops" || user?.role === "admin"
      ? [{ value: "expense_correction", label: "Expense Correction" }]
      : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: "24px" }}>
      <Card>
        <Flex vertical gap="middle" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Flex gap="small">
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/dashboard")}>
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Your Pending Tasks ({tasks.length})
              </Title>
            </Flex>
            <Button icon={<ReloadOutlined />} onClick={fetchTasks}>
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Space style={{ marginBottom: 16 }} wrap>
            <Select
              value={typeFilter || ""}
              onChange={(val) => setTypeFilter(val || undefined)}
              options={typeOptions}
              style={{ width: 180 }}
              placeholder="Filter by type"
            />
            <Select
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "date", label: "Sort by Date" },
                { value: "amount", label: "Sort by Amount" },
              ]}
              style={{ width: 150 }}
            />
            <Select
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { value: "desc", label: "Newest First" },
                { value: "asc", label: "Oldest First" },
              ]}
              style={{ width: 150 }}
            />
          </Space>

          {tasks.length === 0 && !loading ? (
            <Empty
              image={<SmileOutlined style={{ fontSize: 64, color: "#52c41a" }} />}
              description={
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    You&apos;re all caught up!
                  </Text>
                  <br />
                  <Text type="secondary">No pending tasks right now.</Text>
                </div>
              }
              style={{ marginTop: 80 }}
            />
          ) : (
            <Table
              columns={columns}
              dataSource={tasks}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20 }}
              scroll={{ x: 1000 }}
              onRow={(record) => ({
                id: `task-row-${record.id}`,
              })}
            />
          )}
        </Flex>
      </Card>

      {/* Reject / Return comment modal */}
      <Modal
        title={`${actionType === "reject" ? "Reject" : "Return"} Expense`}
        open={actionModalVisible}
        onOk={handleRejectOrReturn}
        onCancel={() => setActionModalVisible(false)}
        confirmLoading={processing}
        okText={`Confirm ${actionType === "reject" ? "Rejection" : "Return"}`}
        okButtonProps={{ danger: actionType === "reject" }}
      >
        <Flex vertical gap="small" style={{ width: "100%" }}>
          <Text>Please provide a reason:</Text>
          <TextArea
            rows={4}
            value={actionComment}
            onChange={(e) => setActionComment(e.target.value)}
            placeholder="e.g. Missing receipt, Duplicate entry..."
          />
        </Flex>
      </Modal>

      {/* Payment modal */}
      <Modal
        title="Process Payment"
        open={payModalVisible}
        onOk={handlePay}
        onCancel={() => setPayModalVisible(false)}
        confirmLoading={processing}
        okText="Confirm Payment"
      >
        <Flex vertical gap="small" style={{ width: "100%" }}>
          <Text>Payment Method:</Text>
          <Select
            value={payMethod}
            onChange={setPayMethod}
            options={[
              { value: "CASH", label: "Cash" },
              { value: "TRANSFER", label: "Transfer" },
            ]}
            style={{ width: "100%" }}
          />
          {payMethod === "TRANSFER" && (
            <>
              <Text>Reference Number:</Text>
              <Input
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="e.g. Bank Transaction ID"
              />
            </>
          )}
        </Flex>
      </Modal>

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        open={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedExpense(null);
        }}
        expense={selectedExpense}
      />

      {/* Edit Expense Modal */}
      <EditExpenseModal
        open={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEditExpense(null);
        }}
        onSuccess={() => {
          fetchTasks();
          setEditModalVisible(false);
          setEditExpense(null);
        }}
        expense={editExpense}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <App>
      <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />}>
        <TasksContent />
      </Suspense>
    </App>
  );
}
