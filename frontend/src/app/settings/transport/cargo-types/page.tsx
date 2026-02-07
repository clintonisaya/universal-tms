"use client";

import { useState, useEffect, useCallback } from "react";
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
  CargoType,
  CargoTypeCreate,
  CargoTypeUpdate,
  CargoTypesResponse,
} from "@/types/cargo-type";
import { useAuth } from "@/contexts/AuthContext";
import {
  getColumnSearchProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title } = Typography;
const { TextArea } = Input;

export default function CargoTypesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [cargoTypes, setCargoTypes] = useState<CargoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCargoType, setEditingCargoType] = useState<CargoType | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [createForm] = Form.useForm<CargoTypeCreate>();
  const [editForm] = Form.useForm<CargoTypeUpdate>();

  const fetchCargoTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/cargo-types/", {
        credentials: "include",
      });
      if (response.ok) {
        const data: CargoTypesResponse = await response.json();
        setCargoTypes(data.data);
        setTotalCount(data.count);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        message.error("Failed to fetch cargo types");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchCargoTypes();
    }
  }, [authLoading, user, fetchCargoTypes]);

  const handleCreate = async (values: CargoTypeCreate) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/cargo-types/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (response.ok) {
        message.success("Cargo type added successfully");
        setIsCreateModalOpen(false);
        createForm.resetFields();
        fetchCargoTypes();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create cargo type");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: CargoTypeUpdate) => {
    if (!editingCargoType) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/v1/cargo-types/${editingCargoType.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(values),
        }
      );
      if (response.ok) {
        message.success("Cargo type updated successfully");
        setIsEditModalOpen(false);
        setEditingCargoType(null);
        editForm.resetFields();
        fetchCargoTypes();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update cargo type");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cargoType: CargoType) => {
    try {
      const response = await fetch(`/api/v1/cargo-types/${cargoType.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        message.success("Cargo type deleted successfully");
        fetchCargoTypes();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete cargo type");
      }
    } catch {
      message.error("Network error");
    }
  };

  const openEditModal = (cargoType: CargoType) => {
    setEditingCargoType(cargoType);
    editForm.setFieldsValue({
      name: cargoType.name,
      description: cargoType.description || undefined,
    });
    setIsEditModalOpen(true);
  };

  const columns: ColumnsType<CargoType> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string) => (
        <div style={{ fontWeight: 600 }}>{text}</div>
      ),
      ...getColumnSearchProps("name"),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (desc: string | null) => desc || "-",
      ...getColumnSearchProps("description"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
            <Popconfirm
              title="Delete cargo type"
              description={`Delete "${record.name}"?`}
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        </div>
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

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
                Cargo Types
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchCargoTypes}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Add Cargo Type
              </Button>
            </Space>
          </div>

          <Table<CargoType>
            columns={resizableColumns}
            components={components}
            dataSource={cargoTypes}
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
              showTotal: (total) => `Total ${total} cargo types`,
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
        title="Add Cargo Type"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form<CargoTypeCreate>
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please enter a cargo type name" },
              { max: 255, message: "Name too long" },
            ]}
          >
            <Input placeholder="e.g., 20' Container" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 500, message: "Description too long" }]}
          >
            <TextArea
              placeholder="e.g., Standard 20-foot shipping container"
              rows={3}
            />
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
                Add Cargo Type
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Cargo Type"
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingCargoType(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form<CargoTypeUpdate>
          form={editForm}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please enter a cargo type name" },
              { max: 255, message: "Name too long" },
            ]}
          >
            <Input placeholder="e.g., 20' Container" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 500, message: "Description too long" }]}
          >
            <TextArea
              placeholder="e.g., Standard 20-foot shipping container"
              rows={3}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingCargoType(null);
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
