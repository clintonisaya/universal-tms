"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  message,
  Row,
  Col,
  DatePicker,
  Table,
  Typography,
  Alert,
  Tooltip,
} from "antd";
import type { ExpenseRequestDetailed, ExpenseCategory } from "@/types/expense";
import type { TripExpenseType } from "@/types/trip-expense-type";
import type { OfficeExpenseType } from "@/types/office-expense-type";
import dayjs from "dayjs";

const { Text } = Typography;

// Map Trip Expense Type categories to ExpenseCategory
const CATEGORY_MAPPING: Record<string, ExpenseCategory> = {
  "Fuel": "Fuel",
  "Driver Allowance": "Allowance",
  "Cargo Charges": "Border",
  "Transportation Costs-Others": "Other",
  "Toll Gates": "Border",
  "Road Toll": "Border",
  "Port Fee": "Border",
  "Parking Fee": "Other",
  "Council": "Border",
  "Bond": "Border",
  "Agency Fee": "Border",
  "CNPR Tax": "Border",
  "Bonus": "Allowance",
  "Border Expenses": "Border",
  "Miscellaneous": "Other",
};

interface EditExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expense: ExpenseRequestDetailed | null;
}

interface ExpenseItem {
  key: React.Key;
  expense_type_id?: string;
  amount?: number;
  currency: string;
  invoice_state: "With Invoice" | "Without Invoice";
  details?: string;
  exchange_rate?: number;
  category?: ExpenseCategory;
}

export function EditExpenseModal({
  open,
  onClose,
  onSuccess,
  expense,
}: EditExpenseModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [tripExpenseTypes, setTripExpenseTypes] = useState<TripExpenseType[]>([]);
  const [officeExpenseTypes, setOfficeExpenseTypes] = useState<OfficeExpenseType[]>([]);
  const [expenseTypesLoading, setExpenseTypesLoading] = useState(false);
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(null);
  const [items, setItems] = useState<ExpenseItem[]>([]);

  const paymentMethod = Form.useWatch("payment_method", form);
  const isTripExpense = !!expense?.trip_id;
  const expenseTypes = isTripExpense ? tripExpenseTypes : officeExpenseTypes;

  // Fetch current exchange rate
  useEffect(() => {
    if (open) {
      const fetchExchangeRate = async () => {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        try {
          const response = await fetch(
            `/api/v1/finance/exchange-rates/current?month=${month}&year=${year}`,
            { credentials: "include" }
          );
          if (response.ok) {
            const data = await response.json();
            setCurrentExchangeRate(data?.rate || null);
          }
        } catch {
          setCurrentExchangeRate(null);
        }
      };
      fetchExchangeRate();
    }
  }, [open]);

  // Fetch expense types
  useEffect(() => {
    if (open && expense) {
      const fetchTypes = async () => {
        setExpenseTypesLoading(true);
        try {
          if (isTripExpense) {
            const response = await fetch("/api/v1/trip-expense-types?active_only=true&limit=200", {
              credentials: "include",
            });
            if (response.ok) {
              const data = await response.json();
              setTripExpenseTypes(data.data);
            }
          } else {
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
    }
  }, [open, expense, isTripExpense]);

  // Initialize form with expense data
  useEffect(() => {
    if (expense && open) {
      const metadata = expense.expense_metadata || {};

      form.setFieldsValue({
        company: "EDUPO COMPANY LIMITED",
        application_date: metadata.application_date ? dayjs(metadata.application_date) : dayjs(),
        payment_method: metadata.payment_method || "Cash",
        remarks: expense.description || metadata.remarks || "",
        bank_name: metadata.bank_details?.bank_name || "",
        account_name: metadata.bank_details?.account_name || "",
        account_no: metadata.bank_details?.account_no || "",
      });

      // Initialize single item from expense (expense_type_id will be matched after types load)
      setItems([{
        key: '0',
        expense_type_id: undefined,
        amount: Number(expense.amount) || 0,
        currency: expense.currency || 'TZS',
        invoice_state: (metadata.invoice_state as "With Invoice" | "Without Invoice") || 'With Invoice',
        details: metadata.item_details || expense.description,
        exchange_rate: Number(expense.exchange_rate) || 1,
        category: expense.category,
      }]);
    }
  }, [expense, open, form]);

  // Match expense type by name after types are loaded
  useEffect(() => {
    if (!expense || items.length === 0) return;

    const metadata = expense.expense_metadata || {};
    const itemName = metadata.item_name || metadata.item_details || expense.description;

    if (!itemName) return;

    let matchedTypeId: string | undefined;

    if (isTripExpense && tripExpenseTypes.length > 0) {
      const matchedType = tripExpenseTypes.find(t =>
        t.name.toLowerCase() === itemName.toLowerCase()
      );
      matchedTypeId = matchedType?.id;
    } else if (!isTripExpense && officeExpenseTypes.length > 0) {
      const matchedType = officeExpenseTypes.find(t =>
        t.name.toLowerCase() === itemName.toLowerCase()
      );
      matchedTypeId = matchedType?.id;
    }

    if (matchedTypeId && items[0]?.expense_type_id !== matchedTypeId) {
      setItems(prev => [{
        ...prev[0],
        expense_type_id: matchedTypeId,
      }]);
    }
  }, [expense, tripExpenseTypes, officeExpenseTypes, isTripExpense, items]);

  // Group trip expense types by category
  const groupedTripExpenseOptions = useMemo(() => {
    if (!isTripExpense) return [];
    const grouped: Record<string, TripExpenseType[]> = {};
    tripExpenseTypes.forEach(type => {
      if (!grouped[type.category]) grouped[type.category] = [];
      grouped[type.category].push(type);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, types]) => ({
        label: category,
        options: types.map(t => ({ label: t.name, value: t.id }))
      }));
  }, [tripExpenseTypes, isTripExpense]);

  const officeExpenseOptions = useMemo(() => {
    return officeExpenseTypes.map(t => ({ label: t.name, value: t.id }));
  }, [officeExpenseTypes]);

  const handleItemChange = (key: React.Key, dataIndex: keyof ExpenseItem, value: any) => {
    const newData = [...items];
    const index = newData.findIndex((item) => item.key === key);

    if (dataIndex === 'expense_type_id') {
      if (isTripExpense) {
        const selectedType = tripExpenseTypes.find(t => t.id === value);
        if (selectedType) {
          (newData[index] as any).details = selectedType.name;
          (newData[index] as any).category = CATEGORY_MAPPING[selectedType.category] || "Other";
        }
      } else {
        const selectedType = officeExpenseTypes.find(t => t.id === value);
        if (selectedType) {
          (newData[index] as any).details = selectedType.name;
          (newData[index] as any).category = "Office";
        }
      }
    }

    if (dataIndex === 'currency') {
      if (value === 'USD' && currentExchangeRate) {
        (newData[index] as any).exchange_rate = currentExchangeRate;
      } else if (value === 'TZS') {
        (newData[index] as any).exchange_rate = 1;
      }
    }

    (newData[index] as any)[dataIndex] = value;
    setItems(newData);
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [items]);

  const handleSubmit = async (values: any) => {
    if (!expense || items.length === 0) return;

    const item = items[0];
    if (!item.amount || item.amount <= 0) {
      message.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      // Get expense type name
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

      // Update expense details
      const updatePayload: any = {
        amount: item.amount,
        description: values.remarks || item.details,
        category: item.category || expense.category,
      };

      const updateResponse = await fetch(`/api/v1/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        const err = await updateResponse.json();
        message.error(err.detail || "Failed to update expense");
        return;
      }

      // Resubmit by changing status to Pending Manager
      const resubmitResponse = await fetch(`/api/v1/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "Pending Manager" }),
      });

      if (resubmitResponse.ok) {
        message.success("Expense updated and resubmitted for approval");
        form.resetFields();
        setItems([]);
        onSuccess();
        onClose();
      } else {
        const err = await resubmitResponse.json();
        message.error(err.detail || "Failed to resubmit expense");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "No.",
      key: "row_number",
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
          options={isTripExpense ? groupedTripExpenseOptions : officeExpenseOptions as any}
          loading={expenseTypesLoading}
          allowClear
        />
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      width: 140,
      render: (text: number, record: ExpenseItem) => (
        <InputNumber
          style={{ width: "100%" }}
          min={0}
          value={text}
          formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => value?.replace(/,/g, '') as unknown as number}
          onChange={(val) => handleItemChange(record.key, "amount", val)}
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
      width: 200,
      render: (text: string, record: ExpenseItem) => (
        <Input
          value={text}
          onChange={(e) => handleItemChange(record.key, "details", e.target.value)}
        />
      ),
    },
    {
      title: (
        <Tooltip title={currentExchangeRate ? `Current rate: ${currentExchangeRate}` : "No rate set"}>
          <span style={{ cursor: 'help' }}>Ex. Rate</span>
        </Tooltip>
      ),
      dataIndex: "exchange_rate",
      width: 120,
      render: (text: number, record: ExpenseItem) => (
        <InputNumber
          style={{ width: "100%" }}
          min={0}
          value={text}
          disabled={record.currency === 'TZS'}
          onChange={(val) => handleItemChange(record.key, "exchange_rate", val)}
        />
      ),
    },
  ];

  if (!expense) return null;

  const modalTitle = isTripExpense
    ? `Fix & Resubmit - ${expense.expense_number || expense.id.slice(0, 8).toUpperCase()}${expense.trip ? ` (Trip: ${expense.trip.trip_number})` : ''}`
    : `Fix & Resubmit - ${expense.expense_number || expense.id.slice(0, 8).toUpperCase()}`;

  return (
    <Modal
      title={modalTitle}
      open={open}
      width={1100}
      style={{ top: 20 }}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' } }}
      onCancel={() => {
        form.resetFields();
        setItems([]);
        onClose();
      }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={form.submit}>
          Update & Resubmit
        </Button>,
      ]}
      destroyOnHidden
    >
      {/* Manager Feedback */}
      {expense.manager_comment && (
        <Alert
          type="warning"
          message="Manager's Feedback - Please address the following before resubmitting:"
          description={expense.manager_comment}
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Header Grid */}
        <div style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Form.Item label="Company" name="company">
                <Input readOnly />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Application Date" name="application_date">
                <DatePicker style={{ width: '100%' }} disabled />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Application Amount">
                <Input
                  value={items.length > 0 && totalAmount > 0 ? `${items[0]?.currency || 'TZS'} ${totalAmount.toLocaleString()}` : '-'}
                  readOnly
                  style={{ fontWeight: 'bold' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Payment Method" name="payment_method">
                <Select>
                  <Select.Option value="Cash">Cash</Select.Option>
                  <Select.Option value="Transfer">Transfer</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item label="Remarks" name="remarks">
                <Input placeholder="General remarks for this expense" />
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
          <Text strong style={{ marginBottom: 8, display: 'block' }}>Expense Item</Text>
          <Table
            dataSource={items}
            columns={columns}
            pagination={false}
            size="middle"
            bordered
            scroll={{ x: 1000 }}
            footer={() => (
              <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 16 }}>
                Total: {items[0]?.currency || 'TZS'} {totalAmount > 0 ? totalAmount.toLocaleString() : '-'}
              </div>
            )}
          />
        </div>
      </Form>
    </Modal>
  );
}
