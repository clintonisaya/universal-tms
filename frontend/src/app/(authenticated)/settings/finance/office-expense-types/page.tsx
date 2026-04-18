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
  App,
  Typography,
  Popconfirm,
  Flex,
} from "antd";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type {
  OfficeExpenseType,
  OfficeExpenseTypeCreate,
  OfficeExpenseTypeUpdate,
} from "@/types/office-expense-type";
import { useAuth } from "@/contexts/AuthContext";
import { useOfficeExpenseTypes, useInvalidateQueries } from "@/hooks/useApi";
import {
  getColumnSearchProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title } = Typography;
const { TextArea } = Input;

// Tree node types
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
  const router = useRouter();
  const { user } = useAuth();
  const { message } = App.useApp();

  // TanStack Query
  const { data, isLoading: loading, refetch } = useOfficeExpenseTypes(false);
  const { invalidateOfficeExpenseTypes } = useInvalidateQueries();

  const expenseTypes = (data?.data || []) as OfficeExpenseType[];

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
    if (!expenseTypes.length) return [];

    const categoryMap = new Map<string, CategoryNode>();

    // First pass: collect all unique categories
    expenseTypes.forEach((expenseType) => {
      if (!categoryMap.has(expenseType.category)) {
        categoryMap.set(expenseType.category, {
          id: `category-${expenseType.category}`,
          key: `category-${expenseType.category}`,
          name: expenseType.category,
          isCategory: true,
          children: [],
        });
      }
    });

    // Second pass: add expense types as children
    expenseTypes.forEach((expenseType) => {
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
  }, [expenseTypes]);

  // Category rename handler — updates all child expense types
  const handleCategorySubmit = async (values: { name: string }) => {
    if (!editingItem || !("isCategory" in editingItem) || !editingItem.isCategory) return;

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
      for (const expenseType of editingItem.children) {
        await fetch(`/api/v1/office-expense-types/${expenseType.id}`, {
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
      invalidateOfficeExpenseTypes();
    } catch {
      message.error("Failed to rename category");
    } finally {
      setSubmitting(false);
    }
  };

  // Expense Type handlers
  const handleExpenseTypeSubmit = async (values: OfficeExpenseTypeCreate & { is_active?: boolean }) => {
    setSubmitting(true);
    try {
      const isEditing = editingItem && !("isCategory" in editingItem && editingItem.isCategory);
      const url = isEditing
        ? `/api/v1/office-expense-types/${editingItem!.id}`
        : "/api/v1/office-expense-types";
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
        message.success(`Office expense type ${isEditing ? "updated" : "added"} successfully`);
        setIsExpenseTypeModalOpen(false);
        expenseTypeForm.resetFields();
        setEditingItem(null);
        invalidateOfficeExpenseTypes();
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
      const expenseTypesToDelete = record.children || [];
      if (expenseTypesToDelete.length > 0) {
        try {
          for (const expenseType of expenseTypesToDelete) {
            await fetch(`/api/v1/office-expense-types/${expenseType.id}`, {
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
        const response = await fetch(`/api/v1/office-expense-types/${record.id}`, {
          method: "DELETE",
          credentials: "include",
        });
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

  const columns: ColumnsType<TreeNode> = [
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
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (desc: string | null, record: TreeNode) => {
        if ("isCategory" in record && record.isCategory) return null;
        return desc || "-";
      },
      ...getColumnSearchProps("description"),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, record: TreeNode) => {
        if ("isCategory" in record && record.isCategory) {
          return <StatusBadge status={`${record.children?.length || 0} items`} colorKey="gray" />;
        }
        const expenseType = record as ExpenseTypeNode;
        return (
          <StatusBadge status={expenseType.is_active ? "Active" : "Inactive"} colorKey={expenseType.is_active ? "green" : "gray"} />
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
                aria-label={isCategory ? "Edit Category" : "Edit Expense Type"}
                onClick={() => {
                  setEditingItem(record);
                  if (isCategory) {
                    categoryForm.setFieldsValue({ name: record.name });
                    setIsCategoryModalOpen(true);
                  } else {
                    const expenseType = record as ExpenseTypeNode;
                    expenseTypeForm.setFieldsValue({
                      name: expenseType.name,
                      category: expenseType.category,
                      description: expenseType.description || undefined,
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
                <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="Delete" />
              </Popconfirm>
            </Space>
          </div>
        );
      },
    },
  ];

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
                onClick={() => router.push("/settings/finance")}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Office Expense Types
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
                Add Type
              </Button>
            </Space>
          </div>

          <Table<TreeNode>
            columns={resizableColumns}
            components={components}
            dataSource={treeData}
            rowKey="key"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            scroll={{ x: "max-content" }}
            pagination={false}
            rowSelection={getStandardRowSelection(
              1,
              treeData.length || 1000,
              selectedRowKeys,
              setSelectedRowKeys
            )}
            expandable={{
              defaultExpandAllRows: false,
            }}
          />
        </Flex>
      </Card>

      {/* Category Modal (for renaming) */}
      <Modal
        title="Edit Category"
        open={isCategoryModalOpen}
        width={600}
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
            <Input placeholder="e.g. Admin & Overheads" />
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
            ? "Edit Office Expense Type"
            : selectedCategory
            ? `Add Type to ${selectedCategory}`
            : "Add Office Expense Type"
        }
        open={isExpenseTypeModalOpen}
        width={600}
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
            label="Name"
            rules={[
              { required: true, message: "Required" },
              { max: 255, message: "Name too long" },
            ]}
          >
            <Input placeholder="e.g. Office Rent" />
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
              <Input placeholder="e.g. Admin & Overheads" />
            </Form.Item>
          )}

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 500, message: "Description too long" }]}
          >
            <TextArea placeholder="e.g. Monthly office rent payment" rows={3} />
          </Form.Item>

          {editingItem && !("isCategory" in editingItem && editingItem.isCategory) && (
            <Form.Item name="is_active" label="Status" valuePropName="checked">
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
