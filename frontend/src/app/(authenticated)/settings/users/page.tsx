"use client";

import { useState, useEffect, useRef } from "react";
import {
  ProTable,
  ModalForm,
  ProFormText,
  ProFormSelect,
  type ProColumns,
  type ActionType,
} from "@ant-design/pro-components";
import {
  Button,
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
  Divider,
  Tag,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers, useInvalidateQueries } from "@/hooks/application/useApi";
import { AVAILABLE_PERMISSIONS, ROLE_PERMISSION_PRESETS } from "@/hooks/application/usePermissions";
import BulkActionBar from "@/components/ui/BulkActionBar";

const { Text } = Typography;

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

const ROLES = ["manager", "ops", "finance"];

const ROLE_OPTIONS = ROLES.map((r) => ({
  label: r.toUpperCase(),
  value: r,
}));

// Group permissions by category for the toggle UI
const PERMISSION_GROUPS = AVAILABLE_PERMISSIONS.reduce<
  Record<string, { label: string; value: string }[]>
>((acc, p) => {
  (acc[p.group] ??= []).push({ label: p.label, value: p.value });
  return acc;
}, {});

const BRAND_PRIMARY = "#1677ff";

/** Grouped toggle switches for permissions */
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
              border: "1px solid #d9d9d9",
              borderRadius: 10,
              padding: "14px 16px",
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <Flex
              justify="space-between"
              align="center"
              style={{
                marginBottom: 10,
                borderBottom: "1px solid #d9d9d9",
                paddingBottom: 8,
              }}
            >
              <Text
                strong
                style={{
                  fontSize: 12,
                  color: "#8c8c8c",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {group}
              </Text>
              <Flex align="center" gap={6}>
                <Text style={{ fontSize: 12, color: "#bfbfbf" }}>
                  {allOn ? "All" : someOn ? "Some" : "None"}
                </Text>
                <Switch
                  size="small"
                  checked={allOn}
                  style={
                    allOn
                      ? { background: BRAND_PRIMARY }
                      : someOn
                        ? { background: "rgba(212,175,55,0.45)" }
                        : undefined
                  }
                  onChange={(c) => toggleGroup(group, c)}
                />
              </Flex>
            </Flex>
            <Flex vertical gap={8}>
              {perms.map((p) => {
                const isOn = value.includes(p.value);
                return (
                  <Flex key={p.value} justify="space-between" align="center">
                    <Text
                      style={{
                        fontSize: 12,
                        color: isOn ? "#000" : "#bfbfbf",
                      }}
                    >
                      {p.label}
                    </Text>
                    <Switch
                      size="small"
                      checked={isOn}
                      style={isOn ? { background: BRAND_PRIMARY } : undefined}
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

export default function UsersPage() {
  return (
    <App>
      <UsersContent />
    </App>
  );
}

function UsersContent() {
  const { message } = App.useApp();
  const { user: currentUser } = useAuth();
  const { invalidateUsers } = useInvalidateQueries();
  const actionRef = useRef<ActionType>(null);

  const { data, isLoading: loading, refetch } = useUsers();

  // Filter out superusers
  const allUsers = (data?.data || []) as User[];
  const users = allUsers.filter((u) => !u.is_superuser);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] =
    useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);

  const [form] = Form.useForm();
  const [resetPasswordForm] = Form.useForm();

  // Role access control
  useEffect(() => {
    if (currentUser) {
      if (
        currentUser.role !== "admin" &&
        currentUser.role !== "manager" &&
        !currentUser.is_superuser
      ) {
        message.error("Access denied: Admins or Managers only");
      }
    }
  }, [currentUser, message]);

  // Populate form when modal opens
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
      const url = editingUser
        ? `/api/v1/users/${editingUser.id}`
        : "/api/v1/users";
      const method = editingUser ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success(
          `User ${editingUser ? "updated" : "created"} successfully`
        );
        setIsModalOpen(false);
        setEditingUser(null);
        invalidateUsers();
      } else {
        const error = await response.json();
        let errorMsg = "Operation failed";
        if (typeof error.detail === "string") {
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

  const handleBulkDelete = () => {
    Modal.confirm({
      title: "Delete Selected Users",
      content: `Are you sure you want to delete ${selectedRowKeys.length} users? This cannot be undone.`,
      okText: "Yes, Delete",
      okType: "danger",
      cancelText: "No",
      onOk: async () => {
        const keys = [...selectedRowKeys];
        let successCount = 0;
        let failCount = 0;
        const hide = message.loading("Deleting users...", 0);

        try {
          for (const id of keys) {
            const response = await fetch(`/api/v1/users/${id}`, {
              method: "DELETE",
              credentials: "include",
            });
            if (response.ok) successCount++;
            else failCount++;
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
          message.error("Network error during bulk delete");
        }
      },
    });
  };

  const handleResetPasswordSubmit = async (values: {
    new_password: string;
  }) => {
    if (!resetPasswordUser) return;
    setResetPasswordSubmitting(true);
    try {
      const response = await fetch(
        `/api/v1/users/${resetPasswordUser.id}/password-reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ new_password: values.new_password }),
        }
      );
      if (response.ok) {
        message.success(
          `Password for ${resetPasswordUser.username} updated successfully`
        );
        setIsResetPasswordModalOpen(false);
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update password");
      }
    } catch {
      message.error("Network error");
    } finally {
      setResetPasswordSubmitting(false);
    }
  };

  const columns: ProColumns<User>[] = [
    {
      title: "Full Name",
      dataIndex: "full_name",
      key: "full_name",
      width: 180,
      render: (_, record) => (
        <div style={{ fontWeight: 600 }}>{record.full_name || "-"}</div>
      ),
      fieldProps: { placeholder: "Search name" },
    },
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      width: 200,
      render: (_, record) => record.username || "-",
      fieldProps: { placeholder: "Search username" },
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 100,
      valueType: "select",
      valueEnum: {
        manager: { text: "MANAGER", status: "Default" },
        ops: { text: "OPS", status: "Processing" },
        finance: { text: "FINANCE", status: "Warning" },
      },
      render: (_, record) => (
        <Tag color={record.role === "admin" ? "red" : "default"}>
          {record.role.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Permissions",
      dataIndex: "permissions",
      key: "permissions",
      width: 150,
      search: false,
      render: (_, record) =>
        record.permissions && record.permissions.length > 0 ? (
          <Tooltip title={record.permissions.join(", ")}>
            <Tag>{record.permissions.length} Permissions</Tag>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 100,
      valueType: "select",
      valueEnum: {
        true: { text: "Active", status: "Success" },
        false: { text: "Inactive", status: "Default" },
      },
      render: (_, record) => (
        <Tag color={record.is_active ? "green" : "default"}>
          {record.is_active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      valueType: "option",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingUser(record);
              setIsModalOpen(true);
            }}
          />
          <Tooltip title="Reset Password">
            <Button
              type="text"
              size="small"
              icon={<KeyOutlined />}
              onClick={() => {
                setResetPasswordUser(record);
                setIsResetPasswordModalOpen(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete user"
            description={`Delete ${record.username}?`}
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<User>
        headerTitle="User Management"
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        dataSource={users}
        loading={loading}
        search={{ labelWidth: "auto" }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
        }}
        toolBarRender={() => [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>,
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingUser(null);
              setIsModalOpen(true);
            }}
          >
            Add User
          </Button>,
        ]}
      />

      {/* Create/Edit User Modal */}
      <Modal
        title={
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            {editingUser ? "Edit User" : "Add User"}
          </span>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        footer={null}
        width={900}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Flex gap="middle">
            <Form.Item
              name="full_name"
              label="Full Name"
              rules={[{ required: true, message: "Required" }]}
              style={{ flex: 1 }}
            >
              <Input prefix={<UserOutlined />} placeholder="John Doe" />
            </Form.Item>
            <Form.Item
              name="username"
              label="Username / Email"
              rules={[{ required: true, message: "Required" }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="john@example.com" />
            </Form.Item>
          </Flex>

          <Flex gap="middle">
            <Form.Item
              name="role"
              label="Role"
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
                {ROLES.map((r) => (
                  <Select.Option key={r} value={r}>
                    {r.toUpperCase()}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            {!editingUser ? (
              <Form.Item
                name="password"
                label="Initial Password"
                rules={[{ required: true, message: "Required for new users" }]}
                style={{ flex: 1 }}
              >
                <Input.Password placeholder="Min 8 characters" />
              </Form.Item>
            ) : (
              <div style={{ flex: 1 }} />
            )}
          </Flex>

          <Divider>
            <Text
              strong
              style={{
                color: "#8c8c8c",
                fontSize: 12,
                letterSpacing: 0.5,
              }}
            >
              PERMISSIONS
            </Text>
          </Divider>

          <Form.Item name="permissions" noStyle>
            <PermissionToggles />
          </Form.Item>

          <Flex
            justify="flex-end"
            gap="small"
            style={{ marginTop: 20 }}
          >
            <Button
              onClick={() => {
                setIsModalOpen(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingUser ? "Update" : "Create"}
            </Button>
          </Flex>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            Reset Password — {resetPasswordUser?.username}
          </span>
        }
        open={isResetPasswordModalOpen}
        onCancel={() => setIsResetPasswordModalOpen(false)}
        footer={null}
        width={560}
        destroyOnHidden
      >
        <Form
          form={resetPasswordForm}
          layout="vertical"
          onFinish={handleResetPasswordSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label="New Password"
            name="new_password"
            rules={[
              { required: true, message: "Please enter a new password" },
              { min: 8, message: "Password must be at least 8 characters" },
            ]}
          >
            <Input.Password placeholder="Min 8 characters" />
          </Form.Item>
          <Form.Item
            label="Confirm New Password"
            name="confirm_password"
            dependencies={["new_password"]}
            rules={[
              { required: true, message: "Please confirm the new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Re-enter password" />
          </Form.Item>
          <Flex justify="flex-end" gap="small">
            <Button onClick={() => setIsResetPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={resetPasswordSubmitting}
            >
              Save
            </Button>
          </Flex>
        </Form>
      </Modal>

      <BulkActionBar
        selectedCount={selectedRowKeys.length}
        actions={[
          {
            key: "delete",
            label: "Delete",
            danger: true,
            icon: <DeleteOutlined />,
            onClick: handleBulkDelete,
          },
        ]}
        onClearSelection={() => setSelectedRowKeys([])}
      />
    </>
  );
}
