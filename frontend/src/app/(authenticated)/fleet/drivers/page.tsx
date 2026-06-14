"use client";

import { useRef, useState } from "react";
import dayjs from "dayjs";
import {
  ProTable,
  ModalForm,
  ProFormText,
  ProFormSelect,
  ProFormDatePicker,
} from "@ant-design/pro-components";
import type { ProColumns, ActionType } from "@ant-design/pro-components";
import { Button, App, Popconfirm, Space, Tooltip, Typography } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import type { Driver, DriverCreate, DriverStatus } from "@/types/driver";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge, type ColorKey } from "@/components/ui/StatusBadge";

const { Text } = Typography;

const EXPIRY_WARNING_DAYS = 30;

const STATUS_COLORS: Record<DriverStatus, ColorKey> = {
  Active: "green",
  Assigned: "cyan",
  "On Trip": "blue",
  Inactive: "gray",
};

export default function DriversPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const actionRef = useRef<ActionType>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const renderExpiryDate = (date: string | null) => {
    if (!date) return <Text type="secondary">—</Text>;
    const days = dayjs(date).diff(dayjs(), "day");
    const formatted = new Date(date).toLocaleDateString();
    if (days < 0) {
      return (
        <Tooltip title="Expired — renew immediately.">
          <Text type="danger">
            <WarningOutlined /> {formatted}
          </Text>
        </Tooltip>
      );
    }
    if (days <= EXPIRY_WARNING_DAYS) {
      return (
        <Tooltip title={`Expires in ${days} days.`}>
          <Text style={{ color: "#D97706" }}>
            <ClockCircleOutlined /> {formatted}
          </Text>
        </Tooltip>
      );
    }
    return <Text>{formatted}</Text>;
  };

  const handleCreate = async (values: Record<string, any>) => {
    const payload: DriverCreate = {
      full_name: values.full_name,
      license_number: values.license_number,
      license_expiry_date: values.license_expiry_date
        ? dayjs(values.license_expiry_date).toISOString()
        : null,
      passport_number: values.passport_number || null,
      passport_expiry_date: values.passport_expiry_date
        ? dayjs(values.passport_expiry_date).toISOString()
        : null,
      phone_number: values.phone_number,
      status: values.status,
    };

    try {
      const response = await fetch("/api/v1/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        message.success("Driver registered successfully");
        actionRef.current?.reload();
        return true;
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create driver");
        return false;
      }
    } catch {
      message.error("Network error");
      return false;
    }
  };

  const handleEdit = async (values: Record<string, any>) => {
    if (!editingDriver) return false;
    const payload: Partial<DriverCreate> = {
      full_name: values.full_name,
      license_number: values.license_number,
      license_expiry_date: values.license_expiry_date
        ? dayjs(values.license_expiry_date).toISOString()
        : null,
      passport_number: values.passport_number || null,
      passport_expiry_date: values.passport_expiry_date
        ? dayjs(values.passport_expiry_date).toISOString()
        : null,
      phone_number: values.phone_number,
      status: values.status,
    };

    try {
      const response = await fetch(`/api/v1/drivers/${editingDriver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        message.success("Driver updated successfully");
        setEditingDriver(null);
        actionRef.current?.reload();
        return true;
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update driver");
        return false;
      }
    } catch {
      message.error("Network error");
      return false;
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
        actionRef.current?.reload();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete driver");
      }
    } catch {
      message.error("Network error");
    }
  };

  const columns: ProColumns<Driver>[] = [
    {
      title: "Full Name",
      dataIndex: "full_name",
      key: "full_name",
      width: 180,
      sorter: true,
      fieldProps: { placeholder: "Search name" },
    },
    {
      title: "Phone",
      dataIndex: "phone_number",
      key: "phone_number",
      width: 140,
      fieldProps: { placeholder: "Search phone" },
    },
    {
      title: "License #",
      dataIndex: "license_number",
      key: "license_number",
      width: 140,
      fieldProps: { placeholder: "Search license" },
    },
    {
      title: "License Expiry",
      dataIndex: "license_expiry_date",
      key: "license_expiry_date",
      width: 140,
      valueType: "date",
      sorter: true,
      render: (_, record) => renderExpiryDate(record.license_expiry_date),
      search: false,
    },
    {
      title: "Passport #",
      dataIndex: "passport_number",
      key: "passport_number",
      width: 140,
      fieldProps: { placeholder: "Search passport" },
      render: (_, record) => record.passport_number || "-",
    },
    {
      title: "Passport Expiry",
      dataIndex: "passport_expiry_date",
      key: "passport_expiry_date",
      width: 140,
      valueType: "date",
      sorter: true,
      render: (_, record) => renderExpiryDate(record.passport_expiry_date),
      search: false,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      valueType: "select",
      valueEnum: {
        Active: { text: "Active" },
        Assigned: { text: "Assigned" },
        "On Trip": { text: "On Trip" },
        Inactive: { text: "Inactive" },
      },
      render: (_, record) => (
        <StatusBadge status={record.status} colorKey={STATUS_COLORS[record.status]} coloredText />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      valueType: "option",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditingDriver(record)}
          />
          <Popconfirm
            title="Delete driver"
            description={`Are you sure you want to delete ${record.full_name}?`}
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const getEditInitialValues = () => {
    if (!editingDriver) return undefined;
    return {
      full_name: editingDriver.full_name,
      license_number: editingDriver.license_number,
      license_expiry_date: editingDriver.license_expiry_date
        ? dayjs(editingDriver.license_expiry_date)
        : null,
      passport_number: editingDriver.passport_number,
      passport_expiry_date: editingDriver.passport_expiry_date
        ? dayjs(editingDriver.passport_expiry_date)
        : null,
      phone_number: editingDriver.phone_number,
      status: editingDriver.status,
    };
  };

  return (
    <>
      <ProTable<Driver>
        headerTitle="Driver Registry"
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        request={async () => {
          const response = await fetch("/api/v1/drivers", {
            credentials: "include",
          });
          const data = await response.json();
          return {
            data: data.data || [],
            total: data.count || 0,
            success: true,
          };
        }}
        search={{ labelWidth: "auto" }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
        }}
        toolBarRender={() => [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            Refresh
          </Button>,
          <ModalForm
            key="create"
            title="Register New Driver"
            trigger={
              <Button type="primary" icon={<PlusOutlined />}>
                New Driver
              </Button>
            }
            onFinish={handleCreate}
            initialValues={{ status: "Active" }}
          >
            <ProFormText
              name="full_name"
              label="Full Name"
              rules={[
                { required: true, message: "Please enter full name" },
                { max: 255, message: "Name too long" },
              ]}
              placeholder="e.g., John Doe"
            />
            <ProFormText
              name="license_number"
              label="License Number"
              rules={[
                { required: true, message: "Please enter license number" },
                { max: 50, message: "License number too long" },
              ]}
              placeholder="e.g., DL-998877"
            />
            <ProFormDatePicker
              name="license_expiry_date"
              label="License Expiry Date"
              width="100%"
            />
            <ProFormText
              name="passport_number"
              label="Passport Number"
              rules={[{ max: 50, message: "Passport number too long" }]}
              placeholder="e.g., AB1234567"
            />
            <ProFormDatePicker
              name="passport_expiry_date"
              label="Passport Expiry Date"
              width="100%"
            />
            <ProFormText
              name="phone_number"
              label="Phone Number"
              rules={[
                { required: true, message: "Please enter phone number" },
                { max: 50, message: "Phone number too long" },
              ]}
              placeholder="e.g., +254700000000"
            />
            <ProFormSelect
              name="status"
              label="Status"
              options={[
                { label: "Active", value: "Active" },
                { label: "On Trip", value: "On Trip" },
                { label: "Inactive", value: "Inactive" },
              ]}
            />
          </ModalForm>,
        ]}
      />

      {/* Edit Modal */}
      <ModalForm
        title="Edit Driver"
        open={!!editingDriver}
        onOpenChange={(open) => {
          if (!open) setEditingDriver(null);
        }}
        onFinish={handleEdit}
        initialValues={getEditInitialValues()}
        modalProps={{ destroyOnHidden: true }}
      >
        <ProFormText
          name="full_name"
          label="Full Name"
          rules={[
            { required: true, message: "Please enter full name" },
            { max: 255, message: "Name too long" },
          ]}
          placeholder="e.g., John Doe"
        />
        <ProFormText
          name="license_number"
          label="License Number"
          rules={[
            { required: true, message: "Please enter license number" },
            { max: 50, message: "License number too long" },
          ]}
          placeholder="e.g., DL-998877"
        />
        <ProFormDatePicker
          name="license_expiry_date"
          label="License Expiry Date"
          width="100%"
        />
        <ProFormText
          name="passport_number"
          label="Passport Number"
          rules={[{ max: 50, message: "Passport number too long" }]}
          placeholder="e.g., AB1234567"
        />
        <ProFormDatePicker
          name="passport_expiry_date"
          label="Passport Expiry Date"
          width="100%"
        />
        <ProFormText
          name="phone_number"
          label="Phone Number"
          rules={[
            { required: true, message: "Please enter phone number" },
            { max: 50, message: "Phone number too long" },
          ]}
          placeholder="e.g., +254700000000"
        />
        <ProFormSelect
          name="status"
          label="Status"
          options={[
            { label: "Active", value: "Active" },
            { label: "On Trip", value: "On Trip" },
            { label: "Inactive", value: "Inactive" },
          ]}
        />
      </ModalForm>
    </>
  );
}
