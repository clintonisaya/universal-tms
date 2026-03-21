"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import {
  Table,
  Tag,
  Button,
  Flex,
  Space,
  Select,
  App,
  Empty,
  Typography,
  Tooltip,
  Card,
  Spin,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlayCircleOutlined,
  SmileOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ExpenseReviewModal } from "@/components/expenses/ExpenseReviewModal";
import type { ExpenseRequestDetailed } from "@/types/expense";

const { Text, Title } = Typography;

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
  expense_approval: { label: "Expense Approval", color: "warning" },
  payment_processing: { label: "Payment Processing", color: "processing" },
  expense_correction: { label: "Expense Correction", color: "warning" },
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Review modal state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewExpense, setReviewExpense] = useState<ExpenseRequestDetailed | null>(null);
  const [reviewActions, setReviewActions] = useState<string[]>([]);
  const [loadingExpense, setLoadingExpense] = useState(false);

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

  // --- Open Review Modal ---
  const openReviewModal = async (task: TodoTask) => {
    setLoadingExpense(true);
    setReviewActions(task.actions);
    setReviewModalVisible(true);
    try {
      const response = await fetch(`/api/v1/expenses/${task.id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setReviewExpense(data);
      } else {
        message.error("Failed to load expense details");
        setReviewModalVisible(false);
      }
    } catch {
      message.error("Network error");
      setReviewModalVisible(false);
    } finally {
      setLoadingExpense(false);
    }
  };

  // Called after approve/reject/return from within the review modal
  const handleActionComplete = () => {
    setReviewModalVisible(false);
    setReviewExpense(null);
    fetchTasks();
  };

  // --- Table columns ---

  const columns: ColumnsType<TodoTask> = [
    {
      title: "Type",
      dataIndex: "task_type",
      key: "task_type",
      width: 140,
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
          style={{ color: "var(--color-gold)", cursor: "pointer" }}
          onClick={() => openReviewModal(record)}
        >
          {num || "-"}
        </Text>
      ),
    },
    {
      title: "Requester",
      dataIndex: "requester",
      key: "requester",
      width: 130,
      ellipsis: true,
    },
    {
      title: "Details",
      key: "details",
      ellipsis: true,
      render: (_: unknown, record: TodoTask) => (
        <Text ellipsis>
          {record.expense_type}{record.description ? ` | ${record.description}` : ""}{record.trip_number ? ` — Trip: ${record.trip_number}` : ""}
        </Text>
      ),
    },
    {
      title: "Amount",
      key: "amount",
      width: 200,
      align: "right",
      render: (_: unknown, record: TodoTask) => (
        <Text strong>
          {record.currency} {Number(record.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </Text>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 130,
      render: (date: string) => (
        <Tooltip title={date ? new Date(date).toLocaleString() : ""}>
          <Text type="secondary">{formatTimeAgo(date)}</Text>
        </Tooltip>
      ),
      sorter: (a, b) => (a.created_at || "").localeCompare(b.created_at || ""),
    },
    {
      title: "",
      key: "actions",
      width: 140,
      fixed: "right",
      render: (_: unknown, record: TodoTask) => (
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

  // Filter type options based on user role
  const typeOptions = [
    { value: "", label: "All Types" },
    ...(user?.role === "manager" || user?.role === "admin"
      ? [{ value: "expense_approval", label: "Expense Approval" }]
      : []),
    ...(user?.role === "finance" || user?.role === "admin"
      ? [{ value: "payment_processing", label: "Payment Processing" }]
      : []),
    ...(user?.role === "ops" || user?.role === "finance" || user?.role === "admin"
      ? [{ value: "expense_correction", label: "Expense Correction" }]
      : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", padding: "24px" }}>
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
              onChange={(val) => { setTypeFilter(val || undefined); setCurrentPage(1); }}
              options={typeOptions}
              style={{ width: 180 }}
              placeholder="Filter by type"
            />
            <Select
              value={sortBy}
              onChange={(val) => { setSortBy(val); setCurrentPage(1); }}
              options={[
                { value: "date", label: "Sort by Date" },
                { value: "amount", label: "Sort by Amount" },
              ]}
              style={{ width: 150 }}
            />
            <Select
              value={sortOrder}
              onChange={(val) => { setSortOrder(val); setCurrentPage(1); }}
              options={[
                { value: "desc", label: "Newest First" },
                { value: "asc", label: "Oldest First" },
              ]}
              style={{ width: 150 }}
            />
          </Space>

          {tasks.length === 0 && !loading ? (
            <Empty
              image={<SmileOutlined style={{ fontSize: 64, color: "var(--color-green)" }} />}
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
              size="small"
              pagination={{
                current: currentPage,
                pageSize,
                total: tasks.length,
                showTotal: (total) => `Total ${total} tasks`,
                showSizeChanger: true,
                pageSizeOptions: ["20", "50", "100"],
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                },
              }}
              scroll={{ x: 900 }}
              onRow={(record) => ({
                id: `task-row-${record.id}`,
              })}
            />
          )}
        </Flex>
      </Card>

      {/* Unified Expense Review Modal */}
      <ExpenseReviewModal
        open={reviewModalVisible}
        onClose={() => {
          setReviewModalVisible(false);
          setReviewExpense(null);
        }}
        expense={reviewExpense}
        actions={reviewActions}
        loading={loadingExpense}
        onActionComplete={handleActionComplete}
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
