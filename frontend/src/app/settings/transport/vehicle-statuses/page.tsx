"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Typography,
  Spin,
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
  VehicleStatus,
  VehicleStatusCreate,
  VehicleStatusUpdate,
  VehicleStatusesResponse,
} from "@/types/vehicle-status";
import { useAuth } from "@/contexts/AuthContext";

const { Title } = Typography;
const { TextArea } = Input;

export default function VehicleStatusesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [statuses, setStatuses] = useState<VehicleStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<VehicleStatus | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm<VehicleStatusCreate>();
  const [editForm] = Form.useForm<VehicleStatusUpdate>();

  const fetchStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/vehicle-statuses/", {
        credentials: "include",
      });
      if (response.ok) {
        const data: VehicleStatusesResponse = await response.json();
        setStatuses(data.data);
        setTotalCount(data.count);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        message.error("Failed to fetch vehicle statuses");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchStatuses();
    }
  }, [authLoading, user, fetchStatuses]);

  const handleCreate = async (values: VehicleStatusCreate) => {
    setSubmitting(true);
    try {
      const payload = { ...values, is_active: values.is_active ?? true };
      const response = await fetch("/api/v1/vehicle-statuses/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        message.success("Vehicle status added successfully");
        setIsCreateModalOpen(false);
        createForm.resetFields();
        fetchStatuses();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create vehicle status");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: VehicleStatusUpdate) => {
    if (!editingStatus) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/v1/vehicle-statuses/${editingStatus.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(values),
        }
      );
      if (response.ok) {
        message.success("Vehicle status updated successfully");
        setIsEditModalOpen(false);
        setEditingStatus(null);
        editForm.resetFields();
        fetchStatuses();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update vehicle status");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (status: VehicleStatus) => {
    try {
      const response = await fetch(`/api/v1/vehicle-statuses/${status.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        message.success("Vehicle status deleted successfully");
        fetchStatuses();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete vehicle status");
      }
    } catch {
      message.error("Network error");
    }
  };

  const openEditModal = (status: VehicleStatus) => {
    setEditingStatus(status);
    editForm.setFieldsValue({
      name: status.name,
      description: status.description || undefined,
      is_active: status.is_active,
    });
    setIsEditModalOpen(true);
  };

  const columns: ColumnsType<VehicleStatus> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (desc: string | null) => desc || "-",
    },
    {
      title: "Active",
      dataIndex: "is_active",
      key: "is_active",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "red"}>{active ? "Active" : "Inactive"}</Tag>
      ),
      filters: [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Delete vehicle status"
            description={`Delete "${record.name}"?`}
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
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
    <div>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
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
                Vehicle Statuses
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchStatuses}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Add Vehicle Status
              </Button>
            </Space>
          </div>

          <Table<VehicleStatus>
            columns={columns}
            dataSource={statuses}
            rowKey="id"
            loading={loading}
            pagination={{
              total: totalCount,
              showTotal: (total) => `Total ${total} vehicle statuses`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
          />
        </Space>
      </Card>

      {/* Create Modal */}
      <Modal
        title="Add Vehicle Status"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form<VehicleStatusCreate>
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please enter a status name" },
              { max: 255, message: "Name too long" },
            ]}
          >
            <Input placeholder="e.g., Waiting Offloading" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 500, message: "Description too long" }]}
          >
            <TextArea
              placeholder="e.g., Vehicle waiting at destination to be offloaded"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
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
                Add Vehicle Status
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Vehicle Status"
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingStatus(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form<VehicleStatusUpdate>
          form={editForm}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please enter a status name" },
              { max: 255, message: "Name too long" },
            ]}
          >
            <Input placeholder="e.g., Waiting Offloading" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 500, message: "Description too long" }]}
          >
            <TextArea
              placeholder="e.g., Vehicle waiting at destination to be offloaded"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingStatus(null);
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
