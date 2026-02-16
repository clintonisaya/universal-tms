"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  Tag,
  message,
  Typography,
  Popconfirm,
  Flex,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type {
  TripExpenseType,
  TripExpenseTypeCreate,
  TripExpenseTypesResponse,
} from "@/types/trip-expense-type";
import { useAuth } from "@/contexts/AuthContext";
import { useTripExpenseTypes, useInvalidateQueries } from "@/hooks/useApi";
import {
  getColumnSearchProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title } = Typography;

// Tree node types
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
  const router = useRouter();
  const { user } = useAuth();
  
  // TanStack Query for expense types
  const { data: queryData, isLoading: loading, refetch } = useTripExpenseTypes();
  const { invalidateTripExpenseTypes } = useInvalidateQueries();
  
  const [seeding, setSeeding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isExpenseTypeModalOpen, setIsExpenseTypeModalOpen] = useState(false);

  // State for Create/Edit
  const [editingItem, setEditingItem] = useState<CategoryNode | ExpenseTypeNode | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const [categoryForm] = Form.useForm();
  const [expenseTypeForm] = Form.useForm();

  // Transform data into tree structure
  const treeData = useMemo(() => {
    const rawData = (queryData?.data || []) as TripExpenseType[];
    if (!rawData.length) return [];

    const categoryMap = new Map<string, CategoryNode>();

    // First pass: collect all unique categories
    rawData.forEach((expenseType) => {
      if (!categoryMap.has(expenseType.category)) {
        categoryMap.set(expenseType.category, {
          id: `category-${expenseType.category}`,
          key: `category-${expenseType.category}`,
          name: expenseType.category,
          sorting: 10,
          isCategory: true,
          children: [],
        });
      }
    });

    // Second pass: add expense types as children
    rawData.forEach((expenseType) => {
      const category = categoryMap.get(expenseType.category);
      if (category) {
        category.children.push({
          ...expenseType,
          key: expenseType.id,
          isCategory: false,
            });
          }
        });

    // Sort categories alphabetically, then sort children by name
    const sortedCategories = Array.from(categoryMap.values()).sort(
      (a, b) => a.name.localeCompare(b.name)
    );

    sortedCategories.forEach((cat) => {
      cat.children.sort((a, b) => a.name.localeCompare(b.name));
    });

    return sortedCategories;
  }, [queryData]);

  // Category Handlers (categories are virtual - they're derived from expense types)
  const handleCategorySubmit = async (values: { name: string; sorting?: number }) => {
    if (editingItem && "isCategory" in editingItem && editingItem.isCategory) {
      // Renaming a category means updating all expense types with that category
      const oldCategory = editingItem.name;
      const newCategory = values.name;

      if (oldCategory === newCategory) {
        setIsCategoryModalOpen(false);
        categoryForm.resetFields();
        setEditingItem(null);
        return;
      }

      setSubmitting(true);
      try {
        // Find all expense types with the old category and update them
        const expenseTypesToUpdate = editingItem.children || [];

        for (const expenseType of expenseTypesToUpdate) {
          await fetch(`/api/v1/trip-expense-types/${expenseType.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ category: newCategory }),
          });
        }

        message.success("Category renamed successfully");
        setIsCategoryModalOpen(false);
        categoryForm.resetFields();
        setEditingItem(null);
        invalidateTripExpenseTypes();
      } catch {
        message.error("Failed to rename category");
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Expense Type Handlers
  const handleExpenseTypeSubmit = async (values: TripExpenseTypeCreate & { is_active?: boolean }) => {
    setSubmitting(true);
    try {
      const isEditing = editingItem && !("isCategory" in editingItem && editingItem.isCategory);
      const url = isEditing
        ? `/api/v1/trip-expense-types/${editingItem!.id}`
        : "/api/v1/trip-expense-types";
      const method = isEditing ? "PATCH" : "POST";

      const payload = { ...values };
      if (!isEditing && selectedCategory) {
        payload.category = selectedCategory;
      }
      if (!isEditing) {
        payload.is_active = true;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        message.success(`Expense type ${isEditing ? "updated" : "added"} successfully`);
        setIsExpenseTypeModalOpen(false);
        expenseTypeForm.resetFields();
        setEditingItem(null);
        invalidateTripExpenseTypes();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: TreeNode) => {
    if ("isCategory" in record && record.isCategory) {
      // Deleting a category means deleting all its expense types
      const expenseTypesToDelete = record.children || [];

      if (expenseTypesToDelete.length > 0) {
        try {
          for (const expenseType of expenseTypesToDelete) {
            await fetch(`/api/v1/trip-expense-types/${expenseType.id}`, {
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
      // Delete single expense type
      try {
        const response = await fetch(`/api/v1/trip-expense-types/${record.id}`, {
          method: "DELETE",
          credentials: "include",
        });
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

  const columns: ColumnsType<any> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: TreeNode) => (
        <div style={{ fontWeight: "isCategory" in record && record.isCategory ? 700 : 500 }}>
          {text}
        </div>
      ),
      ...getColumnSearchProps("name"),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, record: TreeNode) => {
        if ("isCategory" in record && record.isCategory) {
          return <Tag color="blue">{record.children?.length || 0} items</Tag>;
        }
        const expenseType = record as ExpenseTypeNode;
        return (
          <Tag color={expenseType.is_active ? "green" : "default"}>
            {expenseType.is_active ? "Active" : "Inactive"}</Tag>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, record: TreeNode) => {
        const isCategory = "isCategory" in record && record.isCategory;
        return (
          <div className="row-actions">
            <Space size="small">
              {isCategory && (
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingItem(null);
                    setSelectedCategory(record.name);
                    expenseTypeForm.resetFields();
                    setIsExpenseTypeModalOpen(true);
                  }}
                >
                  Type
                </Button>
              )}
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingItem(record as CategoryNode | ExpenseTypeNode);
                  if (isCategory) {
                    categoryForm.setFieldsValue({ name: record.name });
                    setIsCategoryModalOpen(true);
                  } else {
                    const expenseType = record as ExpenseTypeNode;
                    expenseTypeForm.setFieldsValue({
                      name: expenseType.name,
                      category: expenseType.category,
                      is_active: expenseType.is_active,
                    });
                    setIsExpenseTypeModalOpen(true);
                  }
                }}
              />
              <Popconfirm
                title={`Delete ${record.name}?`}
                description={isCategory ? `This will delete all ${(record as CategoryNode).children?.length || 0} expense types in this category.` : undefined}
                onConfirm={() => handleDelete(record)}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button type="text" danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          </div>
        );
      },
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  return (
    <div>
      <Card>
        <Flex vertical gap="middle" style={{ width: "100%" }}>
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
                Trip Expense Types (Category &amp; Type)
              </Title>
            </Space>
            <Space>
              
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingItem(null);
                  setSelectedCategory("");
                  expenseTypeForm.resetFields();
                  setIsExpenseTypeModalOpen(true);
                }}
              >
                Add Expense Type
              </Button>
            </Space>
          </div>

          <Table
            columns={resizableColumns}
            components={components}
            dataSource={treeData}
            rowKey="key"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            pagination={false}
            rowSelection={getStandardRowSelection(
              1,
              treeData.length || 1000,
              selectedRowKeys,
              setSelectedRowKeys
            )}
            expandable={{
              defaultExpandAllRows: true,
            }}
          />
        </Flex>
      </Card>

      {/* Category Modal (for renaming) */}
      <Modal
        title="Edit Category"
        open={isCategoryModalOpen}
        onCancel={() => {
          setIsCategoryModalOpen(false);
          setEditingItem(null);
          categoryForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleCategorySubmit}
        >
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="e.g. Cargo Charges" />
          </Form.Item>
          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Save
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Expense Type Modal */}
      <Modal
        title={
          editingItem && !("isCategory" in editingItem && editingItem.isCategory)
            ? "Edit Expense Type"
            : selectedCategory
            ? `Add Expense Type to ${selectedCategory}`
            : "Add Expense Type"
        }
        open={isExpenseTypeModalOpen}
        onCancel={() => {
          setIsExpenseTypeModalOpen(false);
          setEditingItem(null);
          expenseTypeForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={expenseTypeForm}
          layout="vertical"
          onFinish={handleExpenseTypeSubmit}
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="name"
            label="Expense Type Name"
            rules={[
              { required: true, message: "Required" },
              { max: 255, message: "Name too long" },
            ]}
          >
            <Input placeholder="e.g. Abnormal Permit (Zimbabwe)" />
          </Form.Item>

          {!selectedCategory && (
            <Form.Item
              name="category"
              label="Category"
              rules={[
                { required: true, message: "Required" },
                { max: 100, message: "Category too long" },
              ]}
            >
              <Input placeholder="e.g. Cargo Charges" />
            </Form.Item>
          )}

          {editingItem && !("isCategory" in editingItem && editingItem.isCategory) && (
            <Form.Item
              name="is_active"
              label="Status"
              valuePropName="checked"
            >
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          )}

          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsExpenseTypeModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingItem && !("isCategory" in editingItem && editingItem.isCategory) ? "Save" : "Create"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}