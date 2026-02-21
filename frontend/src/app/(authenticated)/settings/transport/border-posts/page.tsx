"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Typography,
  Popconfirm,
  Tag,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  StopOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useAuth } from "@/contexts/AuthContext";
import { useBorderPosts, useInvalidateQueries } from "@/hooks/useApi";
import {
  getColumnSearchProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title } = Typography;

interface BorderPost {
  id: string;
  display_name: string;
  side_a_name: string;
  side_b_name: string;
  is_active: boolean;
  created_at: string | null;
}

interface BorderPostCreate {
  display_name: string;
  side_a_name: string;
  side_b_name: string;
  is_active?: boolean;
}

export default function BorderPostsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { data, isLoading: loading, refetch } = useBorderPosts(false);
  const { invalidateBorderPosts } = useInvalidateQueries();

  const borderPosts = (data?.data || []) as BorderPost[];
  const totalCount = data?.count || 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BorderPost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [createForm] = Form.useForm<BorderPostCreate>();
  const [editForm] = Form.useForm<Partial<BorderPostCreate>>();

  const canWrite = user?.role === "admin" || user?.role === "manager";

  // Auto-fill display_name when side_a or side_b changes (create form only)
  const handleSideChange = () => {
    const sideA = createForm.getFieldValue("side_a_name") || "";
    const sideB = createForm.getFieldValue("side_b_name") || "";
    if (sideA || sideB) {
      createForm.setFieldValue("display_name", `${sideA} / ${sideB}`);
    }
  };

  const handleCreate = async (values: BorderPostCreate) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/border-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (response.ok) {
        message.success("Border post added successfully");
        setIsCreateModalOpen(false);
        createForm.resetFields();
        invalidateBorderPosts();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create border post");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: Partial<BorderPostCreate>) => {
    if (!editingPost) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/border-posts/${editingPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (response.ok) {
        message.success("Border post updated successfully");
        setIsEditModalOpen(false);
        setEditingPost(null);
        editForm.resetFields();
        invalidateBorderPosts();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update border post");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (post: BorderPost) => {
    try {
      const response = await fetch(`/api/v1/border-posts/${post.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        message.success("Border post deactivated");
        invalidateBorderPosts();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to deactivate border post");
      }
    } catch {
      message.error("Network error");
    }
  };

  const openEditModal = (post: BorderPost) => {
    setEditingPost(post);
    editForm.setFieldsValue({
      display_name: post.display_name,
      side_a_name: post.side_a_name,
      side_b_name: post.side_b_name,
      is_active: post.is_active,
    });
    setIsEditModalOpen(true);
  };

  const columns: ColumnsType<BorderPost> = [
    {
      title: "Display Name",
      dataIndex: "display_name",
      key: "display_name",
      width: 220,
      sorter: (a, b) => a.display_name.localeCompare(b.display_name),
      render: (text: string) => <div style={{ fontWeight: 600 }}>{text}</div>,
      ...getColumnSearchProps("display_name"),
    },
    {
      title: "Side A (Go Direction)",
      dataIndex: "side_a_name",
      key: "side_a_name",
      width: 180,
      render: (text: string) => <Tag color="default">{text}</Tag>,
      ...getColumnSearchProps("side_a_name"),
    },
    {
      title: "Side B (Return Direction)",
      dataIndex: "side_b_name",
      key: "side_b_name",
      width: 180,
      render: (text: string) => <Tag color="geekblue">{text}</Tag>,
      ...getColumnSearchProps("side_b_name"),
    },
    {
      title: "Active",
      dataIndex: "is_active",
      key: "is_active",
      width: 80,
      render: (active: boolean) =>
        active ? <Tag color="success">Active</Tag> : <Tag color="default">Inactive</Tag>,
      filters: [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
          <Space size="small">
            {canWrite && (
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
                aria-label="Edit Border Post"
              />
            )}
            {canWrite && record.is_active && (
              <Popconfirm
                title="Deactivate border post"
                description={`Deactivate "${record.display_name}"? It will no longer appear in the border picker.`}
                onConfirm={() => handleDeactivate(record)}
                okText="Deactivate"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger size="small" icon={<StopOutlined />} aria-label="Deactivate Border Post" />
              </Popconfirm>
            )}
          </Space>
        </div>
      ),
    },
  ];

  const { resizableColumns, components } = useResizableColumns(columns);

  return (
    <div>
      <Card>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/settings")}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Border Posts
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
              {canWrite && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Add Border Post
                </Button>
              )}
            </Space>
          </div>

          <Table<BorderPost>
            columns={resizableColumns}
            components={components}
            dataSource={borderPosts}
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
              showTotal: (total) => `Total ${total} border posts`,
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

      {/* Create Modal */}
      <Modal
        title="Add Border Post"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form<BorderPostCreate>
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="side_a_name"
            label="Side A Name (Go Direction — first side trucks arrive at)"
            rules={[{ required: true, message: "Enter Side A name" }]}
          >
            <Input placeholder="e.g., Tunduma" onChange={handleSideChange} />
          </Form.Item>

          <Form.Item
            name="side_b_name"
            label="Side B Name (Return Direction — second side / return entry)"
            rules={[{ required: true, message: "Enter Side B name" }]}
          >
            <Input placeholder="e.g., Nakonde" onChange={handleSideChange} />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="Display Name (auto-filled, editable)"
            rules={[{ required: true, message: "Enter a display name" }]}
          >
            <Input placeholder="e.g., Tunduma / Nakonde" />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch defaultChecked />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  createForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Add Border Post
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Border Post"
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingPost(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form<Partial<BorderPostCreate>>
          form={editForm}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="side_a_name"
            label="Side A Name (Go Direction)"
            rules={[{ required: true, message: "Enter Side A name" }]}
          >
            <Input placeholder="e.g., Tunduma" />
          </Form.Item>

          <Form.Item
            name="side_b_name"
            label="Side B Name (Return Direction)"
            rules={[{ required: true, message: "Enter Side B name" }]}
          >
            <Input placeholder="e.g., Nakonde" />
          </Form.Item>

          <Form.Item
            name="display_name"
            label="Display Name"
            rules={[{ required: true, message: "Enter a display name" }]}
          >
            <Input placeholder="e.g., Tunduma / Nakonde" />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPost(null);
                  editForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Save Changes
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
