"use client";

import { useRef, useState } from "react";
import {
  ProTable,
  ModalForm,
  ProFormText,
  ProFormSelect,
} from "@ant-design/pro-components";
import type { ProColumns, ActionType } from "@ant-design/pro-components";
import { Button, App, Popconfirm, Space, Tag } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { Trailer, TrailerCreate, TrailerType } from "@/types/trailer";
import { useAuth } from "@/contexts/AuthContext";
import { VehicleStatusTag } from "@/components/ui/VehicleStatusTag";

const TYPE_COLORS: Record<TrailerType, string> = {
  Flatbed: "cyan",
  Skeleton: "blue",
  Box: "orange",
  Tanker: "red",
  Lowbed: "default",
};

export default function TrailersPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const actionRef = useRef<ActionType>(null);
  const [editingTrailer, setEditingTrailer] = useState<Trailer | null>(null);

  const handleCreate = async (values: TrailerCreate) => {
    try {
      const response = await fetch("/api/v1/trailers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("Trailer registered successfully");
        actionRef.current?.reload();
        return true;
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create trailer");
        return false;
      }
    } catch {
      message.error("Network error");
      return false;
    }
  };

  const handleEdit = async (values: TrailerCreate) => {
    if (!editingTrailer) return false;
    try {
      const response = await fetch(`/api/v1/trailers/${editingTrailer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("Trailer updated successfully");
        setEditingTrailer(null);
        actionRef.current?.reload();
        return true;
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update trailer");
        return false;
      }
    } catch {
      message.error("Network error");
      return false;
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
        actionRef.current?.reload();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete trailer");
      }
    } catch {
      message.error("Network error");
    }
  };

  const columns: ProColumns<Trailer>[] = [
    {
      title: "Plate Number",
      dataIndex: "plate_number",
      key: "plate_number",
      width: 160,
      sorter: true,
      fieldProps: { placeholder: "Search plate number" },
    },
    {
      title: "Make",
      dataIndex: "make",
      key: "make",
      width: 140,
      sorter: true,
      fieldProps: { placeholder: "Search make" },
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 100,
      valueType: "select",
      valueEnum: {
        Flatbed: { text: "Flatbed" },
        Skeleton: { text: "Skeleton" },
        Box: { text: "Box" },
        Tanker: { text: "Tanker" },
        Lowbed: { text: "Lowbed" },
      },
      render: (_, record) => (
        <Tag color={TYPE_COLORS[record.type]}>{record.type}</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      valueType: "select",
      valueEnum: {
        Idle: { text: "Idle", status: "Default" },
        "In Transit": { text: "In Transit", status: "Processing" },
        Maintenance: { text: "Maintenance", status: "Warning" },
      },
      render: (_, record) => <VehicleStatusTag status={record.status} />,
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
            onClick={() => setEditingTrailer(record)}
          />
          <Popconfirm
            title="Delete trailer"
            description={`Are you sure you want to delete ${record.plate_number}?`}
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

  return (
    <>
      <ProTable<Trailer>
        headerTitle="Trailer Registry"
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        request={async () => {
          const response = await fetch("/api/v1/trailers", {
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
          <ModalForm<TrailerCreate>
            key="create"
            title="Register New Trailer"
            trigger={
              <Button type="primary" icon={<PlusOutlined />}>
                New Trailer
              </Button>
            }
            onFinish={handleCreate}
            initialValues={{ status: "Idle", type: "Flatbed" }}
          >
            <ProFormText
              name="plate_number"
              label="Plate Number"
              rules={[
                { required: true, message: "Please enter plate number" },
                { max: 20, message: "Plate number too long" },
              ]}
              placeholder="e.g., T998 EMQ"
            />
            <ProFormSelect
              name="type"
              label="Type"
              rules={[{ required: true, message: "Please select trailer type" }]}
              options={[
                { label: "Flatbed", value: "Flatbed" },
                { label: "Skeleton", value: "Skeleton" },
                { label: "Box", value: "Box" },
                { label: "Tanker", value: "Tanker" },
                { label: "Lowbed", value: "Lowbed" },
              ]}
            />
            <ProFormText
              name="make"
              label="Make"
              rules={[
                { required: true, message: "Please enter make" },
                { max: 100, message: "Make name too long" },
              ]}
              placeholder="e.g., CIMC"
            />
            <ProFormSelect
              name="status"
              label="Status"
              options={[
                { label: "Idle", value: "Idle" },
                { label: "In Transit", value: "In Transit" },
                { label: "Maintenance", value: "Maintenance" },
              ]}
            />
          </ModalForm>,
        ]}
      />

      {/* Edit Modal */}
      <ModalForm<TrailerCreate>
        title="Edit Trailer"
        open={!!editingTrailer}
        onOpenChange={(open) => {
          if (!open) setEditingTrailer(null);
        }}
        onFinish={handleEdit}
        initialValues={
          editingTrailer
            ? {
                plate_number: editingTrailer.plate_number,
                type: editingTrailer.type,
                make: editingTrailer.make,
                status: editingTrailer.status,
              }
            : undefined
        }
        modalProps={{ destroyOnHidden: true }}
      >
        <ProFormText
          name="plate_number"
          label="Plate Number"
          rules={[
            { required: true, message: "Please enter plate number" },
            { max: 20, message: "Plate number too long" },
          ]}
          placeholder="e.g., ZD 4040"
        />
        <ProFormSelect
          name="type"
          label="Type"
          rules={[{ required: true, message: "Please select trailer type" }]}
          options={[
            { label: "Flatbed", value: "Flatbed" },
            { label: "Skeleton", value: "Skeleton" },
            { label: "Box", value: "Box" },
            { label: "Tanker", value: "Tanker" },
            { label: "Lowbed", value: "Lowbed" },
          ]}
        />
        <ProFormText
          name="make"
          label="Make"
          rules={[
            { required: true, message: "Please enter make" },
            { max: 100, message: "Make name too long" },
          ]}
          placeholder="e.g., Hambure"
        />
        <ProFormSelect
          name="status"
          label="Status"
          options={[
            { label: "Idle", value: "Idle" },
            { label: "In Transit", value: "In Transit" },
            { label: "Maintenance", value: "Maintenance" },
          ]}
        />
      </ModalForm>
    </>
  );
}
