"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Modal,
  Form,
  Input,
  Select,
  App,
  Typography,
  Popconfirm,
  Switch,
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
  getColumnFilterProps,
} from "@/components/ui/tableUtils";

const { Title } = Typography;
const { TextArea } = Input;

export default function OfficeExpenseTypesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { message } = App.useApp();

  // TanStack Query
  const { data, isLoading: loading, refetch } = useOfficeExpenseTypes(false); // Fetch all (active and inactive)
  const { invalidateOfficeExpenseTypes } = useInvalidateQueries();

  const expenseTypes = (data?.data || []) as OfficeExpenseType[];
  const totalCount = data?.count || 0;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<OfficeExpenseType | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [categories, setCategories] = useState<string[]>([]);

  const [createForm] = Form.useForm<OfficeExpenseTypeCreate>();
  const [editForm] = Form.useForm<OfficeExpenseTypeUpdate>();

  // Fetch categories for the select dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/v1/office-expense-types/categories", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch {
        // fallback: extract from loaded data
      }
    };
    fetchCategories();
  }, [data]);

  // Build unique categories from loaded data as fallback
  const categoryOptions = categories.length > 0
    ? categories
    : [...new Set(expenseTypes.map(t => t.category).filter(Boolean))].sort();

  const handleCreate = async (values: OfficeExpenseTypeCreate) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/office-expense-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      if (response.ok) {
        message.success("Office expense type added successfully");
        setIsCreateModalOpen(false);
        createForm.resetFields();
        invalidateOfficeExpenseTypes();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create office expense type");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: OfficeExpenseTypeUpdate) => {
    if (!editingType) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/v1/office-expense-types/${editingType.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(values),
        }
      );
      if (response.ok) {
        message.success("Office expense type updated successfully");
        setIsEditModalOpen(false);
        setEditingType(null);
        editForm.resetFields();
        invalidateOfficeExpenseTypes();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update office expense type");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expenseType: OfficeExpenseType) => {
    try {
      const response = await fetch(`/api/v1/office-expense-types/${expenseType.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        message.success("Office expense type deleted successfully");
        invalidateOfficeExpenseTypes();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete office expense type");
      }
    } catch {
      message.error("Network error");
    }
  };

  const openEditModal = (expenseType: OfficeExpenseType) => {
    setEditingType(expenseType);
    editForm.setFieldsValue({
      name: expenseType.name,
      category: expenseType.category,
      description: expenseType.description || undefined,
      is_active: expenseType.is_active,
    });
    setIsEditModalOpen(true);
  };

  const columns: ColumnsType<OfficeExpenseType> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 200,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string) => (
        <div style={{ fontWeight: 600 }}>{text}</div>
      ),
      ...getColumnSearchProps("name"),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 180,
      sorter: (a, b) => a.category.localeCompare(b.category),
      ...getColumnFilterProps(
        "category",
        categoryOptions.map(c => ({ text: c, value: c }))
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (desc: string | null) => desc || "-",
      ...getColumnSearchProps("description"),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 100,
      render: (active: boolean) => (
        <StatusBadge status={active ? "Active" : "Inactive"} colorKey={active ? "green" : "gray"} />
      ),
      ...getColumnFilterProps("is_active", [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ]),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              aria-label="Edit Expense Type"
            />
            <Popconfirm
              title="Delete type"
              description={`Delete "${record.name}"?`}
              onConfirm={() => handleDelete(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger size="small" icon={<DeleteOutlined />} aria-label="Delete Expense Type" />
            </Popconfirm>
          </Space>
        </div>
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  return (
    <div>
      <Card>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
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
                onClick={() => setIsCreateModalOpen(true)}
              >
                Add Type
              </Button>
            </Space>
          </div>

          <Table<OfficeExpenseType>
            columns={resizableColumns}
            components={components}
            dataSource={expenseTypes}
            rowKey="id"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            scroll={{ x: "max-content" }}
            rowSelection={getStandardRowSelection(
              currentPage,
              pageSize,
              selectedRowKeys,
              setSelectedRowKeys
            )}
            pagination={{
              current: currentPage,
              pageSize,
              total: totalCount,
              showTotal: (total) => `Total ${total} types`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
          />
        </Space>
      </Card>

      {/* Create Modal */}
      <Modal
        title="Add Office Expense Type"
        open={isCreateModalOpen}
        width={660}
        onCancel={() => {
          setIsCreateModalOpen(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form<OfficeExpenseTypeCreate>
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ is_active: true }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please enter a name" },
              { max: 255, message: "Name too long" },
            ]}
          >
            <Input placeholder="e.g., Office Rent" />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[
              { required: true, message: "Please select or enter a category" },
              { max: 100, message: "Category too long" },
            ]}
          >
            <Select
              showSearch
              allowClear
              placeholder="Select or type a category"
              options={categoryOptions.map(c => ({ label: c, value: c }))}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 500, message: "Description too long" }]}
          >
            <TextArea
              placeholder="e.g., Monthly office rent payment"
              rows={3}
            />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  createForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Add Type
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Edit Office Expense Type"
        open={isEditModalOpen}
        width={660}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingType(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form<OfficeExpenseTypeUpdate>
          form={editForm}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please enter a name" },
              { max: 255, message: "Name too long" },
            ]}
          >
            <Input placeholder="e.g., Office Rent" />
          </Form.Item>

          <Form.Item
            name="category"
            label="Category"
            rules={[
              { required: true, message: "Please select or enter a category" },
              { max: 100, message: "Category too long" },
            ]}
          >
            <Select
              showSearch
              allowClear
              placeholder="Select or type a category"
              options={categoryOptions.map(c => ({ label: c, value: c }))}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ max: 500, message: "Description too long" }]}
          >
            <TextArea
              placeholder="e.g., Monthly office rent payment"
              rows={3}
            />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingType(null);
                  editForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Save Changes
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
