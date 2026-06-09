"use client";

import { useState, useMemo, useRef } from "react";
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
  DeleteOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import type {
  TripExpenseType,
  TripExpenseTypeCreate,
} from "@/types/trip-expense-type";
import { useTripExpenseTypes, useInvalidateQueries } from "@/hooks/application/useApi";

interface CategoryNode {
  id: string;
  key: string;
  name: string;
  sorting: number;
  isCategory: true;
  children: ExpenseTypeNode[];
}

interface ExpenseTypeNode extends TripExpenseType {
  key: string;
  isCategory: false;
}

type TreeNode = CategoryNode | ExpenseTypeNode;

export default function TripExpenseTypesPage() {
  const { message } = App.useApp();
  const { invalidateTripExpenseTypes } = useInvalidateQueries();
  const actionRef = useRef<ActionType>(null);
  const [seeding, setSeeding] = useState(false);

  const { data: queryData, refetch } = useTripExpenseTypes();

  // Transform data into tree structure
  const treeData = useMemo(() => {
    const rawData = (queryData?.data || []) as TripExpenseType[];
    if (!rawData.length) return [];

    const categoryMap = new Map<string, CategoryNode>();

    rawData.forEach((et) => {
      if (!categoryMap.has(et.category)) {
        categoryMap.set(et.category, {
          id: `category-${et.category}`,
          key: `category-${et.category}`,
          name: et.category,
          sorting: 10,
          isCategory: true,
          children: [],
        });
      }
    });

    rawData.forEach((et) => {
      const category = categoryMap.get(et.category);
      if (category) {
        category.children.push({
          ...et,
          key: et.id,
          isCategory: false,
        });
      }
    });

    const sortedCategories = Array.from(categoryMap.values()).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
    sortedCategories.forEach((cat) => {
      cat.children.sort((a, b) => a.name.localeCompare(b.name));
    });

    return sortedCategories;
  }, [queryData]);

  const handleDelete = async (record: TreeNode) => {
    if ("isCategory" in record && record.isCategory) {
      const children = record.children || [];
      if (children.length > 0) {
        try {
          for (const et of children) {
            await fetch(`/api/v1/trip-expense-types/${et.id}`, {
              method: "DELETE",
              credentials: "include",
            });
          }
          message.success("Category and all expense types deleted");
          invalidateTripExpenseTypes();
        } catch {
          message.error("Failed to delete category");
        }
      }
    } else {
      try {
        const response = await fetch(
          `/api/v1/trip-expense-types/${record.id}`,
          { method: "DELETE", credentials: "include" }
        );
        if (response.ok) {
          message.success("Expense type deleted");
          invalidateTripExpenseTypes();
        } else {
          const error = await response.json();
          message.error(error.detail || "Failed to delete");
        }
      } catch {
        message.error("Network error");
      }
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const response = await fetch("/api/v1/trip-expense-types/seed", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        message.success(data.message);
        invalidateTripExpenseTypes();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to seed data");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSeeding(false);
    }
  };

  const columns: ProColumns<TreeNode>[] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div
          style={{
            fontWeight: "isCategory" in record && record.isCategory ? 700 : 500,
          }}
        >
          {record.name}
        </div>
      ),
      fieldProps: { placeholder: "Search name" },
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, record) => {
        if ("isCategory" in record && record.isCategory) {
          return <Tag>{record.children?.length || 0} items</Tag>;
        }
        const et = record as ExpenseTypeNode;
        return (
          <Tag color={et.is_active ? "green" : "default"}>
            {et.is_active ? "Active" : "Inactive"}
          </Tag>
        );
      },
      search: false,
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      valueType: "option",
      render: (_, record) => {
        const isCategory = "isCategory" in record && record.isCategory;
        return (
          <Space size="small">
            {isCategory && (
              <ModalForm<TripExpenseTypeCreate>
                title={`Add Expense Type to ${record.name}`}
                trigger={
                  <Button size="small" icon={<PlusOutlined />}>
                    Type
                  </Button>
                }
                onFinish={async (values) => {
                  try {
                    const response = await fetch(
                      "/api/v1/trip-expense-types",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          ...values,
                          category: record.name,
                          is_active: true,
                        }),
                      }
                    );
                    if (response.ok) {
                      message.success("Expense type added");
                      invalidateTripExpenseTypes();
                      return true;
                    }
                    const error = await response.json();
                    message.error(error.detail || "Failed");
                    return false;
                  } catch {
                    message.error("Network error");
                    return false;
                  }
                }}
              >
                <ProFormText
                  name="name"
                  label="Expense Type Name"
                  rules={[
                    { required: true, message: "Required" },
                    { max: 255, message: "Name too long" },
                  ]}
                  placeholder="e.g. Abnormal Permit (Zimbabwe)"
                />
              </ModalForm>
            )}
            <ModalForm
              title={isCategory ? "Edit Category" : "Edit Expense Type"}
              trigger={
                <Button type="text" size="small" icon={<EditOutlined />} />
              }
              onFinish={async (values) => {
                if (isCategory) {
                  const oldCategory = record.name;
                  const newCategory = values.name;
                  if (oldCategory === newCategory) return true;

                  try {
                    for (const et of (record as CategoryNode).children) {
                      await fetch(`/api/v1/trip-expense-types/${et.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ category: newCategory }),
                      });
                    }
                    message.success("Category renamed successfully");
                    invalidateTripExpenseTypes();
                    return true;
                  } catch {
                    message.error("Failed to rename category");
                    return false;
                  }
                } else {
                  try {
                    const response = await fetch(
                      `/api/v1/trip-expense-types/${record.id}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify(values),
                      }
                    );
                    if (response.ok) {
                      message.success("Expense type updated");
                      invalidateTripExpenseTypes();
                      return true;
                    }
                    const error = await response.json();
                    message.error(error.detail || "Failed");
                    return false;
                  } catch {
                    message.error("Network error");
                    return false;
                  }
                }
              }}
              initialValues={
                isCategory
                  ? { name: record.name }
                  : {
                      name: record.name,
                      category: (record as ExpenseTypeNode).category,
                      is_active: (record as ExpenseTypeNode).is_active,
                    }
              }
            >
              <ProFormText
                name="name"
                label={isCategory ? "Category Name" : "Expense Type Name"}
                rules={[
                  { required: true, message: "Required" },
                  { max: 255, message: "Name too long" },
                ]}
              />
              {!isCategory && (
                <>
                  <ProFormText
                    name="category"
                    label="Category"
                    rules={[
                      { required: true, message: "Required" },
                      { max: 100, message: "Category too long" },
                    ]}
                  />
                  <ProFormSwitch
                    name="is_active"
                    label="Status"
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                  />
                </>
              )}
            </ModalForm>
            <Popconfirm
              title={`Delete ${record.name}?`}
              description={
                isCategory
                  ? `This will delete all ${
                      (record as CategoryNode).children?.length || 0
                    } expense types in this category.`
                  : undefined
              }
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <ProTable<TreeNode>
      headerTitle="Trip Expense Types (Category & Type)"
      actionRef={actionRef}
      columns={columns}
      rowKey="key"
      dataSource={treeData}
      search={false}
      pagination={false}
      expandable={{
        defaultExpandAllRows: false,
      }}
      toolBarRender={() => [
        <Button
          key="seed"
          icon={<DatabaseOutlined />}
          loading={seeding}
          onClick={handleSeedData}
        >
          Seed Data
        </Button>,
        <Button
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>,
        <ModalForm<TripExpenseTypeCreate>
          key="create"
          title="Add Expense Type"
          trigger={
            <Button type="primary" icon={<PlusOutlined />}>
              Add Expense Type
            </Button>
          }
          onFinish={async (values) => {
            try {
              const response = await fetch("/api/v1/trip-expense-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ ...values, is_active: true }),
              });
              if (response.ok) {
                message.success("Expense type added");
                invalidateTripExpenseTypes();
                return true;
              }
              const error = await response.json();
              message.error(error.detail || "Failed");
              return false;
            } catch {
              message.error("Network error");
              return false;
            }
          }}
        >
          <ProFormText
            name="name"
            label="Expense Type Name"
            rules={[
              { required: true, message: "Required" },
              { max: 255, message: "Name too long" },
            ]}
            placeholder="e.g. Abnormal Permit (Zimbabwe)"
          />
          <ProFormText
            name="category"
            label="Category"
            rules={[
              { required: true, message: "Required" },
              { max: 100, message: "Category too long" },
            ]}
            placeholder="e.g. Cargo Charges"
          />
        </ModalForm>,
      ]}
    />
  );
}
