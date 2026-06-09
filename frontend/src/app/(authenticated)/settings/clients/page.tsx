"use client";

import { useRef } from "react";
import {
  ProTable,
  ModalForm,
  ProFormText,
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
import type { Client, ClientCreate } from "@/types/client";
import { useInvalidateQueries } from "@/hooks/application/useApi";

export default function ClientsPage() {
  const { message } = App.useApp();
  const { invalidateClients } = useInvalidateQueries();
  const actionRef = useRef<ActionType>(null);

  const generateSystemId = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `CLT-${random}`;
  };

  const handleDelete = async (client: Client) => {
    try {
      const response = await fetch(`/api/v1/clients/${client.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        message.success("Client deleted successfully");
        actionRef.current?.reload();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete client");
      }
    } catch {
      message.error("Network error");
    }
  };

  const columns: ProColumns<Client>[] = [
    {
      title: "System ID",
      dataIndex: "system_id",
      key: "system_id",
      sorter: true,
      fieldProps: { placeholder: "Search system ID" },
    },
    {
      title: "Client Name",
      dataIndex: "name",
      key: "name",
      sorter: true,
      fieldProps: { placeholder: "Search client name" },
    },
    {
      title: "TIN",
      dataIndex: "tin",
      key: "tin",
      render: (_, record) => record.tin || "-",
      fieldProps: { placeholder: "Search TIN" },
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      valueType: "option",
      render: (_, record) => (
        <Space size="small">
          <ModalForm<ClientCreate>
            title="Edit Client"
            trigger={
              <Button type="text" size="small" icon={<EditOutlined />} />
            }
            onFinish={async (values) => {
              try {
                const response = await fetch(`/api/v1/clients/${record.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify(values),
                });
                if (response.ok) {
                  message.success("Client updated successfully");
                  actionRef.current?.reload();
                  return true;
                }
                const error = await response.json();
                message.error(error.detail || "Failed to update client");
                return false;
              } catch {
                message.error("Network error");
                return false;
              }
            }}
            initialValues={{
              name: record.name,
              system_id: record.system_id,
              tin: record.tin || undefined,
            }}
          >
            <ProFormText
              name="system_id"
              label="System ID"
              rules={[{ required: true, message: "System ID is required" }]}
              placeholder="e.g., CLT-1001"
            />
            <ProFormText
              name="name"
              label="Client Name"
              rules={[
                { required: true, message: "Please enter client name" },
                { max: 255, message: "Name too long" },
              ]}
              placeholder="e.g., Africa Walk Logistics"
            />
            <ProFormText
              name="tin"
              label="TIN (Tax Identification Number)"
              rules={[{ max: 50, message: "TIN too long" }]}
              placeholder="e.g., 100-200-300"
            />
          </ModalForm>
          <Popconfirm
            title="Delete client"
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
    <ProTable<Client>
      headerTitle="Client Settings"
      actionRef={actionRef}
      columns={columns}
      rowKey="id"
      request={async () => {
        const response = await fetch("/api/v1/clients", {
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
        <ModalForm<ClientCreate>
          key="create"
          title="Add Client"
          trigger={
            <Button type="primary" icon={<PlusOutlined />}>
              Add Client
            </Button>
          }
          onFinish={async (values) => {
            try {
              const response = await fetch("/api/v1/clients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(values),
              });
              if (response.ok) {
                message.success("Client added successfully");
                actionRef.current?.reload();
                return true;
              }
              const error = await response.json();
              message.error(error.detail || "Failed to create client");
              return false;
            } catch {
              message.error("Network error");
              return false;
            }
          }}
          initialValues={{ system_id: generateSystemId() }}
        >
          <ProFormText
            name="system_id"
            label="System ID"
            rules={[{ required: true, message: "System ID is required" }]}
            placeholder="e.g., CLT-1001"
          />
          <ProFormText
            name="name"
            label="Client Name"
            rules={[
              { required: true, message: "Please enter client name" },
              { max: 255, message: "Name too long" },
            ]}
            placeholder="e.g., Africa Walk Logistics"
          />
          <ProFormText
            name="tin"
            label="TIN (Tax Identification Number)"
            rules={[{ max: 50, message: "TIN too long" }]}
            placeholder="e.g., 100-200-300"
          />
        </ModalForm>,
      ]}
    />
  );
}
