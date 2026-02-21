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
  Switch,
  Typography,
  Popconfirm,
  Tooltip,
  App,
  Flex,
  Space,
  Tag,
  Divider,
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
import { AVAILABLE_PERMISSIONS, ROLE_PERMISSION_PRESETS } from "@/hooks/usePermissions";
import BulkActionBar from "@/components/ui/BulkActionBar";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title, Text } = Typography;

interface User {
  id: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  permissions: string[];
}

interface UserCreate {
  username: string;
  full_name?: string;
  role: string;
  password?: string;
  permissions?: string[];
}

const ROLES = [ "manager", "ops", "finance"];

const ROLE_FILTERS = ROLES.map((r) => ({ text: r.toUpperCase(), value: r }));

const STATUS_FILTERS = [
  { text: "Active", value: true },
  { text: "Inactive", value: false },
];

// Group permissions by category for the toggle UI
const PERMISSION_GROUPS = AVAILABLE_PERMISSIONS.reduce<
  Record<string, { label: string; value: string }[]>
>((acc, p) => {
  (acc[p.group] ??= []).push({ label: p.label, value: p.value });
  return acc;
}, {});

/** Brand color for active toggles */
const BRAND_GOLD = "#D4AF37";

/** Grouped toggle switches for permissions – used as a Form control via value/onChange. */
function PermissionToggles({
  value = [],
  onChange,
}: {
  value?: string[];
  onChange?: (v: string[]) => void;
}) {
  const toggle = (perm: string, checked: boolean) => {
    const next = checked
      ? [...value, perm]
      : value.filter((p) => p !== perm);
    onChange?.(next);
  };

  const toggleGroup = (group: string, checked: boolean) => {
    const groupPerms = PERMISSION_GROUPS[group].map((p) => p.value);
    const next = checked
      ? [...new Set([...value, ...groupPerms])]
      : value.filter((p) => !groupPerms.includes(p));
    onChange?.(next);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
        const allOn = perms.every((p) => value.includes(p.value));
        const someOn = perms.some((p) => value.includes(p.value));
        return (
          <div
            key={group}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "14px 16px",
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            {/* Group header with master toggle */}
            <Flex justify="space-between" align="center" style={{ marginBottom: 10, borderBottom: "1px solid #f0f0f0", paddingBottom: 8 }}>
              <Text strong style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>
                {group}
              </Text>
              <Flex align="center" gap={6}>
                <Text style={{ fontSize: 11, color: "#9ca3af" }}>{allOn ? "All" : someOn ? "Some" : "None"}</Text>
                <Switch
                  size="small"
                  checked={allOn}
                  style={
                    allOn
                      ? { background: BRAND_GOLD }
                      : someOn
                        ? { background: "rgba(212,175,55,0.45)" }
                        : undefined
                  }
                  onChange={(c) => toggleGroup(group, c)}
                />
              </Flex>
            </Flex>
            {/* Individual permission rows */}
            <Flex vertical gap={8}>
              {perms.map((p) => {
                const isOn = value.includes(p.value);
                return (
                  <Flex key={p.value} justify="space-between" align="center">
                    <Text style={{ fontSize: 13, color: isOn ? "#1f2937" : "#9ca3af" }}>
                      {p.label}
                    </Text>
                    <Switch
                      size="small"
                      checked={isOn}
                      style={isOn ? { background: BRAND_GOLD } : undefined}
                      onChange={(c) => toggle(p.value, c)}
                    />
                  </Flex>
                );
              })}
            </Flex>
          </div>
        );
      })}
    </div>
  );
}

// Child component to use App hook
const UsersContent = () => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { message } = App.useApp();
  const { invalidateUsers } = useInvalidateQueries();

  // TanStack Query for users data
  const { data, isLoading: loading, refetch } = useUsers();
  
  // Filter out superusers (like the initial admin) to prevent self-deletion or editing of the root account
  const allUsers = (data?.data || []) as User[];
  const users = allUsers.filter(u => !u.is_superuser);
  
  // Use filtered length for pagination since we are doing client-side filtering
  const totalCount = users.length;

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
    if (currentUser) {
      // Allow admin OR manager
      if (currentUser.role !== "admin" && currentUser.role !== "manager" && !currentUser.is_superuser) {
        message.error("Access denied: Admins or Managers only");
        router.push("/dashboard");
      }
    }
  }, [currentUser, router, message]);

  // Handle Form population when modal opens or user changes
  useEffect(() => {
    if (isModalOpen) {
      if (editingUser) {
        form.setFieldsValue({
          username: editingUser.username,
          full_name: editingUser.full_name,
          role: editingUser.role,
          permissions: editingUser.permissions || [],
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ permissions: [] });
      }
    }
  }, [isModalOpen, editingUser, form]);

  const handleSubmit = async (values: UserCreate) => {
    setSubmitting(true);
    try {
      const url = editingUser ? `/api/v1/users/${editingUser.id}` : "/api/v1/users";
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
        <Tag color={role === "admin" ? "error" : "default"}>{role.toUpperCase()}</Tag>
      ),
      ...getColumnFilterProps("role", ROLE_FILTERS),
    },
    {
      title: "Permissions",
      dataIndex: "permissions",
      key: "permissions",
      width: 150,
      render: (perms: string[]) => (
        perms && perms.length > 0 ? (
          <Tooltip title={perms.join(", ")}>
            <Tag color="default">{perms.length} Permissions</Tag>
          </Tooltip>
        ) : <Text type="secondary">-</Text>
      ),
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
              aria-label={`Edit User ${record.username}`}
            />
            <Tooltip title="Reset Password">
              <Popconfirm
                title="Reset Password"
                description="Reset to default password? User will need to change it."
                onConfirm={() => handleResetPassword(record)}
              >
                <Button type="text" size="small" icon={<KeyOutlined />} aria-label="Reset Password" />
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
              <Button type="text" danger icon={<DeleteOutlined />} size="small" aria-label={`Delete User ${record.username}`} />
            </Popconfirm>
          </Space>
        </div>
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);


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
        title={<span style={{ fontSize: 18, fontWeight: 600, color: "#1f2937" }}>{editingUser ? "Edit User" : "Add User"}</span>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={720}
        destroyOnHidden={false}
        forceRender
        styles={{ body: { background: "#fafafa", padding: "20px 24px" } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ color: "#1f2937" }}>
          {/* Row 1: Full Name + Username */}
          <Flex gap="middle">
            <Form.Item
              name="full_name"
              label={<span style={{ color: "#374151" }}>Full Name</span>}
              rules={[{ required: true, message: "Required" }]}
              style={{ flex: 1 }}
            >
              <Input prefix={<UserOutlined />} placeholder="John Doe" />
            </Form.Item>
            <Form.Item
              name="username"
              label={<span style={{ color: "#374151" }}>Username / Email</span>}
              rules={[{ required: true, message: "Required" }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="john@example.com" />
            </Form.Item>
          </Flex>

          {/* Row 2: Role + Password (side-by-side) */}
          <Flex gap="middle">
            <Form.Item
              name="role"
              label={<span style={{ color: "#374151" }}>Role</span>}
              rules={[{ required: true, message: "Required" }]}
              style={{ flex: 1 }}
            >
              <Select
                onChange={(role: string) => {
                  const preset = ROLE_PERMISSION_PRESETS[role];
                  if (preset) {
                    form.setFieldsValue({ permissions: [...preset] });
                  }
                }}
              >
                {ROLES.map(r => (
                  <Select.Option key={r} value={r}>{r.toUpperCase()}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            {!editingUser ? (
              <Form.Item
                name="password"
                label={<span style={{ color: "#374151" }}>Initial Password</span>}
                rules={[{ required: true, message: "Required for new users" }]}
                style={{ flex: 1 }}
              >
                <Input.Password placeholder="Min 8 characters" />
              </Form.Item>
            ) : (
              <div style={{ flex: 1 }} />
            )}
          </Flex>

          {/* Separator + Permissions */}
          <Divider style={{ borderColor: "#e5e7eb", margin: "8px 0 16px" }}>
            <Text strong style={{ color: "#6b7280", fontSize: 13, letterSpacing: 0.5 }}>PERMISSIONS</Text>
          </Divider>

          <Form.Item name="permissions" noStyle>
            <PermissionToggles />
          </Form.Item>

          {/* Actions */}
          <Flex justify="flex-end" gap="small" style={{ marginTop: 20 }}>
            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingUser ? "Update" : "Create"}
            </Button>
          </Flex>
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
