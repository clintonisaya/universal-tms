"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Tabs,
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Space,
  Button,
  Typography,
  Table,
  Spin,
  Empty,
  App,
  Alert,
  Descriptions,
  Tooltip,
  DatePicker,
  Form,
  Steps,
  Upload,
} from "antd";
import dayjs from "dayjs";
import { amountInputProps, fmtAmount, fmtCurrency } from "@/lib/utils";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  UndoOutlined,
  DollarOutlined,
  SendOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileUnknownOutlined,
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { ExpenseRequestDetailed, ExpenseCategory } from "@/types/expense";
import type { TripExpenseType } from "@/types/trip-expense-type";
import type { OfficeExpenseType } from "@/types/office-expense-type";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { COMPANY_NAME, CATEGORY_MAPPING, EXPENSE_STEPS } from "@/constants/expenseConstants";

const { Text } = Typography;
const { TextArea } = Input;

interface AttachmentInfo {
  key: string;
  filename: string;
  url: string | null;
}

interface ExpenseReviewModalProps {
  open: boolean;
  onClose: () => void;
  expense: ExpenseRequestDetailed | null;
  actions?: string[];
  onActionComplete?: () => void;
  /** @deprecated Use onActionComplete instead — payment is now handled inline */
  onPay?: (expense: ExpenseRequestDetailed) => void;
  loading?: boolean;
}


interface EditableItem {
  expense_type_id?: string;
  amount: number;
  currency: string;
  invoice_state: string;
  details: string;
  exchange_rate: number;
  category: ExpenseCategory;
}

interface EditableHeader {
  payment_method: string;
  remarks: string;
  bank_name: string;
  account_name: string;
  account_no: string;
}

function getFileIcon(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf"))
    return <FilePdfOutlined style={{ color: "var(--color-red)", fontSize: 18 }} />;
  if (lower.match(/\.(jpe?g|png|gif|webp)$/))
    return <FileImageOutlined style={{ color: "var(--color-blue)", fontSize: 18 }} />;
  if (lower.match(/\.(docx?)$/))
    return <FileWordOutlined style={{ color: "var(--color-blue)", fontSize: 18 }} />;
  return <FileUnknownOutlined style={{ fontSize: 18 }} />;
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = fmtCurrency;

export function ExpenseReviewModal({
  open,
  onClose,
  expense,
  actions = [],
  onActionComplete,
  onPay,
  loading = false,
}: ExpenseReviewModalProps) {
  const { message } = App.useApp();
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Inline payment form
  const [paymentForm] = Form.useForm();
  const paymentMethodValue = Form.useWatch("method", paymentForm);

  // Editable state for returned expenses
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [editCount, setEditCount] = useState(1);
  const [editHeader, setEditHeader] = useState<EditableHeader | null>(null);
  const [tripExpenseTypes, setTripExpenseTypes] = useState<TripExpenseType[]>([]);
  const [officeExpenseTypes, setOfficeExpenseTypes] = useState<OfficeExpenseType[]>([]);
  const [expenseTypesLoading, setExpenseTypesLoading] = useState(false);
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(null);

  const isReturned = expense?.status === "Returned";
  const editable = isReturned && actions.includes("submit");
  const isTripExpense = !!expense?.trip_id;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setComment("");
      paymentForm.resetFields();
    }
  }, [open, expense?.id, paymentForm]);

  // Initialize editable state from expense data
  useEffect(() => {
    if (open && expense && editable) {
      const meta = expense.expense_metadata || {};
      const savedItems = (meta as any).items as any[] | undefined;
      if (savedItems && savedItems.length > 0) {
        setEditItems(savedItems.map((it: any) => ({
          expense_type_id: it.expense_type_id,
          amount: Number(it.amount) || 0,
          currency: it.currency || "TZS",
          invoice_state: it.invoice_state || "With Invoice",
          details: it.item_details || "",
          exchange_rate: Number(it.exchange_rate) || 1,
          category: it.category,
        })));
        setEditCount(savedItems.length);
      } else {
        setEditItems([{
          expense_type_id: undefined,
          amount: Number(expense.amount) || 0,
          currency: expense.currency || "TZS",
          invoice_state: meta.invoice_state || "With Invoice",
          details: meta.item_details || expense.description || "",
          exchange_rate: Number(expense.exchange_rate) || 1,
          category: expense.category,
        }]);
        setEditCount(1);
      }
      setEditHeader({
        payment_method: meta.payment_method || "Cash",
        remarks: meta.remarks || expense.description || "",
        bank_name: meta.bank_details?.bank_name || "",
        account_name: meta.bank_details?.account_name || "",
        account_no: meta.bank_details?.account_no || "",
      });
    }
  }, [open, expense?.id, editable]);

  // Fetch expense types for edit mode
  useEffect(() => {
    if (open && editable) {
      const fetchTypes = async () => {
        setExpenseTypesLoading(true);
        try {
          const url = isTripExpense
            ? "/api/v1/trip-expense-types?active_only=true&limit=200"
            : "/api/v1/office-expense-types?active_only=true&limit=200";
          const response = await fetch(url, { credentials: "include" });
          if (response.ok) {
            const data = await response.json();
            if (isTripExpense) setTripExpenseTypes(data.data);
            else setOfficeExpenseTypes(data.data);
          }
        } catch {
          /* ignore */
        } finally {
          setExpenseTypesLoading(false);
        }
      };
      const fetchRate = async () => {
        const now = new Date();
        try {
          const response = await fetch(
            `/api/v1/finance/exchange-rates/current?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
            { credentials: "include" }
          );
          if (response.ok) {
            const data = await response.json();
            setCurrentExchangeRate(data?.rate || null);
          }
        } catch {
          /* ignore */
        }
      };
      fetchTypes();
      fetchRate();
    }
  }, [open, editable, isTripExpense]);

  // AC-4: Match expense type by ID first, fall back to name for legacy data
  useEffect(() => {
    if (!expense || editItems.length === 0 || editItems[0].expense_type_id) return;
    const meta = expense.expense_metadata || {};
    const types = isTripExpense ? tripExpenseTypes : officeExpenseTypes;
    if (types.length === 0) return;

    // Try ID match from metadata first
    const savedItems = (meta as any).items as any[] | undefined;
    const firstSavedId = savedItems?.[0]?.expense_type_id;
    if (firstSavedId) {
      const idMatch = types.find((t) => t.id === firstSavedId);
      if (idMatch) {
        setEditItems((prev) => [{ ...prev[0], expense_type_id: idMatch.id }, ...prev.slice(1)]);
        return;
      }
    }

    // Fall back to name matching for legacy data without expense_type_id
    const itemName = meta.item_name || meta.item_details || expense.description;
    if (!itemName) return;
    const match = types.find(
      (t) => t.name.toLowerCase() === itemName.toLowerCase()
    );
    if (match) {
      setEditItems((prev) => [{ ...prev[0], expense_type_id: match.id }, ...prev.slice(1)]);
    }
  }, [tripExpenseTypes, officeExpenseTypes, expense, editItems[0]?.expense_type_id, isTripExpense]);

  // Grouped options for expense type dropdowns
  const groupedExpenseOptions = useMemo(() => {
    const types = isTripExpense ? tripExpenseTypes : officeExpenseTypes;
    const grouped: Record<string, { name: string; id: string }[]> = {};
    types.forEach((t: any) => {
      const cat = t.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => ({
        label: category,
        options: items.map((t) => ({ label: t.name, value: t.id })),
      }));
  }, [tripExpenseTypes, officeExpenseTypes, isTripExpense]);

  // Fetch attachments — extracted for retry support (AC-2)
  const fetchAttachments = async () => {
    if (!expense?.id) return;
    setAttachmentsLoading(true);
    setAttachmentError(false);
    try {
      const response = await fetch(
        `/api/v1/expenses/${expense.id}/attachments`,
        { credentials: "include" }
      );
      if (response.ok) {
        setAttachments(await response.json());
      } else {
        setAttachments([]);
        setAttachmentError(true);
      }
    } catch {
      setAttachments([]);
      setAttachmentError(true);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  useEffect(() => {
    if (open && expense?.id && expense.attachments && expense.attachments.length > 0) {
      fetchAttachments();
    } else {
      setAttachments([]);
      setAttachmentError(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id, expense?.attachments]);

  if (!expense && !loading) return null;

  // --- Edit helpers ---
  const handleItemFieldAt = (index: number, field: keyof EditableItem, value: any) => {
    setEditItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };

      if (field === "expense_type_id") {
        const types = isTripExpense ? tripExpenseTypes : officeExpenseTypes;
        const selected = types.find((t) => t.id === value);
        if (selected) {
          updated.details = selected.name;
          updated.category = isTripExpense
            ? CATEGORY_MAPPING[(selected as TripExpenseType).category] || "Other"
            : "Office";
        }
      }

      if (field === "currency") {
        if (value === "USD" && currentExchangeRate) {
          updated.exchange_rate = currentExchangeRate;
        } else if (value === "TZS") {
          updated.exchange_rate = 1;
        }
      }

      next[index] = updated;
      return next;
    });
  };

  const handleAddRow = () => {
    const first = editItems[0];
    setEditItems((prev) => [
      ...prev,
      {
        expense_type_id: undefined,
        amount: 0,
        currency: first?.currency || "TZS",
        invoice_state: "With Invoice",
        details: "",
        exchange_rate: first?.currency === "USD" ? (first?.exchange_rate || 1) : 1,
        category: first?.category || "Other",
      },
    ]);
    setEditCount((c) => c + 1);
  };

  const handleDeleteRow = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Action Handlers ---
  const handleApprove = async () => {
    if (!expense) return;
    setProcessing(true);
    try {
      const body: Record<string, unknown> = {
        ids: [expense.id],
        status: "Pending Finance",
      };
      if (comment.trim()) body.comment = comment.trim();
      const response = await fetch("/api/v1/expenses/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (response.ok) {
        message.success("Expense approved");
        onClose();
        onActionComplete?.();
      } else {
        const err = await response.json();
        message.error(err.detail || "Failed to approve");
      }
    } catch {
      message.error("Network error");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectOrReturn = async (type: "reject" | "return") => {
    if (!expense) return;
    if (!comment.trim()) {
      message.warning("Please provide a reason");
      return;
    }
    setProcessing(true);
    try {
      const statusMap: Record<string, string> = {
        reject: "Rejected",
        return: "Returned",
      };
      const response = await fetch("/api/v1/expenses/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ids: [expense.id],
          status: statusMap[type],
          comment: comment.trim(),
        }),
      });
      if (response.ok) {
        message.success(`Expense ${type}ed`);
        onClose();
        onActionComplete?.();
      } else {
        const err = await response.json();
        message.error(err.detail || `Failed to ${type}`);
      }
    } catch {
      message.error("Network error");
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!expense) return;

    // If editable, save changes first then resubmit
    if (editable && editItems.length > 0) {
      for (const item of editItems) {
        if (!item.amount || item.amount <= 0) {
          message.error("Please enter a valid amount for all items");
          return;
        }
      }

      setProcessing(true);
      try {
        const types = isTripExpense ? tripExpenseTypes : officeExpenseTypes;
        const getItemName = (item: EditableItem) => {
          if (!item.expense_type_id) return undefined;
          return types.find((t) => t.id === item.expense_type_id)?.name;
        };

        const firstItem = editItems[0];
        const total = editItems.reduce((sum, it) => sum + (it.amount || 0), 0);

        const metadataItems = editItems.map((item) => ({
          expense_type_id: item.expense_type_id,
          item_name: getItemName(item),
          item_details: item.details,
          amount: item.amount,
          currency: item.currency,
          invoice_state: item.invoice_state,
          exchange_rate: item.exchange_rate,
          category: item.category,
        }));

        const bankDetails = editHeader?.payment_method === "Transfer" ? {
          bank_name: editHeader.bank_name,
          account_name: editHeader.account_name,
          account_no: editHeader.account_no,
        } : null;

        const updatePayload: any = {
          amount: total,
          description: editHeader?.remarks || firstItem.details,
          category: firstItem.category || expense.category,
          expense_metadata: {
            ...(expense.expense_metadata || {}),
            items: metadataItems,
            item_name: getItemName(firstItem),
            item_details: firstItem.details,
            invoice_state: firstItem.invoice_state,
            payment_method: editHeader?.payment_method,
            remarks: editHeader?.remarks,
            bank_details: bankDetails,
          },
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

        // Resubmit
        const resubmitResponse = await fetch(`/api/v1/expenses/${expense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: "Pending Manager" }),
        });

        if (resubmitResponse.ok) {
          message.success(
            editItems.length > 1
              ? `Expense updated with ${editItems.length} items and resubmitted for approval`
              : "Expense updated and resubmitted for approval"
          );
          onClose();
          onActionComplete?.();
        } else {
          const err = await resubmitResponse.json();
          message.error(err.detail || "Failed to resubmit");
        }
      } catch {
        message.error("Network error");
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Non-editable submit (just resubmit status)
    setProcessing(true);
    try {
      const body: Record<string, unknown> = {
        ids: [expense.id],
        status: "Pending Manager",
      };
      if (comment.trim()) body.comment = comment.trim();
      const response = await fetch("/api/v1/expenses/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (response.ok) {
        message.success("Expense resubmitted for approval");
        onClose();
        onActionComplete?.();
      } else {
        const err = await response.json();
        message.error(err.detail || "Failed to resubmit");
      }
    } catch {
      message.error("Network error");
    } finally {
      setProcessing(false);
    }
  };

  const handlePay = () => {
    // Legacy callback for backwards compat — prefer inline payment
    if (expense && onPay) onPay(expense);
  };

  const handleConfirmPayment = async (values: any) => {
    if (!expense) return;
    setProcessing(true);
    try {
      const response = await fetch(`/api/v1/expenses/${expense.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          method: values.method,
          reference: values.reference,
          bank_name: values.bank_name,
          account_name: values.account_name,
          account_no: values.account_no,
          payment_date: values.payment_date?.toISOString(),
        }),
      });
      if (response.ok) {
        message.success("Payment processed successfully");
        paymentForm.resetFields();
        onClose();
        onActionComplete?.();
      } else {
        const err = await response.json();
        message.error(err.detail || "Payment failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setProcessing(false);
    }
  };

  // --- Tab Content ---
  const meta = expense?.expense_metadata;
  const bankDetails = meta?.bank_details;
  const paymentMethodDisplay = meta?.payment_method || expense?.payment_method;

  // Editable total for footer
  const editTotal = editItems.reduce((sum, it) => sum + (it.amount || 0), 0);
  const displayAmount = editable && editItems.length > 0 ? editTotal : (expense?.amount ?? 0);
  const displayCurrency = editable && editItems.length > 0 ? (editItems[0]?.currency ?? "TZS") : (expense?.currency ?? "TZS");

  // AC-2: Expense approval pipeline Steps (from shared constants)
  const expenseStepIndex: Record<string, number> = {
    "Pending Manager": 1,
    "Pending Finance": 2,
    "Paid": 3,
    "Rejected": 1,
    "Returned": 1,
  };
  const currentExpenseStep = expenseStepIndex[expense?.status ?? ""] ?? 0;
  const isExpenseError = expense?.status === "Rejected" || expense?.status === "Returned";

  // Tab 1: Expense Details
  const ExpenseDetailsTab = expense ? (
    <>
      {/* AC-2: Approval pipeline indicator */}
      <Steps
        size="small"
        current={currentExpenseStep}
        status={isExpenseError ? "error" : "process"}
        style={{ marginBottom: 16 }}
        items={EXPENSE_STEPS.map((label, i) => ({
          title: label,
          status: isExpenseError && i === currentExpenseStep
            ? "error"
            : i < currentExpenseStep
              ? "finish"
              : i === currentExpenseStep
                ? "process"
                : "wait",
        }))}
      />

      {/* Return reason banner */}
      {isReturned && expense.manager_comment && (
        <Alert
          type="warning"
          title="Please address the following before resubmitting:"
          description={expense.manager_comment}
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Header Grid */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          background: "var(--color-surface)",
          borderRadius: 8,
        }}
      >
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">Company</Text>
            </div>
            <Input value={COMPANY_NAME} readOnly />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">Application Date</Text>
            </div>
            <Input
              value={formatDate(meta?.application_date || expense.created_at)}
              readOnly
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">Total Amount</Text>
            </div>
            <Input
              value={formatCurrency(displayAmount, displayCurrency)}
              readOnly
              style={{ fontWeight: 700 }}
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">Payment Method</Text>
            </div>
            {editable && editHeader ? (
              <Select
                style={{ width: "100%" }}
                value={editHeader.payment_method}
                onChange={(val) =>
                  setEditHeader((prev) => (prev ? { ...prev, payment_method: val } : prev))
                }
              >
                <Select.Option value="Cash">Cash</Select.Option>
                <Select.Option value="Transfer">Transfer</Select.Option>
              </Select>
            ) : (
              <Input value={paymentMethodDisplay || "-"} readOnly />
            )}
          </Col>
          <Col span={16}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">Remarks</Text>
            </div>
            {editable && editHeader ? (
              <Input
                value={editHeader.remarks}
                onChange={(e) =>
                  setEditHeader((prev) =>
                    prev ? { ...prev, remarks: e.target.value } : prev
                  )
                }
                placeholder="General remarks"
              />
            ) : (
              <Input value={meta?.remarks || expense.description || "-"} readOnly />
            )}
          </Col>
        </Row>

        {/* Bank Details */}
        {editable && editHeader?.payment_method === "Transfer" ? (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">Bank Name</Text>
              </div>
              <Input
                value={editHeader.bank_name}
                onChange={(e) =>
                  setEditHeader((prev) =>
                    prev ? { ...prev, bank_name: e.target.value } : prev
                  )
                }
                placeholder="Enter Bank Name"
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">Account Name</Text>
              </div>
              <Input
                value={editHeader.account_name}
                onChange={(e) =>
                  setEditHeader((prev) =>
                    prev ? { ...prev, account_name: e.target.value } : prev
                  )
                }
                placeholder="Enter Account Name"
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">Account No.</Text>
              </div>
              <Input
                value={editHeader.account_no}
                onChange={(e) =>
                  setEditHeader((prev) =>
                    prev ? { ...prev, account_no: e.target.value } : prev
                  )
                }
                placeholder="Enter Account Number"
              />
            </Col>
          </Row>
        ) : bankDetails ? (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">Bank Name</Text>
              </div>
              <Input value={bankDetails.bank_name || "-"} readOnly />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">Account Name</Text>
              </div>
              <Input value={bankDetails.account_name || "-"} readOnly />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">Account No.</Text>
              </div>
              <Input value={bankDetails.account_no || "-"} readOnly />
            </Col>
          </Row>
        ) : null}
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: 24 }}>
        {editable && editItems.length > 0 ? (
          <>
            <Space style={{ marginBottom: 8 }}>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddRow}>
                Add Item
              </Button>
            </Space>
            <Table
              dataSource={editItems.map((item, idx) => ({ key: idx, ...item }))}
              columns={[
                {
                  title: "No.",
                  key: "no",
                  width: 50,
                  align: "center" as const,
                  render: (_: any, __: any, idx: number) => idx + 1,
                },
                {
                  title: "Payment Item",
                  dataIndex: "expense_type_id",
                  key: "expense_type_id",
                  width: 250,
                  render: (val: string, _: any, idx: number) => (
                    <Select
                      showSearch
                      style={{ width: "100%" }}
                      placeholder="Select Item"
                      optionFilterProp="label"
                      value={val}
                      onChange={(v) => handleItemFieldAt(idx, "expense_type_id", v)}
                      options={groupedExpenseOptions as any}
                      loading={expenseTypesLoading}
                      allowClear
                    />
                  ),
                },
                {
                  title: "Amount",
                  dataIndex: "amount",
                  key: "amount",
                  width: 140,
                  render: (val: number, _: any, idx: number) => (
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      value={val}
                      onChange={(v) => handleItemFieldAt(idx, "amount", v)}
                      {...amountInputProps}
                    />
                  ),
                },
                {
                  title: "Currency",
                  dataIndex: "currency",
                  key: "currency",
                  width: 100,
                  render: (val: string, _: any, idx: number) => (
                    <Select
                      style={{ width: "100%" }}
                      value={val}
                      onChange={(v) => handleItemFieldAt(idx, "currency", v)}
                    >
                      <Select.Option value="TZS">TZS</Select.Option>
                      <Select.Option value="USD">USD</Select.Option>
                    </Select>
                  ),
                },
                {
                  title: "Invoice State",
                  dataIndex: "invoice_state",
                  key: "invoice_state",
                  width: 130,
                  render: (val: string, _: any, idx: number) => (
                    <Select
                      style={{ width: "100%" }}
                      value={val}
                      onChange={(v) => handleItemFieldAt(idx, "invoice_state", v)}
                    >
                      <Select.Option value="With Invoice">With Invoice</Select.Option>
                      <Select.Option value="Without Invoice">Without Invoice</Select.Option>
                    </Select>
                  ),
                },
                {
                  title: "Details",
                  dataIndex: "details",
                  key: "details",
                  render: (val: string, _: any, idx: number) => (
                    <Input
                      value={val}
                      onChange={(e) => handleItemFieldAt(idx, "details", e.target.value)}
                    />
                  ),
                },
                {
                  title: (
                    <Tooltip title={currentExchangeRate ? `Current rate: ${currentExchangeRate}` : "No rate set"}>
                      <span style={{ cursor: "help" }}>Ex. Rate</span>
                    </Tooltip>
                  ),
                  dataIndex: "exchange_rate",
                  key: "exchange_rate",
                  width: 100,
                  render: (val: number, record: any, idx: number) => (
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      value={val}
                      disabled={record.currency === "TZS"}
                      onChange={(v) => handleItemFieldAt(idx, "exchange_rate", v)}
                    />
                  ),
                },
                {
                  title: "",
                  key: "delete",
                  width: 50,
                  align: "center" as const,
                  render: (_: any, __: any, idx: number) => (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={editItems.length === 1}
                      onClick={() => handleDeleteRow(idx)}
                    />
                  ),
                },
              ]}
              pagination={false}
              size="middle"
              bordered
              scroll={{ x: 1050 }}
              footer={() => (
                <div style={{ textAlign: "right", fontWeight: 700, fontSize: 16 }}>
                  Total: {formatCurrency(editTotal, editItems[0]?.currency ?? "TZS")}
                </div>
              )}
            />
          </>
        ) : (
          <Table
            scroll={{ x: "max-content" }}
            dataSource={[
              {
                key: "1",
                item_name: meta?.item_name || expense.category,
                amount: expense.amount,
                currency: expense.currency,
                invoice_state: meta?.invoice_state || "-",
                details: meta?.item_details || expense.description || "-",
                exchange_rate: expense.exchange_rate,
              },
            ]}
            columns={[
              {
                title: "No.",
                key: "no",
                width: 60,
                align: "center" as const,
                render: () => 1,
              },
              {
                title: "Payment Item",
                dataIndex: "item_name",
                key: "item_name",
                width: 200,
              },
              {
                title: "Amount",
                dataIndex: "amount",
                key: "amount",
                width: 140,
                align: "right" as const,
                render: (val: number) => fmtAmount(val) || "-",
              },
              {
                title: "Currency",
                dataIndex: "currency",
                key: "currency",
                width: 80,
              },
              {
                title: "Invoice State",
                dataIndex: "invoice_state",
                key: "invoice_state",
                width: 130,
              },
              {
                title: "Details",
                dataIndex: "details",
                key: "details",
                ellipsis: true,
              },
              {
                title: "Ex. Rate",
                dataIndex: "exchange_rate",
                key: "exchange_rate",
                width: 100,
                render: (val: number | null) =>
                  val && val !== 1 ? fmtAmount(val) : "-",
              },
            ]}
            pagination={false}
            size="middle"
            bordered
            footer={() => (
              <div
                style={{
                  textAlign: "right",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                Total: {formatCurrency(expense.amount, expense.currency)}
              </div>
            )}
          />
        )}
      </div>

      {/* Trip Info (if linked) */}
      {expense.trip && (
        <Descriptions title="Trip Information" bordered column={2} size="small">
          <Descriptions.Item label="Trip Number">
            <Text strong>{expense.trip.trip_number}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Route">
            {expense.trip.route_name || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <StatusBadge status={expense.trip.status} />
          </Descriptions.Item>
          <Descriptions.Item label="Current Location">
            {expense.trip.current_location || "-"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </>
  ) : null;

  // Upload attachment handler for returned/edit mode (AC-3)
  const handleUploadAttachment = async (file: File) => {
    if (!expense?.id) return;
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/v1/expenses/${expense.id}/attachments`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (response.ok) {
        message.success("Attachment uploaded");
        fetchAttachments();
      } else {
        const err = await response.json();
        message.error(err.detail || "Failed to upload");
      }
    } catch {
      message.error("Upload failed");
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Tab 2: Attachments
  const AttachmentsTab = (
    <div style={{ padding: "16px 0" }}>
      {/* AC-3: Upload button when editable (returned state) */}
      {editable && (
        <div style={{ marginBottom: 12 }}>
          <Upload
            beforeUpload={(file) => {
              handleUploadAttachment(file);
              return false;
            }}
            showUploadList={false}
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
          >
            <Button icon={<PlusOutlined />} loading={uploadingAttachment}>
              Upload Attachment
            </Button>
          </Upload>
        </div>
      )}
      {attachmentsLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="default" />
        </div>
      ) : attachmentError ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Button onClick={fetchAttachments} icon={<UndoOutlined />}>
            Could not load attachments — Retry
          </Button>
        </div>
      ) : attachments.length === 0 ? (
        <Empty
          description={
            editable
              ? "No attachments uploaded. Add receipts or supporting documents above."
              : "No attachments uploaded."
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {attachments.map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "var(--color-surface)",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
              }}
            >
              <Space>
                {getFileIcon(item.filename)}
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", fontWeight: 500 }}
                  >
                    {item.filename}
                  </a>
                ) : (
                  <Text>{item.filename}</Text>
                )}
              </Space>
              {item.url && (
                <Button
                  type="text"
                  size="small"
                  icon={<DownloadOutlined />}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Tab 3: Tracking — dynamic approval pipeline (handles return→resubmit flow)
  const buildTrackingSteps = () => {
    if (!expense) return [];

    // Story 6.24 AC-1: Use explicit returned_at timestamp instead of heuristic
    const wasReturned = expense.status === "Pending Manager" && !!expense.returned_at;

    const submitted = {
      title: "Submitted",
      status: "finish" as const,
      description: expense.created_by ? (
        <Text type="secondary">
          {expense.created_by.full_name || expense.created_by.username} · {formatDate(expense.created_at)}
        </Text>
      ) : undefined,
    };

    if (wasReturned) {
      // Show the return event that happened between submissions
      return [
        submitted,
        {
          title: "Returned for Revision",
          status: "error" as const,
          description: (
            <Text italic style={{ fontSize: "var(--font-sm)" }}>&quot;{expense.manager_comment}&quot;</Text>
          ),
        },
        {
          title: "Resubmitted",
          status: "process" as const,
          description: <Text type="secondary">Awaiting manager review</Text>,
        },
        { title: "Finance Payment", status: "wait" as const },
      ];
    }

    if (expense.status === "Pending Manager") {
      return [
        submitted,
        {
          title: "Manager Review",
          status: "process" as const,
          description: <Text type="secondary">Awaiting manager review</Text>,
        },
        { title: "Finance Payment", status: "wait" as const },
      ];
    }

    if (expense.status === "Rejected") {
      return [
        submitted,
        {
          title: "Rejected",
          status: "error" as const,
          description: expense.approved_by ? (
            <Space direction="vertical" size={0}>
              <Text type="secondary">
                {expense.approved_by.full_name || expense.approved_by.username} · {formatDate(expense.approved_at)}
              </Text>
              {expense.manager_comment && (
                <Text italic style={{ fontSize: "var(--font-sm)" }}>&quot;{expense.manager_comment}&quot;</Text>
              )}
            </Space>
          ) : undefined,
        },
      ];
    }

    if (expense.status === "Returned") {
      return [
        submitted,
        {
          title: "Returned for Revision",
          status: "error" as const,
          description: expense.approved_by ? (
            <Space direction="vertical" size={0}>
              <Text type="secondary">
                {expense.approved_by.full_name || expense.approved_by.username} · {formatDate(expense.approved_at)}
              </Text>
              {expense.manager_comment && (
                <Text italic style={{ fontSize: "var(--font-sm)" }}>&quot;{expense.manager_comment}&quot;</Text>
              )}
            </Space>
          ) : undefined,
        },
      ];
    }

    if (expense.status === "Voided") {
      // Manager approved first, then it was voided at Finance stage
      const managerApprovedClean = {
        title: "Manager Approved",
        status: "finish" as const,
        description: expense.approved_by ? (
          <Text type="secondary">
            {expense.approved_by.full_name || expense.approved_by.username} · {formatDate(expense.approved_at)}
          </Text>
        ) : undefined,
      };
      return [
        submitted,
        managerApprovedClean,
        {
          title: "Voided",
          status: "error" as const,
          description: (
            <Space direction="vertical" size={0}>
              {expense.voided_by && (
                <Text type="secondary">
                  {expense.voided_by.full_name || expense.voided_by.username} · {formatDate(expense.voided_at)}
                </Text>
              )}
              {expense.void_reason && (
                <Text italic style={{ fontSize: "var(--font-sm)" }}>&quot;{expense.void_reason}&quot;</Text>
              )}
            </Space>
          ),
        },
      ];
    }

    // Pending Finance or Paid
    const managerApproved = {
      title: "Manager Approved",
      status: "finish" as const,
      description: expense.approved_by ? (
        <Space direction="vertical" size={0}>
          <Text type="secondary">
            {expense.approved_by.full_name || expense.approved_by.username} · {formatDate(expense.approved_at)}
          </Text>
          {expense.manager_comment && (
            <Text italic style={{ fontSize: "var(--font-sm)" }}>&quot;{expense.manager_comment}&quot;</Text>
          )}
        </Space>
      ) : undefined,
    };

    const financeStep = {
      title: "Finance Payment",
      status: expense.status === "Paid" ? ("finish" as const) : ("process" as const),
      description:
        expense.status === "Paid" && expense.paid_by ? (
          <Text type="secondary">
            {expense.paid_by.full_name || expense.paid_by.username} · {formatDate(expense.payment_date)}
            {expense.payment_method && ` · ${expense.payment_method}`}
            {expense.payment_reference && ` (${expense.payment_reference})`}
          </Text>
        ) : expense.status === "Pending Finance" ? (
          <Text type="secondary">Awaiting finance payment</Text>
        ) : undefined,
    };

    return [submitted, managerApproved, financeStep];
  };

  const HistoryTab = (
    <div style={{ padding: "16px 0" }}>
      <Steps
        direction="vertical"
        size="small"
        current={-1}
        items={buildTrackingSteps()}
      />
    </div>
  );

  // --- Action panel ---
  const hasActions = actions.length > 0;
  const showApprove = actions.includes("approve");
  const showReject = actions.includes("reject");
  const showReturn = actions.includes("return");
  const showPay = actions.includes("pay");
  const showSubmit = actions.includes("submit");
  const commentRequired = showReject || showReturn;

  return (
    <Modal
      title={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingRight: 24,
          }}
        >
          <Space>
            <SearchOutlined />
            <span>
              Expense Review —{" "}
              {expense?.expense_number ||
                expense?.id?.slice(0, 8).toUpperCase() ||
                "..."}
            </span>
          </Space>
          {expense && <ExpenseStatusBadge status={expense.status} />}
        </div>
      }
      open={open}
      onCancel={onClose}
      width={1200}
      style={{ top: 20 }}
      styles={{
        body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto" },
      }}
      footer={null}
      forceRender
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : expense ? (
        <>
          <Tabs
            defaultActiveKey="details"
            items={[
              {
                key: "details",
                label: "Expense Details",
                children: ExpenseDetailsTab,
              },
              {
                key: "attachments",
                label: `Attachments${expense.attachments?.length ? ` (${expense.attachments.length})` : ""}`,
                children: AttachmentsTab,
              },
              {
                key: "tracking",
                label: "Tracking",
                children: HistoryTab,
              },
            ]}
          />

          {/* Inline Payment Form — shown when finance has "pay" action */}
          <Form
            form={paymentForm}
            layout="vertical"
            onFinish={handleConfirmPayment}
            style={{ display: showPay ? "block" : "none" }}
          >
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: "var(--color-surface)",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
              }}
            >
                <Text strong style={{ display: "block", marginBottom: 12 }}>
                  Payment Details
                </Text>
                <Row gutter={[16, 12]}>
                  <Col xs={24} sm={6}>
                    <Form.Item
                      label="Payment Method"
                      name="method"
                      rules={[{ required: true, message: "Required" }]}
                      initialValue={
                        meta?.payment_method?.toUpperCase() === "TRANSFER"
                          ? "TRANSFER"
                          : "CASH"
                      }
                      style={{ marginBottom: 0 }}
                    >
                      <Select>
                        <Select.Option value="CASH">Cash</Select.Option>
                        <Select.Option value="TRANSFER">Transfer</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={6}>
                    <Form.Item
                      label="Payment Date"
                      name="payment_date"
                      initialValue={dayjs()}
                      style={{ marginBottom: 0 }}
                    >
                      <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={
                        paymentMethodValue === "TRANSFER"
                          ? "Reference Number"
                          : "Remarks (Optional)"
                      }
                      name="reference"
                      rules={[
                        {
                          required: paymentMethodValue === "TRANSFER",
                          message: "Reference required for transfers",
                        },
                      ]}
                      style={{ marginBottom: 0 }}
                    >
                      <Input
                        placeholder={
                          paymentMethodValue === "TRANSFER"
                            ? "e.g. Bank Ref / Transaction ID"
                            : "Optional notes"
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      label="Bank Name"
                      name="bank_name"
                      initialValue={bankDetails?.bank_name}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="Bank Name" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      label="Account Name"
                      name="account_name"
                      initialValue={bankDetails?.account_name}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="Account Name" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      label="Account No."
                      name="account_no"
                      initialValue={bankDetails?.account_no}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="Account Number" />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Comment for return */}
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary">
                    Comment (required for return)
                  </Text>
                  <TextArea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    style={{ marginTop: 4 }}
                  />
                </div>

                {/* Action Buttons — centered */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: 16,
                    gap: 12,
                  }}
                >
                  {showReturn && (
                    <Button
                      icon={<UndoOutlined />}
                      onClick={() => handleRejectOrReturn("return")}
                      loading={processing}
                      style={{ color: "var(--color-orange)", borderColor: "var(--color-orange)" }}
                    >
                      Return
                    </Button>
                  )}
                  <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    loading={processing}
                    onClick={paymentForm.submit}
                    size="large"
                  >
                    Confirm Payment
                  </Button>
                </div>
              </div>
            </Form>

          {/* Standard action panel — for non-payment actions (approve, reject, return, submit) */}
          {hasActions && !showPay && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: "var(--color-surface)",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
              }}
            >
              {/* Comment TextArea — hide for editable (returned) since banner covers it */}
              {!editable && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary">
                    Comment{" "}
                    {commentRequired
                      ? "(required for reject/return)"
                      : "(optional)"}
                  </Text>
                  <TextArea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    style={{ marginTop: 4 }}
                  />
                </div>
              )}

              {/* Action Buttons — centered */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Space size="middle">
                  {showApprove && (
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={handleApprove}
                      loading={processing}
                      style={{
                        background: "var(--color-green)",
                        borderColor: "var(--color-green)",
                      }}
                    >
                      Approve
                    </Button>
                  )}
                  {showReject && (
                    <Button
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => handleRejectOrReturn("reject")}
                      loading={processing}
                    >
                      Reject
                    </Button>
                  )}
                  {showReturn && (
                    <Button
                      icon={<UndoOutlined />}
                      onClick={() => handleRejectOrReturn("return")}
                      loading={processing}
                      style={{ color: "var(--color-orange)", borderColor: "var(--color-orange)" }}
                    >
                      Return
                    </Button>
                  )}
                  {showSubmit && (
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSubmit}
                      loading={processing}
                      style={{
                        background: "var(--color-green)",
                        borderColor: "var(--color-green)",
                      }}
                    >
                      Submit
                    </Button>
                  )}
                </Space>
              </div>
            </div>
          )}
        </>
      ) : null}
    </Modal>
  );
}
