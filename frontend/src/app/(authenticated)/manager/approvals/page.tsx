"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Select,
  Modal,
  Input,
  Typography,
  App,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ExpenseRequest, ExpenseStatus, ExpenseCategory } from "@/types/expense";
import { useAuth } from "@/contexts/AuthContext";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { ExpenseDetailModal } from "@/components/expenses/ExpenseDetailModal";
import type { ExpenseRequestDetailed } from "@/types/expense";

const { TextArea } = Input;
const { Title, Text } = Typography;

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  "Pending Manager": "orange",
  "Pending Finance": "blue",
  Paid: "green",
  Rejected: "red",
  Returned: "purple",
};

const CATEGORY_OPTIONS: { label: string; value: ExpenseCategory }[] = [
  { label: "Fuel", value: "Fuel" },
  { label: "Allowance", value: "Allowance" },
  { label: "Maintenance", value: "Maintenance" },
  { label: "Office", value: "Office" },
  { label: "Border", value: "Border" },
  { label: "Other", value: "Other" },
];

const STATUS_OPTIONS: { label: string; value: ExpenseStatus }[] = [
  { label: "Pending Manager", value: "Pending Manager" },
  { label: "Pending Finance", value: "Pending Finance" },
  { label: "Paid", value: "Paid" },
  { label: "Rejected", value: "Rejected" },
  { label: "Returned", value: "Returned" },
];

const CATEGORY_FILTERS = CATEGORY_OPTIONS.map((o) => ({
  text: o.label,
  value: o.value,
}));

const STATUS_FILTERS = STATUS_OPTIONS.map((o) => ({
  text: o.label,
  value: o.value,
}));

function ApprovalPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<"Returned" | "Rejected" | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus>("Pending Manager");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "">("");
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

  const handleBulkAction = async (status: string, actionComment?: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select items first");
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/v1/expenses/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ids: selectedRowKeys,
          status: status,
          comment: actionComment,
        }),
      });

      if (response.ok) {
        message.success(`Successfully set ${selectedRowKeys.length} items to ${status}`);
        setSelectedRowKeys([]);
        setModalVisible(false);
        setComment("");
        fetchExpenses();
      } else {
        const error = await response.json();
        message.error(error.detail || "Operation failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setProcessing(false);
    }
  };

  const handleSingleApprove = async (id: string) => {
    setProcessing(true);
    try {
      const response = await fetch("/api/v1/expenses/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ids: [id],
          status: "Pending Finance",
        }),
      });

      if (response.ok) {
        message.success("Expense approved successfully");
        fetchExpenses();
      } else {
        const error = await response.json();
        message.error(error.detail || "Operation failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setProcessing(false);
    }
  };

  const openCommentModal = (type: "Returned" | "Rejected", overrideId?: string) => {
    const ids = overrideId ? [overrideId] : selectedRowKeys;
    if (ids.length === 0) {
      message.warning("Please select items first");
      return;
    }
    if (overrideId) {
      setSelectedRowKeys([overrideId]);
    }
    setActionType(type);
    setModalVisible(true);
  };

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
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
          {record.status === "Pending Manager" && (
            <Space size="small">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ color: "#52c41a" }}
                onClick={() => handleSingleApprove(record.id)}
                title="Approve"
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<RollbackOutlined />}
                onClick={() => openCommentModal("Returned", record.id)}
                title="Return"
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => openCommentModal("Rejected", record.id)}
                title="Reject"
              />
            </Space>
          )}
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
                Expense Approvals
              </Title>
            </Space>
            <Space wrap>
              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                style={{ width: 180 }}
                options={STATUS_OPTIONS}
                allowClear
                placeholder="Filter by Status"
              />
              <Select
                value={categoryFilter || undefined}
                onChange={(val) => setCategoryFilter(val || "")}
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

          {/* Bulk action bar */}
          {selectedRowKeys.length > 0 && (
            <div
              style={{
                background: "#e6f4ff",
                padding: "8px 16px",
                borderRadius: 6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text>
                Selected <strong>{selectedRowKeys.length}</strong> items{" "}
                <a onClick={() => setSelectedRowKeys([])}>Clear</a>
              </Text>
              <Space>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleBulkAction("Pending Finance")}
                  loading={processing}
                >
                  Approve
                </Button>
                <Button
                  danger
                  icon={<RollbackOutlined />}
                  onClick={() => openCommentModal("Returned")}
                  loading={processing}
                >
                  Return
                </Button>
                <Button
                  danger
                  type="dashed"
                  icon={<CloseCircleOutlined />}
                  onClick={() => openCommentModal("Rejected")}
                  loading={processing}
                >
                  Reject
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

      {/* Comment Modal for Return/Reject */}
      <Modal
        title={`${actionType} Request`}
        open={modalVisible}
        onOk={() => handleBulkAction(actionType!, comment)}
        onCancel={() => {
          setModalVisible(false);
          setComment("");
        }}
        confirmLoading={processing}
        okText={`Confirm ${actionType}`}
        okButtonProps={{ danger: true }}
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Text>Please provide a reason for this action:</Text>
          <TextArea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. Missing receipt, Duplicate entry..."
          />
        </Space>
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

export default function ApprovalPage() {
  return (
    <App>
      <ApprovalPageContent />
    </App>
  );
}
