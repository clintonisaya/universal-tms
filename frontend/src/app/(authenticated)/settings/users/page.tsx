"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Spin,
  Popconfirm,
  Tooltip,
  App,
  Flex,
  Space,
  Tag,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers, useInvalidateQueries } from "@/hooks/useApi";
import BulkActionBar from "@/components/ui/BulkActionBar";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title } = Typography;

interface User {
  id: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
}

interface UserCreate {
  username: string;
  full_name?: string;
  role: string;
  password: string;
}

const ROLES = ["admin", "manager", "ops", "finance"];

const ROLE_FILTERS = ROLES.map((r) => ({ text: r.toUpperCase(), value: r }));

const STATUS_FILTERS = [
  { text: "Active", value: true },
  { text: "Inactive", value: false },
];

// Child component to use App hook
const UsersContent = () => {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const { message } = App.useApp();
  const { invalidateUsers } = useInvalidateQueries();

  // TanStack Query for users data
  const { data, isLoading: loading, refetch } = useUsers();
  const users = (data?.data || []) as User[];
  const totalCount = data?.count || 0;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [form] = Form.useForm();

  // Role Access Control
  useEffect(() => {
    if (!authLoading && currentUser) {
      if (currentUser.role !== "admin" && !currentUser.is_superuser) {
        message.error("Access denied: Admins only");
        router.push("/dashboard");
      }
    }
  }, [authLoading, currentUser, router, message]);

  // Handle Form population when modal opens or user changes
  useEffect(() => {
    if (isModalOpen) {
      if (editingUser) {
        form.setFieldsValue({
          username: editingUser.username,
          full_name: editingUser.full_name,
          role: editingUser.role,
        });
      } else {
        form.resetFields();
      }
    }
  }, [isModalOpen, editingUser, form]);

  const handleSubmit = async (values: UserCreate) => {
    setSubmitting(true);
    try {
      const url = editingUser ? `/api/v1/users/${editingUser.id}` : "/api/v1/users/";
      const method = editingUser ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success(`User ${editingUser ? "updated" : "created"} successfully`);
        setIsModalOpen(false);
        setEditingUser(null);
        invalidateUsers();
      } else {
        const error = await response.json();
        let errorMsg = "Operation failed";
        if (typeof error.detail === 'string') {
          errorMsg = error.detail;
        } else if (Array.isArray(error.detail)) {
          errorMsg = error.detail.map((e: any) => e.msg).join(", ");
        }
        message.error(errorMsg);
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: User) => {
    try {
      const response = await fetch(`/api/v1/users/${user.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        message.success("User deleted successfully");
        invalidateUsers();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete user");
      }
    } catch {
      message.error("Network error");
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      const response = await fetch(`/api/v1/users/${user.id}/password-reset`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        message.success(`Password for ${user.username} reset to default`);
      }
    } catch {
      message.error("Network error");
    }
  };

  const openModal = (user?: User) => {
    setEditingUser(user || null);
    setIsModalOpen(true);
  };

  const handleBulkDelete = () => {
    Modal.confirm({
      title: 'Delete Selected Users',
      content: `Are you sure you want to delete ${selectedRowKeys.length} users? This cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        const keys = [...selectedRowKeys];
        let successCount = 0;
        let failCount = 0;
        const hide = message.loading('Deleting users...', 0);

        try {
          for (const id of keys) {
            const response = await fetch(`/api/v1/users/${id}`, {
              method: "DELETE",
              credentials: "include",
            });
            if (response.ok) {
              successCount++;
            } else {
              failCount++;
            }
          }
          hide();
          message.success(`Deleted ${successCount} users.`);
          if (failCount > 0) {
            message.error(`Failed to delete ${failCount} users.`);
          }
          setSelectedRowKeys([]);
          invalidateUsers();
        } catch {
          hide();
          message.error('Network error during bulk delete');
        }
      }
    });
  };

  const bulkActions = [
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      icon: <DeleteOutlined />,
      onClick: handleBulkDelete,
    },
  ];

  const columns: ColumnsType<User> = [
    {
      title: "Full Name",
      dataIndex: "full_name",
      key: "full_name",
      width: 180,
      render: (text) => (
        <div style={{ fontWeight: 600 }}>{text || "-"}</div>
      ),
      ...getColumnSearchProps("full_name"),
    },
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      width: 200,
      render: (text) => text || "-",
      ...getColumnSearchProps("username"),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 100,
      render: (role) => (
        <Tag color={role === "admin" ? "red" : "blue"}>{role.toUpperCase()}</Tag>
      ),
      ...getColumnFilterProps("role", ROLE_FILTERS),
    },
    {
      title: "Status",
      key: "status",
      dataIndex: "is_active",
      width: 100,
      render: (_, r) => (
        <Tag color={r.is_active ? "success" : "default"}>
          {r.is_active ? "Active" : "Inactive"}
        </Tag>
      ),
      ...getColumnFilterProps("is_active", STATUS_FILTERS),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
            <Tooltip title="Reset Password">
              <Popconfirm
                title="Reset Password"
                description="Reset to default password? User will need to change it."
                onConfirm={() => handleResetPassword(record)}
              >
                <Button type="text" size="small" icon={<KeyOutlined />} />
              </Popconfirm>
            </Tooltip>
            <Popconfirm
              title="Delete user"
              description={`Delete ${record.username}?`}
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          </Space>
        </div>
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  if (authLoading) return <Spin size="large" />;

  return (
    <div>
      <Card>
        <Flex vertical gap="middle" style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Flex gap="small">
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/dashboard")}>
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                User Management
              </Title>
            </Flex>
            <Flex gap="small">
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
                Add User
              </Button>
            </Flex>
          </div>

          <Table<User>
            rowSelection={getStandardRowSelection(
              currentPage,
              pageSize,
              selectedRowKeys,
              setSelectedRowKeys
            )}
            columns={resizableColumns}
            components={components}
            dataSource={users}
            rowKey="id"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            pagination={{
              current: currentPage,
              pageSize,
              total: totalCount,
              showTotal: (total) => `Total ${total} users`,
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

      <Modal
        title={editingUser ? "Edit User" : "Add User"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden={false} // Keep mounted to avoid form connection issues, reset via useEffect
        forceRender // Ensure form exists
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="full_name"
            label="Full Name"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="John Doe" />
          </Form.Item>

          <Form.Item
            name="username"
            label="Username / Email"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="john@example.com" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select>
              {ROLES.map(r => (
                <Select.Option key={r} value={r}>{r.toUpperCase()}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Initial Password"
              rules={[{ required: true, message: "Required for new users" }]}
            >
              <Input.Password placeholder="Min 8 characters" />
            </Form.Item>
          )}

          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Flex justify="flex-end" gap="small">
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingUser ? "Update" : "Create"}
              </Button>
            </Flex>
          </Form.Item>
        </Form>
      </Modal>
      <BulkActionBar
        selectedCount={selectedRowKeys.length}
        actions={bulkActions}
        onClearSelection={() => setSelectedRowKeys([])}
      />
    </div>
  );
};

export default function UsersPage() {
  return (
    <App>
      <UsersContent />
    </App>
  );
}
