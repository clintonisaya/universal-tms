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
  Select,
  App,
  Typography,
  Popconfirm,
} from "antd";
import { PlusOutlined, ReloadOutlined, ArrowLeftOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Truck, TruckCreate, TruckUpdate } from "@/types/truck";
import { useAuth } from "@/contexts/AuthContext";
import { useTrucks, useInvalidateQueries } from "@/hooks/useApi";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  Idle: "green",
  Loading: "cyan",
  "In Transit": "blue",
  "At Border": "gold",
  Offloaded: "purple",
  Returned: "default",
  "Waiting for PODs": "magenta",
  Maintenance: "orange",
};

const STATUS_FILTERS = [
  { text: "Idle", value: "Idle" },
  { text: "In Transit", value: "In Transit" },
  { text: "Maintenance", value: "Maintenance" },
];

export default function TrucksPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useTrucks();
  const { invalidateTrucks } = useInvalidateQueries();

  const trucks = (data?.data || []) as Truck[];
  const totalCount = data?.count || 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [createForm] = Form.useForm<TruckCreate>();
  const [editForm] = Form.useForm<TruckUpdate>();

  const handleCreate = async (values: TruckCreate) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/trucks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("Truck registered successfully");
        createForm.resetFields();
        setIsCreateModalOpen(false);
        invalidateTrucks();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create truck");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: TruckUpdate) => {
    if (!editingTruck) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/trucks/${editingTruck.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("Truck updated successfully");
        editForm.resetFields();
        setIsEditModalOpen(false);
        setEditingTruck(null);
        invalidateTrucks();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update truck");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (truck: Truck) => {
    try {
      const response = await fetch(`/api/v1/trucks/${truck.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        message.success("Truck deleted successfully");
        invalidateTrucks();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete truck");
      }
    } catch {
      message.error("Network error");
    }
  };

  const openEditModal = (truck: Truck) => {
    setEditingTruck(truck);
    editForm.setFieldsValue({
      plate_number: truck.plate_number,
      make: truck.make,
      model: truck.model,
      status: truck.status,
    });
    setIsEditModalOpen(true);
  };

  const columns: ColumnsType<Truck> = [
    {
      title: "Plate Number",
      dataIndex: "plate_number",
      key: "plate_number",
      width: 150,
      sorter: (a, b) => a.plate_number.localeCompare(b.plate_number),
      render: (text: string) => (
        <div style={{ fontWeight: 600 }}>{text}</div>
      ),
      ...getColumnSearchProps("plate_number"),
    },
    {
      title: "Make",
      dataIndex: "make",
      key: "make",
      width: 140,
      render: (text: string) => text || "-",
      ...getColumnSearchProps("make"),
    },
    {
      title: "Model",
      dataIndex: "model",
      key: "model",
      width: 140,
      render: (text: string) => text || "-",
      ...getColumnSearchProps("model"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status] || "default"}>{status}</Tag>
      ),
      ...getColumnFilterProps("status", STATUS_FILTERS),
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              title="View Details"
              onClick={() => router.push(`/fleet/trucks/${record.id}`)}
            />
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
            <Popconfirm
              title="Delete truck"
              description={`Are you sure you want to delete ${record.plate_number}?`}
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "24px",
      }}
    >
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
                Truck Registry
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
                New Truck
              </Button>
            </Space>
          </div>

          <Table<Truck>
            columns={resizableColumns}
            components={components}
            dataSource={trucks}
            rowKey="id"
            loading={isLoading}
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
              showTotal: (total) => `Total ${total} trucks`,
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
        title="Register New Truck"
        open={isCreateModalOpen}
        onCancel={() => {
          createForm.resetFields();
          setIsCreateModalOpen(false);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form<TruckCreate>
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ status: "Idle" }}
        >
          <Form.Item
            name="plate_number"
            label="Plate Number"
            rules={[
              { required: true, message: "Please enter plate number" },
              { max: 20, message: "Plate number too long" },
            ]}
          >
            <Input placeholder="e.g., T998 EMQ" />
          </Form.Item>

          <Form.Item
            name="make"
            label="Make"
            rules={[
              { required: true, message: "Please enter make" },
              { max: 100, message: "Make name too long" },
            ]}
          >
            <Input placeholder="e.g., XCMG " />
          </Form.Item>

          <Form.Item
            name="model"
            label="Model"
            rules={[
              { required: true, message: "Please enter model" },
              { max: 100, message: "Model name too long" },
            ]}
          >
            <Input placeholder="e.g., HANVAN G7" />
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
                  createForm.resetFields();
                  setIsCreateModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Register Truck
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Truck"
        open={isEditModalOpen}
        onCancel={() => {
          editForm.resetFields();
          setIsEditModalOpen(false);
          setEditingTruck(null);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form<TruckUpdate>
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
            <Input placeholder="e.g., KCB 123A" />
          </Form.Item>

          <Form.Item
            name="make"
            label="Make"
            rules={[
              { required: true, message: "Please enter make" },
              { max: 100, message: "Make name too long" },
            ]}
          >
            <Input placeholder="e.g., Mercedes" />
          </Form.Item>

          <Form.Item
            name="model"
            label="Model"
            rules={[
              { required: true, message: "Please enter model" },
              { max: 100, message: "Model name too long" },
            ]}
          >
            <Input placeholder="e.g., Actros" />
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
                  editForm.resetFields();
                  setIsEditModalOpen(false);
                  setEditingTruck(null);
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
