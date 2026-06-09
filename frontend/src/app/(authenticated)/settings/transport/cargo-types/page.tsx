"use client";

import { useRef } from "react";
import {
  ProTable,
  ModalForm,
  ProFormText,
  ProFormTextArea,
  type ProColumns,
  type ActionType,
} from "@ant-design/pro-components";
import { Button, App, Popconfirm, Space } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { CargoType, CargoTypeCreate } from "@/types/cargo-type";

export default function CargoTypesPage() {
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  const handleDelete = async (cargoType: CargoType) => {
    try {
      const response = await fetch(`/api/v1/cargo-types/${cargoType.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        message.success("Cargo type deleted successfully");
        actionRef.current?.reload();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete cargo type");
      }
    } catch {
      message.error("Network error");
    }
  };

  const columns: ProColumns<CargoType>[] = [
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
      title: "Actions",
      key: "actions",
      width: 130,
      valueType: "option",
      render: (_, record) => (
        <Space size="small">
          <ModalForm<CargoType>
            title="Edit Cargo Type"
            trigger={
              <Button type="text" size="small" icon={<EditOutlined />} />
            }
            onFinish={async (values) => {
              try {
                const response = await fetch(
                  `/api/v1/cargo-types/${record.id}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(values),
                  }
                );
                if (response.ok) {
                  message.success("Cargo type updated successfully");
                  actionRef.current?.reload();
                  return true;
                }
                const error = await response.json();
                message.error(error.detail || "Failed to update cargo type");
                return false;
              } catch {
                message.error("Network error");
                return false;
              }
            }}
            initialValues={{
              name: record.name,
              description: record.description || undefined,
            }}
          >
            <ProFormText
              name="name"
              label="Name"
              rules={[
                { required: true, message: "Please enter a cargo type name" },
                { max: 255, message: "Name too long" },
              ]}
              placeholder="e.g., 20' Container"
            />
            <ProFormTextArea
              name="description"
              label="Description"
              rules={[{ max: 500, message: "Description too long" }]}
              placeholder="e.g., Standard 20-foot shipping container"
              fieldProps={{ rows: 3 }}
            />
          </ModalForm>
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
      ),
    },
  ];

  return (
    <ProTable<CargoType>
      headerTitle="Cargo Types"
      actionRef={actionRef}
      columns={columns}
      rowKey="id"
      request={async () => {
        const response = await fetch("/api/v1/cargo-types", {
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
        <ModalForm<CargoTypeCreate>
          key="create"
          title="Add Cargo Type"
          trigger={
            <Button type="primary" icon={<PlusOutlined />}>
              Add Cargo Type
            </Button>
          }
          onFinish={async (values) => {
            try {
              const response = await fetch("/api/v1/cargo-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(values),
              });
              if (response.ok) {
                message.success("Cargo type added successfully");
                actionRef.current?.reload();
                return true;
              }
              const error = await response.json();
              message.error(error.detail || "Failed to create cargo type");
              return false;
            } catch {
              message.error("Network error");
              return false;
            }
          }}
        >
          <ProFormText
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please enter a cargo type name" },
              { max: 255, message: "Name too long" },
            ]}
            placeholder="e.g., 20' Container"
          />
          <ProFormTextArea
            name="description"
            label="Description"
            rules={[{ max: 500, message: "Description too long" }]}
            placeholder="e.g., Standard 20-foot shipping container"
            fieldProps={{ rows: 3 }}
          />
        </ModalForm>,
      ]}
    />
  );
}
