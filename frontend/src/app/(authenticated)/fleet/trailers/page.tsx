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
import { PlusOutlined, ReloadOutlined, ArrowLeftOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Trailer, TrailerCreate, TrailerUpdate, TrailerType, TrailersResponse } from "@/types/trailer";
import { useAuth } from "@/contexts/AuthContext";
import { useTrailers, useInvalidateQueries } from "@/hooks/useApi";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";
import { VehicleStatusTag } from "@/components/ui/VehicleStatusTag";

const { Title } = Typography;


const STATUS_FILTERS = [
  { text: "Idle", value: "Idle" },
  { text: "In Transit", value: "In Transit" },
  { text: "Maintenance", value: "Maintenance" },
];

const TYPE_COLORS: Record<TrailerType, string> = {
  Flatbed: "cyan",
  Skeleton: "purple",
  Box: "gold",
  Tanker: "magenta",
  Lowbed: "volcano",
};

const TYPE_FILTERS = [
  { text: "Flatbed", value: "Flatbed" },
  { text: "Skeleton", value: "Skeleton" },
  { text: "Box", value: "Box" },
  { text: "Tanker", value: "Tanker" },
  { text: "Lowbed", value: "Lowbed" },
];

export default function TrailersPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useTrailers();
  const { invalidateTrailers } = useInvalidateQueries();

  const trailers = (data?.data || []) as Trailer[];
  const totalCount = data?.count || 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [createForm] = Form.useForm<TrailerCreate>();
  const [editForm] = Form.useForm<TrailerUpdate>();

  const handleCreate = async (values: TrailerCreate) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/trailers", {
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
        invalidateTrailers();
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
        invalidateTrailers();
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
        invalidateTrailers();
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
      width: 160,
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
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type: TrailerType) => (
        <Tag color={TYPE_COLORS[type]}>{type}</Tag>
      ),
      ...getColumnFilterProps("type", TYPE_FILTERS),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => <VehicleStatusTag status={status} />,
      ...getColumnFilterProps("status", STATUS_FILTERS),
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
              aria-label={`Edit Trailer ${record.plate_number}`}
            />
            <Popconfirm
              title="Delete trailer"
              description={`Are you sure you want to delete ${record.plate_number}?`}
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" aria-label={`Delete Trailer ${record.plate_number}`} />
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
                Trailer Registry
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
                New Trailer
              </Button>
            </Space>
          </div>

          <Table<Trailer>
            columns={resizableColumns}
            components={components}
            dataSource={trailers}
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
              showTotal: (total) => `Total ${total} trailers`,
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
        title="Register New Trailer"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
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
            <Input placeholder="e.g., T998 EMQ" />
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
              <Select.Option value="Lowbed">Lowbed</Select.Option>
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
            <Input placeholder="e.g., CIMC" />
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
        destroyOnHidden
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
              <Select.Option value="Lowbed">Lowbed</Select.Option>
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
