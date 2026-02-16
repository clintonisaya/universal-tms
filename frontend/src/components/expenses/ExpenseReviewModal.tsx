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
  Tag,
  Space,
  Button,
  Typography,
  Table,
  Timeline,
  Spin,
  Empty,
  App,
  Alert,
  Descriptions,
  Tooltip,
} from "antd";
import { amountInputProps, fmtAmount, fmtCurrency } from "@/lib/utils";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  UndoOutlined,
  DollarOutlined,
  SendOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  BankOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileUnknownOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ExpenseRequestDetailed, ExpenseCategory } from "@/types/expense";
import type { TripExpenseType } from "@/types/trip-expense-type";
import type { OfficeExpenseType } from "@/types/office-expense-type";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";

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
  onPay?: (expense: ExpenseRequestDetailed) => void;
  loading?: boolean;
}

// Map Trip Expense Type categories to ExpenseCategory
const CATEGORY_MAPPING: Record<string, ExpenseCategory> = {
  Fuel: "Fuel",
  "Driver Allowance": "Allowance",
  "Cargo Charges": "Border",
  "Transportation Costs-Others": "Other",
  "Toll Gates": "Border",
  "Road Toll": "Border",
  "Port Fee": "Border",
  "Parking Fee": "Other",
  Council: "Border",
  Bond: "Border",
  "Agency Fee": "Border",
  "CNPR Tax": "Border",
  Bonus: "Allowance",
  "Border Expenses": "Border",
  Miscellaneous: "Other",
};

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
    return <FilePdfOutlined style={{ color: "#ff4d4f", fontSize: 18 }} />;
  if (lower.match(/\.(jpe?g|png|gif|webp)$/))
    return <FileImageOutlined style={{ color: "#1890ff", fontSize: 18 }} />;
  if (lower.match(/\.(docx?)$/))
    return <FileWordOutlined style={{ color: "#2f54eb", fontSize: 18 }} />;
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

  // Editable state for returned expenses
  const [editItem, setEditItem] = useState<EditableItem | null>(null);
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
    }
  }, [open, expense?.id]);

  // Initialize editable state from expense data
  useEffect(() => {
    if (open && expense && editable) {
      const meta = expense.expense_metadata || {};
      setEditItem({
        expense_type_id: undefined, // will be matched after types load
        amount: Number(expense.amount) || 0,
        currency: expense.currency || "TZS",
        invoice_state: meta.invoice_state || "With Invoice",
        details: meta.item_details || expense.description || "",
        exchange_rate: Number(expense.exchange_rate) || 1,
        category: expense.category,
      });
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

  // Match expense type by name after types load
  useEffect(() => {
    if (!expense || !editItem || editItem.expense_type_id) return;
    const meta = expense.expense_metadata || {};
    const itemName = meta.item_name || meta.item_details || expense.description;
    if (!itemName) return;

    const types = isTripExpense ? tripExpenseTypes : officeExpenseTypes;
    const match = types.find(
      (t) => t.name.toLowerCase() === itemName.toLowerCase()
    );
    if (match) {
      setEditItem((prev) => (prev ? { ...prev, expense_type_id: match.id } : prev));
    }
  }, [tripExpenseTypes, officeExpenseTypes, expense, editItem?.expense_type_id, isTripExpense]);

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

  // Fetch attachments
  useEffect(() => {
    if (open && expense?.id && expense.attachments && expense.attachments.length > 0) {
      const fetchAttachments = async () => {
        setAttachmentsLoading(true);
        try {
          const response = await fetch(
            `/api/v1/expenses/${expense.id}/attachments`,
            { credentials: "include" }
          );
          if (response.ok) {
            setAttachments(await response.json());
          } else {
            setAttachments([]);
          }
        } catch {
          setAttachments([]);
        } finally {
          setAttachmentsLoading(false);
        }
      };
      fetchAttachments();
    } else {
      setAttachments([]);
    }
  }, [open, expense?.id, expense?.attachments]);

  if (!expense && !loading) return null;

  // --- Edit helpers ---
  const handleItemField = (field: keyof EditableItem, value: any) => {
    setEditItem((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };

      if (field === "expense_type_id") {
        const types = isTripExpense ? tripExpenseTypes : officeExpenseTypes;
        const selected = types.find((t) => t.id === value);
        if (selected) {
          updated.details = selected.name;
          if (isTripExpense) {
            updated.category =
              CATEGORY_MAPPING[(selected as TripExpenseType).category] || "Other";
          } else {
            updated.category = "Office";
          }
        }
      }

      if (field === "currency") {
        if (value === "USD" && currentExchangeRate) {
          updated.exchange_rate = currentExchangeRate;
        } else if (value === "TZS") {
          updated.exchange_rate = 1;
        }
      }

      return updated;
    });
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
    if (editable && editItem) {
      if (!editItem.amount || editItem.amount <= 0) {
        message.error("Please enter a valid amount");
        return;
      }

      setProcessing(true);
      try {
        // Get expense type name for metadata
        let itemName: string | undefined;
        if (editItem.expense_type_id) {
          const types = isTripExpense ? tripExpenseTypes : officeExpenseTypes;
          const selected = types.find((t) => t.id === editItem.expense_type_id);
          itemName = selected?.name;
        }

        // Update expense
        const updatePayload: any = {
          amount: editItem.amount,
          description: editHeader?.remarks || editItem.details,
          category: editItem.category || expense.category,
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
          message.success("Expense updated and resubmitted for approval");
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
    if (expense && onPay) onPay(expense);
  };

  // --- Tab Content ---
  const meta = expense?.expense_metadata;
  const bankDetails = meta?.bank_details;
  const paymentMethodDisplay = meta?.payment_method || expense?.payment_method;

  // Editable total for footer
  const displayAmount = editable && editItem ? editItem.amount : (expense?.amount ?? 0);
  const displayCurrency = editable && editItem ? editItem.currency : (expense?.currency ?? "TZS");

  // Tab 1: Expense Details
  const ExpenseDetailsTab = expense ? (
    <>
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
          background: "#f5f5f5",
          borderRadius: 8,
        }}
      >
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Company</Text>
            </div>
            <Input value="EDUPO COMPANY LIMITED" readOnly />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Application Date</Text>
            </div>
            <Input
              value={formatDate(meta?.application_date || expense.created_at)}
              readOnly
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Total Amount</Text>
            </div>
            <Input
              value={formatCurrency(displayAmount, displayCurrency)}
              readOnly
              style={{ fontWeight: "bold" }}
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Payment Method</Text>
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
              <Text type="secondary" style={{ fontSize: 12 }}>Remarks</Text>
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
                <Text type="secondary" style={{ fontSize: 12 }}>Bank Name</Text>
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
                <Text type="secondary" style={{ fontSize: 12 }}>Account Name</Text>
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
                <Text type="secondary" style={{ fontSize: 12 }}>Account No.</Text>
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
                <Text type="secondary" style={{ fontSize: 12 }}>Bank Name</Text>
              </div>
              <Input value={bankDetails.bank_name || "-"} readOnly />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Account Name</Text>
              </div>
              <Input value={bankDetails.account_name || "-"} readOnly />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Account No.</Text>
              </div>
              <Input value={bankDetails.account_no || "-"} readOnly />
            </Col>
          </Row>
        ) : null}
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: 24 }}>
        {editable && editItem ? (
          <Table
            dataSource={[{ key: "1", ...editItem }]}
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
                dataIndex: "expense_type_id",
                key: "expense_type_id",
                width: 250,
                render: (val: string) => (
                  <Select
                    showSearch
                    style={{ width: "100%" }}
                    placeholder="Select Item"
                    optionFilterProp="label"
                    value={val}
                    onChange={(v) => handleItemField("expense_type_id", v)}
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
                render: (val: number) => (
                  // in columns:
<InputNumber
  style={{ width: "100%" }}
  min={0}
  value={val}
  onChange={(v) => handleItemField("amount", v)}
  {...amountInputProps}
/>
                ),
              },
              {
                title: "Currency",
                dataIndex: "currency",
                key: "currency",
                width: 100,
                render: (val: string) => (
                  <Select
                    style={{ width: "100%" }}
                    value={val}
                    onChange={(v) => handleItemField("currency", v)}
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
                render: (val: string) => (
                  <Select
                    style={{ width: "100%" }}
                    value={val}
                    onChange={(v) => handleItemField("invoice_state", v)}
                  >
                    <Select.Option value="With Invoice">
                      With Invoice
                    </Select.Option>
                    <Select.Option value="Without Invoice">
                      Without Invoice
                    </Select.Option>
                  </Select>
                ),
              },
              {
                title: "Details",
                dataIndex: "details",
                key: "details",
                render: (val: string) => (
                  <Input
                    value={val}
                    onChange={(e) =>
                      handleItemField("details", e.target.value)
                    }
                  />
                ),
              },
              {
                title: (
                  <Tooltip
                    title={
                      currentExchangeRate
                        ? `Current rate: ${currentExchangeRate}`
                        : "No rate set"
                    }
                  >
                    <span style={{ cursor: "help" }}>Ex. Rate</span>
                  </Tooltip>
                ),
                dataIndex: "exchange_rate",
                key: "exchange_rate",
                width: 100,
                render: (val: number) => (
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    value={val}
                    disabled={editItem.currency === "TZS"}
                    onChange={(v) => handleItemField("exchange_rate", v)}
                  />
                ),
              },
            ]}
            pagination={false}
            size="middle"
            bordered
            scroll={{ x: 1000 }}
            footer={() => (
              <div
                style={{
                  textAlign: "right",
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                Total: {formatCurrency(editItem.amount, editItem.currency)}
              </div>
            )}
          />
        ) : (
          <Table
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
                  fontWeight: "bold",
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
            <Tag>{expense.trip.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Current Location">
            {expense.trip.current_location || "-"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </>
  ) : null;

  // Tab 2: Attachments
  const AttachmentsTab = (
    <div style={{ padding: "16px 0" }}>
      {attachmentsLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="default" />
        </div>
      ) : attachments.length === 0 ? (
        <Empty description="No attachments" />
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
                background: "#fafafa",
                borderRadius: 6,
                border: "1px solid #f0f0f0",
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

  // Tab 3: History/Timeline
  const getTimelineItems = () => {
    if (!expense) return [];
    const items = [];

    items.push({
      color: "green" as const,
      dot: <FileTextOutlined />,
      content: (
        <div>
          <Text strong>Application Submitted</Text>
          <br />
          <Text type="secondary">
            {formatDate(expense.created_at)}
            {expense.created_by &&
              ` by ${expense.created_by.full_name || expense.created_by.username}`}
          </Text>
        </div>
      ),
    });

    if (expense.approved_at && expense.approved_by) {
      items.push({
        color: "green" as const,
        dot: <CheckCircleOutlined />,
        content: (
          <div>
            <Text strong>Manager Approved</Text>
            <br />
            <Text type="secondary">
              {formatDate(expense.approved_at)} by{" "}
              {expense.approved_by.full_name || expense.approved_by.username}
            </Text>
            {expense.manager_comment && (
              <>
                <br />
                <Text italic>&quot;{expense.manager_comment}&quot;</Text>
              </>
            )}
          </div>
        ),
      });
    } else if (expense.status === "Rejected") {
      items.push({
        color: "red" as const,
        dot: <CloseCircleOutlined />,
        content: (
          <div>
            <Text strong>Manager Rejected</Text>
            {expense.manager_comment && (
              <>
                <br />
                <Text italic>&quot;{expense.manager_comment}&quot;</Text>
              </>
            )}
          </div>
        ),
      });
    } else if (expense.status === "Returned") {
      items.push({
        color: "orange" as const,
        dot: <ClockCircleOutlined />,
        content: (
          <div>
            <Text strong>Returned for Revision</Text>
          </div>
        ),
      });
    } else if (expense.status === "Pending Manager") {
      items.push({
        color: "blue" as const,
        dot: <ClockCircleOutlined />,
        content: (
          <div>
            <Text strong>Awaiting Manager Approval</Text>
          </div>
        ),
      });
    }

    if (expense.status === "Paid" && expense.payment_date) {
      items.push({
        color: "green" as const,
        dot: <BankOutlined />,
        content: (
          <div>
            <Text strong>Payment Processed</Text>
            <br />
            <Text type="secondary">
              {formatDate(expense.payment_date)}
              {expense.paid_by &&
                ` by ${expense.paid_by.full_name || expense.paid_by.username}`}
            </Text>
            <br />
            <Text>
              Method: {expense.payment_method || "N/A"}
              {expense.payment_reference &&
                ` | Ref: ${expense.payment_reference}`}
            </Text>
          </div>
        ),
      });
    } else if (expense.status === "Pending Finance") {
      items.push({
        color: "blue" as const,
        dot: <ClockCircleOutlined />,
        content: (
          <div>
            <Text strong>Awaiting Finance Payment</Text>
          </div>
        ),
      });
    }

    return items;
  };

  const HistoryTab = (
    <div style={{ padding: "16px 0" }}>
      <Timeline items={getTimelineItems()} />
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
      destroyOnHidden
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

          {hasActions && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                background: "#fafafa",
                borderRadius: 8,
                border: "1px solid #f0f0f0",
              }}
            >
              {/* Comment TextArea — hide for editable (returned) since banner covers it */}
              {!editable && (
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
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
                        background: "#52c41a",
                        borderColor: "#52c41a",
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
                      style={{ color: "#fa8c16", borderColor: "#fa8c16" }}
                    >
                      Return
                    </Button>
                  )}
                  {showPay && (
                    <Button
                      type="primary"
                      icon={<DollarOutlined />}
                      onClick={handlePay}
                    >
                      Pay
                    </Button>
                  )}
                  {showSubmit && (
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSubmit}
                      loading={processing}
                      style={{
                        background: "#52c41a",
                        borderColor: "#52c41a",
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
