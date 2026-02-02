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
  DatePicker,
} from "antd";
import dayjs from "dayjs";
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
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

const { Title } = Typography;

const STATUS_COLORS: Record<DriverStatus, string> = {
  Active: "green",
  Assigned: "cyan",
  "On Trip": "blue",
  Inactive: "gray",
};

export default function DriversPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm<DriverFormValues>();
  const [editForm] = Form.useForm<DriverFormValues>();

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/drivers/", {
        credentials: "include",
      });
      if (response.ok) {
        const data: DriversResponse = await response.json();
        setDrivers(data.data);
        setTotalCount(data.count);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        message.error("Failed to fetch drivers");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDrivers();
    }
  }, [authLoading, user, fetchDrivers]);

  const handleCreate = async (values: DriverCreate) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/drivers/", {
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
        fetchDrivers();
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
        fetchDrivers();
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
        fetchDrivers();
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
      sorter: (a, b) => a.full_name.localeCompare(b.full_name),
    },
    {
      title: "License Number",
      dataIndex: "license_number",
      key: "license_number",
      sorter: (a, b) => a.license_number.localeCompare(b.license_number),
    },
    {
      title: "License Expiry",
      dataIndex: "license_expiry_date",
      key: "license_expiry_date",
      render: (date: string | null) =>
        date ? dayjs(date).format("YYYY-MM-DD") : "-",
      sorter: (a, b) => {
        if (!a.license_expiry_date) return 1;
        if (!b.license_expiry_date) return -1;
        return a.license_expiry_date.localeCompare(b.license_expiry_date);
      },
    },
    {
      title: "Passport",
      dataIndex: "passport_number",
      key: "passport_number",
      render: (passport: string | null) => passport || "-",
    },
    {
      title: "Passport Expiry",
      dataIndex: "passport_expiry_date",
      key: "passport_expiry_date",
      render: (date: string | null) =>
        date ? dayjs(date).format("YYYY-MM-DD") : "-",
      sorter: (a, b) => {
        if (!a.passport_expiry_date) return 1;
        if (!b.passport_expiry_date) return -1;
        return a.passport_expiry_date.localeCompare(b.passport_expiry_date);
      },
    },
    {
      title: "Phone Number",
      dataIndex: "phone_number",
      key: "phone_number",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: DriverStatus) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
      filters: [
        { text: "Active", value: "Active" },
        { text: "On Trip", value: "On Trip" },
        { text: "Inactive", value: "Inactive" },
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
            title="Delete driver"
            description={`Are you sure you want to delete ${record.full_name}?`}
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
                Driver Registry
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchDrivers}>
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
            columns={columns}
            dataSource={drivers}
            rowKey="id"
            loading={loading}
            pagination={{
              total: totalCount,
              showTotal: (total) => `Total ${total} drivers`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
          />
        </Space>
      </Card>

      {/* Create Modal */}
      <Modal
        title="Register New Driver"
        open={isCreateModalOpen}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnClose
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

          <Form.Item name="license_expiry_date" label="License Expiry Date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="passport_number"
            label="Passport Number"
            rules={[{ max: 50, message: "Passport number too long" }]}
          >
            <Input placeholder="e.g., AB1234567" />
          </Form.Item>

          <Form.Item name="passport_expiry_date" label="Passport Expiry Date">
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
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingDriver(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnClose
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

          <Form.Item name="license_expiry_date" label="License Expiry Date">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="passport_number"
            label="Passport Number"
            rules={[{ max: 50, message: "Passport number too long" }]}
          >
            <Input placeholder="e.g., AB1234567" />
          </Form.Item>

          <Form.Item name="passport_expiry_date" label="Passport Expiry Date">
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
