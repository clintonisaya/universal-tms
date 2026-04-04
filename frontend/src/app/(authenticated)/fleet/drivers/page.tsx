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
  Select,
  message,
  Typography,
  Popconfirm,
  DatePicker,
  Tooltip,
  theme,
} from "antd";
import dayjs from "dayjs";
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type {
  Driver,
  DriverCreate,
  DriverUpdate,
  DriverStatus,
  DriversResponse,
  DriverFormValues,
} from "@/types/driver";
import { useAuth } from "@/contexts/AuthContext";
import { useDrivers, useInvalidateQueries } from "@/hooks/useApi";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";
import { EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ColorKey } from "@/components/ui/StatusBadge";

const { Title, Text } = Typography;

const EXPIRY_WARNING_DAYS = 30;

const STATUS_COLORS: Record<DriverStatus, ColorKey> = {
  Active: "green",
  Assigned: "cyan",
  "On Trip": "blue",
  Inactive: "gray",
};

const STATUS_FILTERS = [
  { text: "Active", value: "Active" },
  { text: "On Trip", value: "On Trip" },
  { text: "Inactive", value: "Inactive" },
];

export default function DriversPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useDrivers();
  const { invalidateDrivers } = useInvalidateQueries();

  const drivers = (data?.data || []) as Driver[];
  const totalCount = data?.count || 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [createForm] = Form.useForm<DriverFormValues>();
  const [editForm] = Form.useForm<DriverFormValues>();
  const { token } = theme.useToken();

  const renderExpiryDate = (date: string | null) => {
    if (!date) return <Text type="secondary">—</Text>;
    const days = dayjs(date).diff(dayjs(), "day");
    const formatted = new Date(date).toLocaleDateString();
    if (days < 0) {
      return (
        <Tooltip title="Expired — renew immediately.">
          <Text type="danger"><WarningOutlined /> {formatted}</Text>
        </Tooltip>
      );
    }
    if (days <= EXPIRY_WARNING_DAYS) {
      return (
        <Tooltip title={`Expires in ${days} days.`}>
          <Text style={{ color: token.colorWarning }}><ClockCircleOutlined /> {formatted}</Text>
        </Tooltip>
      );
    }
    return <Text>{formatted}</Text>;
  };

  const pastDateValidator = {
    validator: (_: unknown, value: dayjs.Dayjs | null) => {
      if (value && dayjs(value).isBefore(dayjs(), "day")) {
        return Promise.reject("This date is in the past. Are you sure?");
      }
      return Promise.resolve();
    },
    warningOnly: true,
  };

  const handleCreate = async (values: DriverCreate) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/drivers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("Driver registered successfully");
        setIsCreateModalOpen(false);
        createForm.resetFields();
        invalidateDrivers();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create driver");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: DriverUpdate) => {
    if (!editingDriver) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/drivers/${editingDriver.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("Driver updated successfully");
        setIsEditModalOpen(false);
        setEditingDriver(null);
        editForm.resetFields();
        invalidateDrivers();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update driver");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (driver: Driver) => {
    try {
      const response = await fetch(`/api/v1/drivers/${driver.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        message.success("Driver deleted successfully");
        invalidateDrivers();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete driver");
      }
    } catch {
      message.error("Network error");
    }
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    editForm.setFieldsValue({
      full_name: driver.full_name,
      license_number: driver.license_number,
      license_expiry_date: driver.license_expiry_date
        ? dayjs(driver.license_expiry_date)
        : null,
      passport_number: driver.passport_number,
      passport_expiry_date: driver.passport_expiry_date
        ? dayjs(driver.passport_expiry_date)
        : null,
      phone_number: driver.phone_number,
      status: driver.status,
    });
    setIsEditModalOpen(true);
  };

  const columns: ColumnsType<Driver> = [
    {
      title: "Full Name",
      dataIndex: "full_name",
      key: "full_name",
      width: 180,
      sorter: (a, b) => a.full_name.localeCompare(b.full_name),
      render: (text: string) => text,
      ...getColumnSearchProps("full_name"),
    },
    {
      title: "Phone",
      dataIndex: "phone_number",
      key: "phone_number",
      width: 140,
      render: (text: string) => text || "-",
      ...getColumnSearchProps("phone_number"),
    },
    {
      title: "License #",
      dataIndex: "license_number",
      key: "license_number",
      width: 140,
      render: (text: string) => text || "-",
      ...getColumnSearchProps("license_number"),
    },
    {
      title: "License Expiry",
      dataIndex: "license_expiry_date",
      key: "license_expiry_date",
      width: 120,
      render: (date: string | null) => renderExpiryDate(date),
      sorter: (a, b) => (a.license_expiry_date || "").localeCompare(b.license_expiry_date || ""),
    },
    {
      title: "Passport #",
      dataIndex: "passport_number",
      key: "passport_number",
      width: 140,
      render: (text: string) => text || "-",
      ...getColumnSearchProps("passport_number"),
    },
    {
      title: "Passport Expiry",
      dataIndex: "passport_expiry_date",
      key: "passport_expiry_date",
      width: 120,
      render: (date: string | null) => renderExpiryDate(date),
      sorter: (a, b) => (a.passport_expiry_date || "").localeCompare(b.passport_expiry_date || ""),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: DriverStatus) => (
        <StatusBadge status={status} colorKey={STATUS_COLORS[status]} />
      ),
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
              aria-label={`Edit Driver ${record.full_name}`}
            />
            <Popconfirm
              title="Delete driver"
              description={`Are you sure you want to delete ${record.full_name}?`}
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" aria-label={`Delete Driver ${record.full_name}`} />
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
        background: "var(--color-bg)",
        padding: "var(--space-xl)",
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
                Driver Registry
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
                New Driver
              </Button>
            </Space>
          </div>

          <Table<Driver>
            columns={resizableColumns}
            components={components}
            dataSource={drivers}
            rowKey="id"
            loading={isLoading}
            sticky={{ offsetHeader: 64 }}
            scroll={{ x: "max-content" }}
            locale={{ emptyText: <EmptyState message="No drivers registered yet." action={{ label: "Add First Driver", onClick: () => setIsCreateModalOpen(true) }} /> }}
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
              showTotal: (total) => `Total ${total} drivers`,
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
        title="Register New Driver"
        open={isCreateModalOpen}
        width={720}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form<DriverFormValues>
          form={createForm}
          layout="vertical"
          onFinish={(values) => {
            const payload: DriverCreate = {
              full_name: values.full_name,
              license_number: values.license_number,
              license_expiry_date: values.license_expiry_date
                ? values.license_expiry_date.toISOString()
                : null,
              passport_number: values.passport_number,
              passport_expiry_date: values.passport_expiry_date
                ? values.passport_expiry_date.toISOString()
                : null,
              phone_number: values.phone_number,
              status: values.status,
            };
            handleCreate(payload);
          }}
          initialValues={{ status: "Active" }}
        >
          <Form.Item
            name="full_name"
            label="Full Name"
            rules={[
              { required: true, message: "Please enter full name" },
              { max: 255, message: "Name too long" },
            ]}
          >
            <Input placeholder="e.g., John Doe" />
          </Form.Item>

          <Form.Item
            name="license_number"
            label="License Number"
            rules={[
              { required: true, message: "Please enter license number" },
              { max: 50, message: "License number too long" },
            ]}
          >
            <Input placeholder="e.g., DL-998877" />
          </Form.Item>

          <Form.Item name="license_expiry_date" label="License Expiry Date" rules={[pastDateValidator]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="passport_number"
            label="Passport Number"
            rules={[{ max: 50, message: "Passport number too long" }]}
          >
            <Input placeholder="e.g., AB1234567" />
          </Form.Item>

          <Form.Item name="passport_expiry_date" label="Passport Expiry Date" rules={[pastDateValidator]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="phone_number"
            label="Phone Number"
            rules={[
              { required: true, message: "Please enter phone number" },
              { max: 50, message: "Phone number too long" },
            ]}
          >
            <Input placeholder="e.g., +254700000000" />
          </Form.Item>

          <Form.Item name="status" label="Status">
            <Select>
              <Select.Option value="Active">Active</Select.Option>
              <Select.Option value="On Trip">On Trip</Select.Option>
              <Select.Option value="Inactive">Inactive</Select.Option>
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
                Register Driver
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Driver"
        open={isEditModalOpen}
        width={720}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingDriver(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form<DriverFormValues>
          form={editForm}
          layout="vertical"
          onFinish={(values) => {
            const payload: DriverUpdate = {
              full_name: values.full_name,
              license_number: values.license_number,
              license_expiry_date: values.license_expiry_date
                ? values.license_expiry_date.toISOString()
                : null,
              passport_number: values.passport_number,
              passport_expiry_date: values.passport_expiry_date
                ? values.passport_expiry_date.toISOString()
                : null,
              phone_number: values.phone_number,
              status: values.status,
            };
            handleEdit(payload);
          }}
        >
          <Form.Item
            name="full_name"
            label="Full Name"
            rules={[
              { required: true, message: "Please enter full name" },
              { max: 255, message: "Name too long" },
            ]}
          >
            <Input placeholder="e.g., John Doe" />
          </Form.Item>

          <Form.Item
            name="license_number"
            label="License Number"
            rules={[
              { required: true, message: "Please enter license number" },
              { max: 50, message: "License number too long" },
            ]}
          >
            <Input placeholder="e.g., DL-998877" />
          </Form.Item>

          <Form.Item name="license_expiry_date" label="License Expiry Date" rules={[pastDateValidator]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="passport_number"
            label="Passport Number"
            rules={[{ max: 50, message: "Passport number too long" }]}
          >
            <Input placeholder="e.g., AB1234567" />
          </Form.Item>

          <Form.Item name="passport_expiry_date" label="Passport Expiry Date" rules={[pastDateValidator]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="phone_number"
            label="Phone Number"
            rules={[
              { required: true, message: "Please enter phone number" },
              { max: 50, message: "Phone number too long" },
            ]}
          >
            <Input placeholder="e.g., +254700000000" />
          </Form.Item>

          <Form.Item name="status" label="Status">
            <Select>
              <Select.Option value="Active">Active</Select.Option>
              <Select.Option value="On Trip">On Trip</Select.Option>
              <Select.Option value="Inactive">Inactive</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingDriver(null);
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
