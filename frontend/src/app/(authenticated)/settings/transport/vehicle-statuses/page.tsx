"use client";

import { useRef } from "react";
import {
  ProTable,
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProFormSwitch,
  type ProColumns,
  type ActionType,
} from "@ant-design/pro-components";
import { Button, App, Popconfirm, Space, Tag } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { VehicleStatus, VehicleStatusCreate } from "@/types/vehicle-status";

export default function VehicleStatusesPage() {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  const handleDelete = async (status: VehicleStatus) => {
    try {
      const response = await fetch(`/api/v1/vehicle-statuses/${status.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        message.success("Vehicle status deleted successfully");
        actionRef.current?.reload();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete vehicle status");
      }
    } catch {
      message.error("Network error");
    }
  };

  const columns: ProColumns<VehicleStatus>[] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: true,
      render: (_, record) => (
        <div style={{ fontWeight: 600 }}>{record.name}</div>
      ),
      fieldProps: { placeholder: "Search name" },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (_, record) => record.description || "-",
      search: false,
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 100,
      valueType: "select",
      valueEnum: {
        true: { text: "Active", status: "Success" },
        false: { text: "Inactive", status: "Default" },
      },
      render: (_, record) => (
        <Tag color={record.is_active ? "green" : "default"}>
          {record.is_active ? "Active" : "Inactive"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      valueType: "option",
      render: (_, record) => (
        <Space size="small">
          <ModalForm<VehicleStatus>
            title="Edit Vehicle Status"
            trigger={
              <Button type="text" size="small" icon={<EditOutlined />} />
            }
            onFinish={async (values) => {
              try {
                const response = await fetch(
                  `/api/v1/vehicle-statuses/${record.id}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(values),
                  }
                );
                if (response.ok) {
                  message.success("Vehicle status updated successfully");
                  actionRef.current?.reload();
                  return true;
                }
                const error = await response.json();
                message.error(error.detail || "Failed to update vehicle status");
                return false;
              } catch {
                message.error("Network error");
                return false;
              }
            }}
            initialValues={{
              name: record.name,
              description: record.description || undefined,
              is_active: record.is_active,
            }}
          >
            <ProFormText
              name="name"
              label="Name"
              rules={[
                { required: true, message: "Please enter a status name" },
                { max: 255, message: "Name too long" },
              ]}
              placeholder="e.g., Waiting Offloading"
            />
            <ProFormTextArea
              name="description"
              label="Description"
              rules={[{ max: 500, message: "Description too long" }]}
              placeholder="e.g., Vehicle waiting at destination to be offloaded"
              fieldProps={{ rows: 3 }}
            />
            <ProFormSwitch
              name="is_active"
              label="Active"
              initialValue={true}
            />
          </ModalForm>
          <Popconfirm
            title="Delete vehicle status"
            description={`Delete "${record.name}"?`}
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ProTable<VehicleStatus>
      headerTitle="Vehicle Statuses"
      actionRef={actionRef}
      columns={columns}
      rowKey="id"
      request={async () => {
        const response = await fetch("/api/v1/vehicle-statuses", {
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
        <ModalForm<VehicleStatusCreate>
          key="create"
          title="Add Vehicle Status"
          trigger={
            <Button type="primary" icon={<PlusOutlined />}>
              Add Vehicle Status
            </Button>
          }
          onFinish={async (values) => {
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
                actionRef.current?.reload();
                return true;
              }
              const error = await response.json();
              message.error(error.detail || "Failed to create vehicle status");
              return false;
            } catch {
              message.error("Network error");
              return false;
            }
          }}
          initialValues={{ is_active: true }}
        >
          <ProFormText
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please enter a status name" },
              { max: 255, message: "Name too long" },
            ]}
            placeholder="e.g., Waiting Offloading"
          />
          <ProFormTextArea
            name="description"
            label="Description"
            rules={[{ max: 500, message: "Description too long" }]}
            placeholder="e.g., Vehicle waiting at destination to be offloaded"
            fieldProps={{ rows: 3 }}
          />
          <ProFormSwitch
            name="is_active"
            label="Active"
            initialValue={true}
          />
        </ModalForm>,
      ]}
    />
  );
}
