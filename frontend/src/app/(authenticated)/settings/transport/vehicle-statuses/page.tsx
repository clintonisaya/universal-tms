"use client";

import { useState } from "react";
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
} from "@/types/vehicle-status";
import { useAuth } from "@/contexts/AuthContext";
import { useVehicleStatuses, useInvalidateQueries } from "@/hooks/useApi";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title } = Typography;
const { TextArea } = Input;

const STATUS_FILTERS = [
  { text: "Active", value: true },
  { text: "Inactive", value: false },
];

export default function VehicleStatusesPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // TanStack Query for vehicle statuses
  const { data, isLoading: loading, refetch } = useVehicleStatuses();
  const { invalidateVehicleStatuses } = useInvalidateQueries();

  const statuses = (data?.data || []) as VehicleStatus[];
  const totalCount = data?.count || 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<VehicleStatus | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [createForm] = Form.useForm<VehicleStatusCreate>();
  const [editForm] = Form.useForm<VehicleStatusUpdate>();

  const handleCreate = async (values: VehicleStatusCreate) => {
    setSubmitting(true);
    try {
      const payload = { ...values, is_active: values.is_active ?? true };
      const response = await fetch("/api/v1/vehicle-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        message.success("Vehicle status added successfully");
        setIsCreateModalOpen(false);
        createForm.resetFields();
        invalidateVehicleStatuses();
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
        invalidateVehicleStatuses();
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
        invalidateVehicleStatuses();
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
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? "success" : "error"}>{active ? "Active" : "Inactive"}</Tag>
      ),
      ...getColumnFilterProps("is_active", STATUS_FILTERS),
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
              aria-label="Edit Vehicle Status"
            />
            <Popconfirm
              title="Delete vehicle status"
              description={`Delete "${record.name}"?`}
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="Delete Vehicle Status" />
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
                Vehicle Statuses
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
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
            columns={resizableColumns}
            components={components}
            dataSource={statuses}
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
              showTotal: (total) => `Total ${total} vehicle statuses`,
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
        title="Add Vehicle Status"
        open={isCreateModalOpen}
        width={600}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
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
        width={600}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingStatus(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
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