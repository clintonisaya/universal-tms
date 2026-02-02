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
  Select,
  message,
  Typography,
  Spin,
  Popconfirm,
} from "antd";
import { PlusOutlined, ReloadOutlined, ArrowLeftOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Trailer, TrailerCreate, TrailerUpdate, TrailerStatus, TrailerType, TrailersResponse } from "@/types/trailer";
import { useAuth } from "@/contexts/AuthContext";

const { Title } = Typography;

const STATUS_COLORS: Record<TrailerStatus, string> = {
  Idle: "green",
  Loading: "cyan",
  "In Transit": "blue",
  "At Border": "gold",
  Offloaded: "purple",
  Returned: "default",
  "Waiting for PODs": "magenta",
  Maintenance: "orange",
};

const TYPE_COLORS: Record<TrailerType, string> = {
  Flatbed: "cyan",
  Skeleton: "purple",
  Box: "gold",
  Tanker: "magenta",
};

export default function TrailersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm<TrailerCreate>();
  const [editForm] = Form.useForm<TrailerUpdate>();

  const fetchTrailers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/trailers/", {
        credentials: "include",
      });
      if (response.ok) {
        const data: TrailersResponse = await response.json();
        setTrailers(data.data);
        setTotalCount(data.count);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        message.error("Failed to fetch trailers");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTrailers();
    }
  }, [authLoading, user, fetchTrailers]);

  const handleCreate = async (values: TrailerCreate) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/trailers/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("Trailer registered successfully");
        setIsCreateModalOpen(false);
        createForm.resetFields();
        fetchTrailers();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create trailer");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: TrailerUpdate) => {
    if (!editingTrailer) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/trailers/${editingTrailer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("Trailer updated successfully");
        setIsEditModalOpen(false);
        setEditingTrailer(null);
        editForm.resetFields();
        fetchTrailers();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update trailer");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (trailer: Trailer) => {
    try {
      const response = await fetch(`/api/v1/trailers/${trailer.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        message.success("Trailer deleted successfully");
        fetchTrailers();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete trailer");
      }
    } catch {
      message.error("Network error");
    }
  };

  const openEditModal = (trailer: Trailer) => {
    setEditingTrailer(trailer);
    editForm.setFieldsValue({
      plate_number: trailer.plate_number,
      type: trailer.type,
      make: trailer.make,
      status: trailer.status,
    });
    setIsEditModalOpen(true);
  };

  const columns: ColumnsType<Trailer> = [
    {
      title: "Plate Number",
      dataIndex: "plate_number",
      key: "plate_number",
      sorter: (a, b) => a.plate_number.localeCompare(b.plate_number),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: TrailerType) => (
        <Tag color={TYPE_COLORS[type]}>{type}</Tag>
      ),
      filters: [
        { text: "Flatbed", value: "Flatbed" },
        { text: "Skeleton", value: "Skeleton" },
        { text: "Box", value: "Box" },
        { text: "Tanker", value: "Tanker" },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: "Make",
      dataIndex: "make",
      key: "make",
      sorter: (a, b) => a.make.localeCompare(b.make),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: TrailerStatus) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
      filters: [
        { text: "Idle", value: "Idle" },
        { text: "In Transit", value: "In Transit" },
        { text: "Maintenance", value: "Maintenance" },
      ],
      onFilter: (value, record) => record.status === value,
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
            title="Delete trailer"
            description={`Are you sure you want to delete ${record.plate_number}?`}
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
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "24px",
      }}
    >
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
                Trailer Registry
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchTrailers}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                New Trailer
              </Button>
            </Space>
          </div>

          <Table<Trailer>
            columns={columns}
            dataSource={trailers}
            rowKey="id"
            loading={loading}
            pagination={{
              total: totalCount,
              showTotal: (total) => `Total ${total} trailers`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
          />
        </Space>
      </Card>

      {/* Create Modal */}
      <Modal
        title="Register New Trailer"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form<TrailerCreate>
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ status: "Idle", type: "Flatbed" }}
        >
          <Form.Item
            name="plate_number"
            label="Plate Number"
            rules={[
              { required: true, message: "Please enter plate number" },
              { max: 20, message: "Plate number too long" },
            ]}
          >
            <Input placeholder="e.g., ZD 4040" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: "Please select trailer type" }]}
          >
            <Select>
              <Select.Option value="Flatbed">Flatbed</Select.Option>
              <Select.Option value="Skeleton">Skeleton</Select.Option>
              <Select.Option value="Box">Box</Select.Option>
              <Select.Option value="Tanker">Tanker</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="make"
            label="Make"
            rules={[
              { required: true, message: "Please enter make" },
              { max: 100, message: "Make name too long" },
            ]}
          >
            <Input placeholder="e.g., Hambure" />
          </Form.Item>

          <Form.Item name="status" label="Status">
            <Select>
              <Select.Option value="Idle">Idle</Select.Option>
              <Select.Option value="In Transit">In Transit</Select.Option>
              <Select.Option value="Maintenance">Maintenance</Select.Option>
            </Select>
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
                Register Trailer
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Trailer"
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingTrailer(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form<TrailerUpdate>
          form={editForm}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="plate_number"
            label="Plate Number"
            rules={[
              { required: true, message: "Please enter plate number" },
              { max: 20, message: "Plate number too long" },
            ]}
          >
            <Input placeholder="e.g., ZD 4040" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: "Please select trailer type" }]}
          >
            <Select>
              <Select.Option value="Flatbed">Flatbed</Select.Option>
              <Select.Option value="Skeleton">Skeleton</Select.Option>
              <Select.Option value="Box">Box</Select.Option>
              <Select.Option value="Tanker">Tanker</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="make"
            label="Make"
            rules={[
              { required: true, message: "Please enter make" },
              { max: 100, message: "Make name too long" },
            ]}
          >
            <Input placeholder="e.g., Hambure" />
          </Form.Item>

          <Form.Item name="status" label="Status">
            <Select>
              <Select.Option value="Idle">Idle</Select.Option>
              <Select.Option value="In Transit">In Transit</Select.Option>
              <Select.Option value="Maintenance">Maintenance</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTrailer(null);
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
