"use client";

import { useRef } from "react";
import {
  ProTable,
  ModalForm,
  ProFormText,
  ProFormSwitch,
  type ProColumns,
  type ActionType,
} from "@ant-design/pro-components";
import { Button, App, Popconfirm, Space, Tag } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { usePermissions } from "@/hooks/application/usePermissions";

interface BorderPost {
  id: string;
  display_name: string;
  side_a_name: string;
  side_b_name: string;
  is_active: boolean;
  created_at: string | null;
}

interface BorderPostCreate {
  display_name: string;
  side_a_name: string;
  side_b_name: string;
  is_active?: boolean;
}

export default function BorderPostsPage() {
  const { message } = App.useApp();
  const { hasPermission } = usePermissions();
  const actionRef = useRef<ActionType>(null);

  const canWrite = hasPermission("settings:border-posts");

  const handleDeactivate = async (post: BorderPost) => {
    try {
      const response = await fetch(`/api/v1/border-posts/${post.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        message.success("Border post deactivated");
        actionRef.current?.reload();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to deactivate border post");
      }
    } catch {
      message.error("Network error");
    }
  };

  const columns: ProColumns<BorderPost>[] = [
    {
      title: "Display Name",
      dataIndex: "display_name",
      key: "display_name",
      sorter: true,
      render: (_, record) => (
        <div style={{ fontWeight: 600 }}>{record.display_name}</div>
      ),
      fieldProps: { placeholder: "Search display name" },
    },
    {
      title: "Side A (Go Direction)",
      dataIndex: "side_a_name",
      key: "side_a_name",
      render: (_, record) => <Tag>{record.side_a_name}</Tag>,
      fieldProps: { placeholder: "Search side A" },
    },
    {
      title: "Side B (Return Direction)",
      dataIndex: "side_b_name",
      key: "side_b_name",
      render: (_, record) => <Tag color="blue">{record.side_b_name}</Tag>,
      fieldProps: { placeholder: "Search side B" },
    },
    {
      title: "Active",
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
          {canWrite && (
            <ModalForm<BorderPostCreate>
              title="Edit Border Post"
              trigger={
                <Button type="text" size="small" icon={<EditOutlined />} />
              }
              onFinish={async (values) => {
                try {
                  const response = await fetch(
                    `/api/v1/border-posts/${record.id}`,
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify(values),
                    }
                  );
                  if (response.ok) {
                    message.success("Border post updated successfully");
                    actionRef.current?.reload();
                    return true;
                  }
                  const error = await response.json();
                  message.error(error.detail || "Failed to update border post");
                  return false;
                } catch {
                  message.error("Network error");
                  return false;
                }
              }}
              initialValues={{
                display_name: record.display_name,
                side_a_name: record.side_a_name,
                side_b_name: record.side_b_name,
                is_active: record.is_active,
              }}
            >
              <ProFormText
                name="side_a_name"
                label="Side A Name (Go Direction)"
                rules={[{ required: true, message: "Enter Side A name" }]}
                placeholder="e.g., Tunduma"
              />
              <ProFormText
                name="side_b_name"
                label="Side B Name (Return Direction)"
                rules={[{ required: true, message: "Enter Side B name" }]}
                placeholder="e.g., Nakonde"
              />
              <ProFormText
                name="display_name"
                label="Display Name"
                rules={[{ required: true, message: "Enter a display name" }]}
                placeholder="e.g., Tunduma / Nakonde"
              />
              <ProFormSwitch
                name="is_active"
                label="Active"
              />
            </ModalForm>
          )}
          {canWrite && record.is_active && (
            <Popconfirm
              title="Deactivate border post"
              description={`Deactivate "${record.display_name}"? It will no longer appear in the border picker.`}
              onConfirm={() => handleDeactivate(record)}
              okText="Deactivate"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<StopOutlined />}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <ProTable<BorderPost>
      headerTitle="Border Posts"
      actionRef={actionRef}
      columns={columns}
      rowKey="id"
      request={async () => {
        const response = await fetch("/api/v1/border-posts", {
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
        ...(canWrite
          ? [
              <ModalForm<BorderPostCreate>
                key="create"
                title="Add Border Post"
                trigger={
                  <Button type="primary" icon={<PlusOutlined />}>
                    Add Border Post
                  </Button>
                }
                onFinish={async (values) => {
                  try {
                    const response = await fetch("/api/v1/border-posts", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify(values),
                    });
                    if (response.ok) {
                      message.success("Border post added successfully");
                      actionRef.current?.reload();
                      return true;
                    }
                    const error = await response.json();
                    message.error(error.detail || "Failed to create border post");
                    return false;
                  } catch {
                    message.error("Network error");
                    return false;
                  }
                }}
              >
                <ProFormText
                  name="side_a_name"
                  label="Side A Name (Go Direction)"
                  rules={[{ required: true, message: "Enter Side A name" }]}
                  placeholder="e.g., Tunduma"
                />
                <ProFormText
                  name="side_b_name"
                  label="Side B Name (Return Direction)"
                  rules={[{ required: true, message: "Enter Side B name" }]}
                  placeholder="e.g., Nakonde"
                />
                <ProFormText
                  name="display_name"
                  label="Display Name"
                  rules={[{ required: true, message: "Enter a display name" }]}
                  placeholder="e.g., Tunduma / Nakonde"
                />
                <ProFormSwitch
                  name="is_active"
                  label="Active"
                  initialValue={true}
                />
              </ModalForm>,
            ]
          : []),
      ]}
    />
  );
}
