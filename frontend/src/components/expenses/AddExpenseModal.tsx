"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  App,
  Tabs,
  Row,
  Col,
  DatePicker,
  Table,
  Typography,
  Tooltip,
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { amountInputProps } from "@/lib/utils";
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { ExpenseRequestCreate, ExpenseCategory } from "@/types/expense";
import type { Trip } from "@/types/trip";
import type { TripExpenseType } from "@/types/trip-expense-type";
import type { OfficeExpenseType } from "@/types/office-expense-type";
import dayjs from "dayjs";
import { COMPANY_NAME, EXPENSE_CATEGORIES, CATEGORY_MAPPING } from "@/constants/expenseConstants";

const { Text } = Typography;

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tripId?: string | null;
  tripNumber?: string;
}

interface ExpenseItem {
  key: React.Key;
  expense_type_id?: string;
  amount?: number;
  currency: string;
  invoice_state: "With Invoice" | "Without Invoice";
  details?: string;
  exchange_rate?: number;
  remarks?: string;
  category?: ExpenseCategory; // To store mapped category
}

export function AddExpenseModal({
  open,
  onClose,
  onSuccess,
  tripId,
  tripNumber,
}: AddExpenseModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [tripExpenseTypes, setTripExpenseTypes] = useState<TripExpenseType[]>([]);
  const [officeExpenseTypes, setOfficeExpenseTypes] = useState<OfficeExpenseType[]>([]);
  const [expenseTypesLoading, setExpenseTypesLoading] = useState(false);

  // Exchange Rate State
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(null);

  // Table State
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [count, setCount] = useState(0);

  // File Upload State
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // Watch Payment Method for conditional fields
  const paymentMethod = Form.useWatch("payment_method", form);

  // Determine if this is a Trip Expense or Office Expense
  const isTripExpense = !!tripId;

  // Get the appropriate expense types
  const expenseTypes = isTripExpense ? tripExpenseTypes : officeExpenseTypes;

  // Fetch current exchange rate (with fallback to previous months)
  useEffect(() => {
    if (open) {
      const fetchExchangeRate = async () => {
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        const year = now.getFullYear();

        try {
          const response = await fetch(
            `/api/v1/finance/exchange-rates/current?month=${month}&year=${year}`,
            { credentials: "include" }
          );
          if (response.ok) {
            const data = await response.json();
            if (data && data.rate) {
              setCurrentExchangeRate(data.rate);
            } else {
              setCurrentExchangeRate(null);
            }
          } else {
            setCurrentExchangeRate(null);
          }
        } catch {
          setCurrentExchangeRate(null);
        }
      };
      fetchExchangeRate();
    }
  }, [open]);

  // Fetch expense types based on context (Trip vs Office)
  useEffect(() => {
    if (open) {
      const fetchTypes = async () => {
        setExpenseTypesLoading(true);
        try {
          if (isTripExpense) {
            // Fetch Trip Expense Types
            const response = await fetch("/api/v1/trip-expense-types?active_only=true&limit=200", {
              credentials: "include",
            });
            if (response.ok) {
              const data = await response.json();
              setTripExpenseTypes(data.data);
            }
          } else {
            // Fetch Office Expense Types
            const response = await fetch("/api/v1/office-expense-types?active_only=true&limit=200", {
              credentials: "include",
            });
            if (response.ok) {
              const data = await response.json();
              setOfficeExpenseTypes(data.data);
            }
          }
        } catch {
          setTripExpenseTypes([]);
          setOfficeExpenseTypes([]);
        } finally {
          setExpenseTypesLoading(false);
        }
      };
      fetchTypes();

      // Initialize with one empty row
      setItems([{
        key: '0',
        currency: 'TZS',
        invoice_state: 'With Invoice',
        exchange_rate: 1
      }]);
      setCount(1);
      setFileList([]);

      // Set default values
      form.setFieldsValue({
        company: COMPANY_NAME,
        application_date: dayjs(),
        payment_method: "Cash"
      });
    }
  }, [open, form, isTripExpense]);

  // Group trip expense types by category for the dropdown
  const groupedTripExpenseOptions = useMemo(() => {
    if (!isTripExpense) return [];

    const grouped: Record<string, TripExpenseType[]> = {};
    tripExpenseTypes.forEach(type => {
      if (!grouped[type.category]) {
        grouped[type.category] = [];
      }
      grouped[type.category].push(type);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, types]) => ({
        label: category,
        options: types.map(t => ({ label: t.name, value: t.id }))
      }));
  }, [tripExpenseTypes, isTripExpense]);

  // Group office expense types by category for the dropdown
  const groupedOfficeExpenseOptions = useMemo(() => {
    if (isTripExpense) return [];

    const grouped: Record<string, OfficeExpenseType[]> = {};
    officeExpenseTypes.forEach(type => {
      const cat = type.category || "Other";
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(type);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, types]) => ({
        label: category,
        options: types.map(t => ({ label: t.name, value: t.id }))
      }));
  }, [officeExpenseTypes, isTripExpense]);

  const handleAddRow = () => {
    const newData: ExpenseItem = {
      key: `${count}`,
      currency: 'TZS',
      invoice_state: 'With Invoice',
      exchange_rate: 1,
    };
    setItems([...items, newData]);
    setCount(count + 1);
  };

  const handleDeleteRow = (key: React.Key) => {
    const newData = items.filter((item) => item.key !== key);
    setItems(newData);
  };

  const handleItemChange = (key: React.Key, dataIndex: keyof ExpenseItem, value: any) => {
    const newData = [...items];
    const index = newData.findIndex((item) => item.key === key);
    const item = newData[index];

    // If expense type changes, auto-fill details if empty
    if (dataIndex === 'expense_type_id') {
      if (isTripExpense) {
        const selectedType = tripExpenseTypes.find(t => t.id === value);
        if (selectedType) {
          if (!item.details) {
            (newData[index] as any).details = selectedType.name;
          }
          // Map category from Trip Expense Type
          (newData[index] as any).category = CATEGORY_MAPPING[selectedType.category] || "Other";
        }
      } else {
        const selectedType = officeExpenseTypes.find(t => t.id === value);
        if (selectedType) {
          if (!item.details) {
            (newData[index] as any).details = selectedType.name;
          }
          // Office expenses always map to "Office" category
          (newData[index] as any).category = "Office";
        }
      }
    }

    // If currency changes, auto-fill exchange rate
    if (dataIndex === 'currency') {
      if (value === 'USD' && currentExchangeRate) {
        // Auto-fill with current exchange rate from finance
        (newData[index] as any).exchange_rate = currentExchangeRate;
      } else if (value === 'TZS') {
        // Reset to 1 for TZS
        (newData[index] as any).exchange_rate = 1;
      }
    }

    (newData[index] as any)[dataIndex] = value;
    setItems(newData);
  };

  // Calculate Total Application Amount
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [items]);

  const handleSubmit = async (values: any) => {
    if (items.length === 0) {
      message.error("Please add at least one expense item");
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.expense_type_id && !item.details) {
        message.error("Each item must have a type or details");
        return;
      }
      if (!item.amount || item.amount <= 0) {
        message.error("Each item must have a valid amount");
        return;
      }
    }

    setSubmitting(true);
    try {

      // Create separate requests for each item (backend limitation workaround)
      const promises = items.map(async (item) => {
        // Get the expense type name for storing in metadata
        let itemName: string | undefined;
        if (item.expense_type_id) {
          if (isTripExpense) {
            const selectedType = tripExpenseTypes.find(t => t.id === item.expense_type_id);
            itemName = selectedType?.name;
          } else {
            const selectedType = officeExpenseTypes.find(t => t.id === item.expense_type_id);
            itemName = selectedType?.name;
          }
        }

        const payload: any = {
          trip_id: tripId || null,
          amount: item.amount,
          currency: item.currency,
          // General remarks as main description (shows in table), fallback to item details
          description: values.remarks || item.details,
          category: item.category || (isTripExpense ? "Other" : "Office"),
          status: "Pending Manager",
          expense_metadata: {
            // Item-specific details stored in metadata (shows in detail modal)
            item_details: item.details,
            item_name: itemName,
            application_date: values.application_date?.toISOString(),
            payment_method: values.payment_method,
            remarks: values.remarks,
            invoice_state: item.invoice_state,
            bank_details: values.payment_method === 'Transfer' ? {
              bank_name: values.bank_name,
              account_name: values.account_name,
              account_no: values.account_no
            } : null
          }
        };

        if (item.currency !== "TZS" && item.exchange_rate) {
          payload.exchange_rate = item.exchange_rate;
        }

        const response = await fetch("/api/v1/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let detail = "Failed to create expense";
          try {
            const body = await response.json();
            if (typeof body.detail === "string") detail = body.detail;
            else if (Array.isArray(body.detail) && body.detail[0]?.msg) detail = body.detail[0].msg;
          } catch (_) {}
          throw new Error(detail);
        }

        const expense = await response.json();

        // Upload attachments if exist (Upload all files for all items in this batch)
        if (fileList.length > 0) {
          for (const file of fileList) {
            // When using beforeUpload to manually set fileList, the 'file' object might be the File itself
            // or it might be wrapped. Handle both cases.
            const fileToUpload = file.originFileObj || file;
            
            if (fileToUpload) {
              const formData = new FormData();
              // Cast to any to avoid TS issues if it thinks it's UploadFile but it's actually File/Blob
              formData.append("file", fileToUpload as any);

              await fetch(`/api/v1/expenses/${expense.id}/attachment`, {
                method: "POST",
                credentials: "include",
                body: formData,
              });
            }
          }
        }
        
        return expense;
      });

      await Promise.all(promises);

      message.success(`${items.length} expense(s) submitted successfully!`);
      form.resetFields();
      setItems([]);
      setFileList([]);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      // Show API validation detail when available
      if (err instanceof Error) {
        message.error(err.message || "Failed to create expenses");
      } else {
        message.error("Network error or failed to create expenses");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "No.",
      dataIndex: "key",
      render: (_: any, __: any, index: number) => index + 1,
      width: 60,
      align: "center" as const,
    },
    {
      title: "Payment Item",
      dataIndex: "expense_type_id",
      width: 250,
      render: (text: string, record: ExpenseItem) => (
        <Select
          showSearch
          style={{ width: "100%" }}
          placeholder="Select Item"
          optionFilterProp="label"
          value={text}
          onChange={(val) => handleItemChange(record.key, "expense_type_id", val)}
          options={isTripExpense ? groupedTripExpenseOptions : groupedOfficeExpenseOptions as any}
          loading={expenseTypesLoading}
        />
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      width: 140,
      render: (text: number, record: ExpenseItem) => (
        // in columns:
<InputNumber
  style={{ width: "100%" }}
  min={0}
  value={text}
  onChange={(val) => handleItemChange(record.key, "amount", val)}
  {...amountInputProps}
/>
      ),
    },
    {
      title: "Currency",
      dataIndex: "currency",
      width: 100,
      render: (text: string, record: ExpenseItem) => (
        <Select
          style={{ width: "100%" }}
          value={text}
          onChange={(val) => handleItemChange(record.key, "currency", val)}
        >
          <Select.Option value="TZS">TZS</Select.Option>
          <Select.Option value="USD">USD</Select.Option>
        </Select>
      ),
    },
    {
      title: "Invoice State",
      dataIndex: "invoice_state",
      width: 150,
      render: (text: string, record: ExpenseItem) => (
        <Select
          style={{ width: "100%" }}
          value={text}
          onChange={(val) => handleItemChange(record.key, "invoice_state", val)}
        >
          <Select.Option value="With Invoice">With Invoice</Select.Option>
          <Select.Option value="Without Invoice">Without Invoice</Select.Option>
        </Select>
      ),
    },
    {
      title: "Details",
      dataIndex: "details",
      width: 180,
      render: (text: string, record: ExpenseItem) => (
        <Input
          value={text}
          onChange={(e) => handleItemChange(record.key, "details", e.target.value)}
        />
      ),
    },
    {
      title: (
        <Tooltip title={currentExchangeRate ? `Current rate from Finance: ${currentExchangeRate}` : "No exchange rate set"}>
          <span style={{ cursor: 'help' }}>Ex. Rate</span>
        </Tooltip>
      ),
      dataIndex: "exchange_rate",
      width: 120,
      render: (text: number, record: ExpenseItem) => (
        <Tooltip title={record.currency === 'USD' && currentExchangeRate ? `Auto-filled from Finance rate` : ''}>
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            value={text}
            disabled={record.currency === 'TZS'}
            onChange={(val) => handleItemChange(record.key, "exchange_rate", val)}
          />
        </Tooltip>
      ),
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      width: 150,
      render: (text: string, record: ExpenseItem) => (
        <Input
          value={text}
          onChange={(e) => handleItemChange(record.key, "remarks", e.target.value)}
        />
      ),
    },
    {
      title: "",
      width: 60,
      align: "center" as const,
      render: (_: any, record: ExpenseItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          aria-label="Delete Expense Item"
          onClick={() => handleDeleteRow(record.key)}
        />
      ),
    },
  ];

  // Basic Info Tab Content
  const BasicInfoTab = (
    <>
      {/* Header Grid */}
      <div style={{ marginBottom: 24, padding: 16, background: 'var(--color-surface)', borderRadius: 8 }}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Form.Item label="Company" name="company">
              <Input readOnly />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Application Date" name="application_date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Application Amount">
              <Input
                aria-label="Application Amount"
                value={totalAmount > 0 ? `${items[0]?.currency || 'TZS'} ${totalAmount.toLocaleString("en-US")}` : '-'}
                readOnly
                style={{ fontWeight: 'bold' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Payment Method" name="payment_method" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="Cash">Cash</Select.Option>
                <Select.Option value="Transfer">Transfer</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item label="Remarks" name="remarks">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        {/* Conditional Bank Details */}
        {paymentMethod === 'Transfer' && (
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Form.Item label="Bank Name" name="bank_name" rules={[{ required: true }]}>
                <Input placeholder="Enter Bank Name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Account Name" name="account_name" rules={[{ required: true }]}>
                <Input placeholder="Enter Account Name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Account No." name="account_no" rules={[{ required: true }]}>
                <Input placeholder="Enter Account Number" />
              </Form.Item>
            </Col>
          </Row>
        )}
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 8 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
            Add Item
          </Button>
        </Space>
        <Table
          dataSource={items}
          columns={columns}
          pagination={false}
          size="middle"
          bordered
          scroll={{ x: 1100 }}
          footer={() => (
            <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 16 }}>
              Total: {items[0]?.currency || 'TZS'} {totalAmount > 0 ? totalAmount.toLocaleString("en-US") : '-'}
            </div>
          )}
        />
      </div>
    </>
  );

  // Dynamic modal title
  const modalTitle = isTripExpense
    ? `Add Trip Expense${tripNumber ? ` - ${tripNumber}` : ''}`
    : "Add Office Expense";

  return (
    <Modal
      title={modalTitle}
      open={open}
      width={1200}
      style={{ top: 20 }}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' } }}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={form.submit}>
          Submit Application
        </Button>,
      ]}
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: '1',
              label: 'Basic Information',
              children: BasicInfoTab,
            },
            {
              key: '2',
              label: 'Attachment Manage',
              children: (
                <div style={{ padding: 20 }}>
                  <Form.Item label="Attach Receipt/Document">
                    <Upload
                      fileList={fileList}
                      onRemove={(file) => {
                        const index = fileList.indexOf(file);
                        const newFileList = fileList.slice();
                        newFileList.splice(index, 1);
                        setFileList(newFileList);
                        // Clean up blob URL
                        if (file.url && file.url.startsWith('blob:')) {
                           URL.revokeObjectURL(file.url);
                        }
                      }}
                      beforeUpload={(file) => {
                        // Create preview URL immediately so it looks clickable
                        const fileWithUrl = file as UploadFile;
                        fileWithUrl.url = URL.createObjectURL(file);
                        fileWithUrl.preview = fileWithUrl.url;
                        
                        setFileList(prev => [...prev, fileWithUrl]); 
                        return false; 
                      }}
                      onPreview={async (file) => {
                        const previewUrl = file.url || file.preview;
                        if (previewUrl) {
                           window.open(previewUrl, '_blank');
                        }
                      }}
                    >
                      <Button icon={<UploadOutlined />}>Select File</Button>
                    </Upload>
                    <div style={{ marginTop: 8, color: '#888' }}>
                      Supported formats: PDF, Images. Max 3MB.
                      (The selected files will be attached to all expense items in this application)
                      <br />
                      Click the file name to preview.
                    </div>
                  </Form.Item>
                </div>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  );
}
