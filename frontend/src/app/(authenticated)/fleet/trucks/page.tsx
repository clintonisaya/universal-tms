"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ProTable,
  ModalForm,
  ProFormText,
  ProFormSelect,
} from "@ant-design/pro-components";
import type { ProColumns, ActionType } from "@ant-design/pro-components";
import { Button, App, Popconfirm, Space } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { Truck, TruckCreate } from "@/types/truck";
import { useAuth } from "@/contexts/AuthContext";
import { VehicleStatusTag } from "@/components/ui/VehicleStatusTag";

export default function TrucksPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { user } = useAuth();
  const actionRef = useRef<ActionType>(null);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);

  const handleCreate = async (values: TruckCreate) => {
    try {
      const response = await fetch("/api/v1/trucks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("Truck registered successfully");
        actionRef.current?.reload();
        return true;
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create truck");
        return false;
      }
    } catch {
      message.error("Network error");
      return false;
    }
  };

  const handleEdit = async (values: TruckCreate) => {
    if (!editingTruck) return false;
    try {
      const response = await fetch(`/api/v1/trucks/${editingTruck.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("Truck updated successfully");
        setEditingTruck(null);
        actionRef.current?.reload();
        return true;
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update truck");
        return false;
      }
    } catch {
      message.error("Network error");
      return false;
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
        actionRef.current?.reload();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete truck");
      }
    } catch {
      message.error("Network error");
    }
  };

  const columns: ProColumns<Truck>[] = [
    {
      title: "Plate Number",
      dataIndex: "plate_number",
      key: "plate_number",
      width: 150,
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
      title: "Model",
      dataIndex: "model",
      key: "model",
      width: 140,
      sorter: true,
      fieldProps: { placeholder: "Search model" },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
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
      width: 130,
      valueType: "option",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/fleet/trucks/${record.id}`)}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditingTruck(record)}
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
      ),
    },
  ];

  return (
    <>
      <ProTable<Truck>
        headerTitle="Truck Registry"
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const skip = ((current || 1) - 1) * (pageSize || 20);
          const qs = new URLSearchParams();
          qs.set("skip", String(skip));
          qs.set("limit", String(pageSize || 20));
          const response = await fetch(`/api/v1/trucks?${qs.toString()}`, {
            credentials: "include",
          });
          const data = await response.json();
          let rows = data.data || [];
          const searchEntries = Object.entries(rest).filter(
            ([, v]) => v != null && v !== ""
          );
          if (searchEntries.length) {
            rows = rows.filter((row: Record<string, unknown>) =>
              searchEntries.every(([k, v]) => {
                const field = row[k];
                return field != null && String(field).toLowerCase().includes(String(v).toLowerCase());
              })
            );
          }
          return {
            data: rows,
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
          <ModalForm<TruckCreate>
            key="create"
            title="Register New Truck"
            trigger={
              <Button type="primary" icon={<PlusOutlined />}>
                New Truck
              </Button>
            }
            onFinish={handleCreate}
            initialValues={{ status: "Idle" }}
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
            <ProFormText
              name="make"
              label="Make"
              rules={[
                { required: true, message: "Please enter make" },
                { max: 100, message: "Make name too long" },
              ]}
              placeholder="e.g., XCMG"
            />
            <ProFormText
              name="model"
              label="Model"
              rules={[
                { required: true, message: "Please enter model" },
                { max: 100, message: "Model name too long" },
              ]}
              placeholder="e.g., HANVAN G7"
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
      <ModalForm<TruckCreate>
        title="Edit Truck"
        open={!!editingTruck}
        onOpenChange={(open) => {
          if (!open) setEditingTruck(null);
        }}
        onFinish={handleEdit}
        initialValues={
          editingTruck
            ? {
                plate_number: editingTruck.plate_number,
                make: editingTruck.make,
                model: editingTruck.model,
                status: editingTruck.status,
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
          placeholder="e.g., KCB 123A"
        />
        <ProFormText
          name="make"
          label="Make"
          rules={[
            { required: true, message: "Please enter make" },
            { max: 100, message: "Make name too long" },
          ]}
          placeholder="e.g., Mercedes"
        />
        <ProFormText
          name="model"
          label="Model"
          rules={[
            { required: true, message: "Please enter model" },
            { max: 100, message: "Model name too long" },
          ]}
          placeholder="e.g., Actros"
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
