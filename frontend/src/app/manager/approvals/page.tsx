"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  Select,
  message,
  Modal,
  Input,
  Typography,
  Spin,
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

export default function ApprovalPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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
  }, [router, statusFilter, categoryFilter]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchExpenses();
    }
  }, [authLoading, user, fetchExpenses]);

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

  const openCommentModal = (type: "Returned" | "Rejected") => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select items first");
      return;
    }
    setActionType(type);
    setModalVisible(true);
  };

  const columns: ColumnsType<ExpenseRequest> = [
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : "-"),
      sorter: (a, b) => (a.created_at || "").localeCompare(b.created_at || ""),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (amount: number) =>
        new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: ExpenseStatus) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
    },
    {
      title: "Comment",
      dataIndex: "manager_comment",
      key: "manager_comment",
      ellipsis: true,
      render: (comment: string | null) => comment || "-",
    },
  ];

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
    <div style={{ minHeight: "100vh", background: "#f0f2f5", padding: "24px" }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
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
            columns={columns}
            dataSource={expenses}
            rowKey="id"
            loading={loading}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            pagination={{
              total: totalCount,
              showTotal: (total) => `Total ${total} expenses`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
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
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text>Please provide a reason for this action:</Text>
          <TextArea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. Missing receipt, Duplicate entry..."
          />
        </Space>
      </Modal>
    </div>
  );
}
