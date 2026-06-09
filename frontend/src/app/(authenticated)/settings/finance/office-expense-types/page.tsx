"use client";

import { useState, useMemo, useRef } from "react";
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
import type {
  OfficeExpenseType,
  OfficeExpenseTypeCreate,
} from "@/types/office-expense-type";
import { useOfficeExpenseTypes, useInvalidateQueries } from "@/hooks/application/useApi";

interface CategoryNode {
  id: string;
  key: string;
  name: string;
  isCategory: true;
  children: ExpenseTypeNode[];
}

interface ExpenseTypeNode extends OfficeExpenseType {
  key: string;
  isCategory: false;
}

type TreeNode = CategoryNode | ExpenseTypeNode;

export default function OfficeExpenseTypesPage() {
  const { message } = App.useApp();
  const { invalidateOfficeExpenseTypes } = useInvalidateQueries();
  const actionRef = useRef<ActionType>(null);

  const { data, refetch } = useOfficeExpenseTypes(false);
  const expenseTypes = (data?.data || []) as OfficeExpenseType[];

  // Transform data into tree structure
  const treeData = useMemo(() => {
    if (!expenseTypes.length) return [];

    const categoryMap = new Map<string, CategoryNode>();

    expenseTypes.forEach((et) => {
      if (!categoryMap.has(et.category)) {
        categoryMap.set(et.category, {
          id: `category-${et.category}`,
          key: `category-${et.category}`,
          name: et.category,
          isCategory: true,
          children: [],
        });
      }
    });

    expenseTypes.forEach((et) => {
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
  }, [expenseTypes]);

  const handleDelete = async (record: TreeNode) => {
    if ("isCategory" in record && record.isCategory) {
      const children = record.children || [];
      if (children.length > 0) {
        try {
          for (const et of children) {
            await fetch(`/api/v1/office-expense-types/${et.id}`, {
              method: "DELETE",
              credentials: "include",
            });
          }
          message.success("Category and all expense types deleted");
          invalidateOfficeExpenseTypes();
        } catch {
          message.error("Failed to delete category");
        }
      }
    } else {
      try {
        const response = await fetch(
          `/api/v1/office-expense-types/${record.id}`,
          { method: "DELETE", credentials: "include" }
        );
        if (response.ok) {
          message.success("Office expense type deleted");
          invalidateOfficeExpenseTypes();
        } else {
          const error = await response.json();
          message.error(error.detail || "Failed to delete");
        }
      } catch {
        message.error("Network error");
      }
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
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (_, record) => {
        if ("isCategory" in record && record.isCategory) return null;
        return (record as ExpenseTypeNode).description || "-";
      },
      search: false,
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
              <ModalForm<OfficeExpenseTypeCreate>
                title={`Add Type to ${record.name}`}
                trigger={
                  <Button size="small" icon={<PlusOutlined />}>
                    Type
                  </Button>
                }
                onFinish={async (values) => {
                  try {
                    const response = await fetch(
                      "/api/v1/office-expense-types",
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
                      message.success("Office expense type added");
                      invalidateOfficeExpenseTypes();
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
                  label="Name"
                  rules={[
                    { required: true, message: "Required" },
                    { max: 255, message: "Name too long" },
                  ]}
                  placeholder="e.g. Office Rent"
                />
                <ProFormTextArea
                  name="description"
                  label="Description"
                  rules={[{ max: 500, message: "Description too long" }]}
                  placeholder="e.g. Monthly office rent payment"
                  fieldProps={{ rows: 3 }}
                />
              </ModalForm>
            )}
            <ModalForm
              title={isCategory ? "Edit Category" : "Edit Office Expense Type"}
              trigger={
                <Button type="text" size="small" icon={<EditOutlined />} />
              }
              onFinish={async (values) => {
                if (isCategory) {
                  // Rename category — update all children
                  const oldCategory = record.name;
                  const newCategory = values.name;
                  if (oldCategory === newCategory) return true;

                  try {
                    for (const et of (record as CategoryNode).children) {
                      await fetch(`/api/v1/office-expense-types/${et.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ category: newCategory }),
                      });
                    }
                    message.success("Category renamed successfully");
                    invalidateOfficeExpenseTypes();
                    return true;
                  } catch {
                    message.error("Failed to rename category");
                    return false;
                  }
                } else {
                  try {
                    const response = await fetch(
                      `/api/v1/office-expense-types/${record.id}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify(values),
                      }
                    );
                    if (response.ok) {
                      message.success("Office expense type updated");
                      invalidateOfficeExpenseTypes();
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
                      description:
                        (record as ExpenseTypeNode).description || undefined,
                      is_active: (record as ExpenseTypeNode).is_active,
                    }
              }
            >
              <ProFormText
                name="name"
                label={isCategory ? "Category Name" : "Name"}
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
                  <ProFormTextArea
                    name="description"
                    label="Description"
                    rules={[{ max: 500, message: "Description too long" }]}
                    fieldProps={{ rows: 3 }}
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
      headerTitle="Office Expense Types"
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
          key="refresh"
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
        >
          Refresh
        </Button>,
        <ModalForm<OfficeExpenseTypeCreate>
          key="create"
          title="Add Office Expense Type"
          trigger={
            <Button type="primary" icon={<PlusOutlined />}>
              Add Type
            </Button>
          }
          onFinish={async (values) => {
            try {
              const response = await fetch("/api/v1/office-expense-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ ...values, is_active: true }),
              });
              if (response.ok) {
                message.success("Office expense type added");
                invalidateOfficeExpenseTypes();
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
            label="Name"
            rules={[
              { required: true, message: "Required" },
              { max: 255, message: "Name too long" },
            ]}
            placeholder="e.g. Office Rent"
          />
          <ProFormText
            name="category"
            label="Category"
            rules={[
              { required: true, message: "Required" },
              { max: 100, message: "Category too long" },
            ]}
            placeholder="e.g. Admin & Overheads"
          />
          <ProFormTextArea
            name="description"
            label="Description"
            rules={[{ max: 500, message: "Description too long" }]}
            placeholder="e.g. Monthly office rent payment"
            fieldProps={{ rows: 3 }}
          />
        </ModalForm>,
      ]}
    />
  );
}
