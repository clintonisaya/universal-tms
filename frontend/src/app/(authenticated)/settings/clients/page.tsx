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
  message,
  Typography,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type {
  Client,
  ClientCreate,
  ClientUpdate,
} from "@/types/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClients, useInvalidateQueries } from "@/hooks/useApi";
import {
  getColumnSearchProps,
  getStandardRowSelection,
} from "@/components/ui/tableUtils";

const { Title } = Typography;

export default function ClientsPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // TanStack Query for clients data
  const { data, isLoading: loading, refetch } = useClients();
  const { invalidateClients } = useInvalidateQueries();
  
  const clients = (data?.data || []) as Client[];
  const totalCount = data?.count || 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [createForm] = Form.useForm<ClientCreate>();
  const [editForm] = Form.useForm<ClientUpdate>();

  const generateSystemId = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `CLT-${random}`;
  };

  const openCreateModal = () => {
    createForm.setFieldsValue({
      system_id: generateSystemId(),
    });
    setIsCreateModalOpen(true);
  };

  const handleCreate = async (values: ClientCreate) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (response.ok) {
        message.success("Client added successfully");
        setIsCreateModalOpen(false);
        createForm.resetFields();
        invalidateClients();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create client");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: ClientUpdate) => {
    if (!editingClient) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/clients/${editingClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (response.ok) {
        message.success("Client updated successfully");
        setIsEditModalOpen(false);
        setEditingClient(null);
        editForm.resetFields();
        invalidateClients();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update client");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (client: Client) => {
    try {
      const response = await fetch(`/api/v1/clients/${client.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        message.success("Client deleted successfully");
        invalidateClients();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete client");
      }
    } catch {
      message.error("Network error");
    }
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    editForm.setFieldsValue({
      name: client.name,
      system_id: client.system_id,
      tin: client.tin || undefined,
    });
    setIsEditModalOpen(true);
  };

  const columns: ColumnsType<Client> = [
    {
      title: "System ID",
      dataIndex: "system_id",
      key: "system_id",
      sorter: (a, b) => a.system_id.localeCompare(b.system_id),
      ...getColumnSearchProps("system_id"),
    },
    {
      title: "Client Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      ...getColumnSearchProps("name"),
    },
    {
      title: "TIN",
      dataIndex: "tin",
      key: "tin",
      render: (tin: string | null) => tin || "-",
      ...getColumnSearchProps("tin"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <div className="row-actions">
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              aria-label="Edit Client"
            />
            <Popconfirm
              title="Delete client"
              description={`Delete "${record.name}"?`}
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete Client" />
            </Popconfirm>
          </Space>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
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
                onClick={() => router.push("/dashboard")}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Client Settings
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateModal}
              >
                Add Client
              </Button>
            </Space>
          </div>

          <Table<Client>
            columns={columns}
            dataSource={clients}
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
              showTotal: (total) => `Total ${total} clients`,
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
        title="Add Client"
        open={isCreateModalOpen}
        width={600}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form<ClientCreate>
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="system_id"
            label="System ID"
            rules={[{ required: true, message: "System ID is required" }]}
          >
            <Input placeholder="e.g., CLT-1001" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Client Name"
            rules={[
              { required: true, message: "Please enter client name" },
              { max: 255, message: "Name too long" },
            ]}
          >
            <Input placeholder="e.g., Africa Walk Logistics" />
          </Form.Item>

          <Form.Item
            name="tin"
            label="TIN (Tax Identification Number)"
            rules={[{ max: 50, message: "TIN too long" }]}
          >
            <Input placeholder="e.g., 100-200-300" />
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
                Add Client
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Client"
        open={isEditModalOpen}
        width={600}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingClient(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form<ClientUpdate>
          form={editForm}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="system_id"
            label="System ID"
            rules={[{ required: true, message: "System ID is required" }]}
          >
            <Input placeholder="e.g., CLT-1001" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Client Name"
            rules={[
              { required: true, message: "Please enter client name" },
              { max: 255, message: "Name too long" },
            ]}
          >
            <Input placeholder="e.g., Africa Walk Logistics" />
          </Form.Item>

          <Form.Item
            name="tin"
            label="TIN"
            rules={[{ max: 50, message: "TIN too long" }]}
          >
            <Input placeholder="e.g., 100-200-300" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingClient(null);
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
