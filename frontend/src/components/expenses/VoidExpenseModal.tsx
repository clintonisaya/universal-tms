"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Tabs,
  Row,
  Col,
  Input,
  Space,
  Button,
  Typography,
  Table,
  Spin,
  Empty,
  Descriptions,
  Steps,
  message,
} from "antd";
import {
  StopOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileUnknownOutlined,
} from "@ant-design/icons";
import { fmtAmount, fmtCurrency } from "@/lib/utils";
import type { ExpenseRequestDetailed } from "@/types/expense";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { COMPANY_NAME } from "@/constants/expenseConstants";

const { Text } = Typography;
const { TextArea } = Input;

interface AttachmentInfo {
  key: string;
  filename: string;
  url: string | null;
}

function getFileIcon(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return <FilePdfOutlined style={{ color: "var(--color-red)", fontSize: 18 }} />;
  if (lower.match(/\.(jpe?g|png|gif|webp)$/)) return <FileImageOutlined style={{ color: "var(--color-blue)", fontSize: 18 }} />;
  if (lower.match(/\.(docx?)$/)) return <FileWordOutlined style={{ color: "var(--color-blue)", fontSize: 18 }} />;
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

interface VoidExpenseModalProps {
  expense: ExpenseRequestDetailed | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VoidExpenseModal({ expense, open, onClose, onSuccess }: VoidExpenseModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  useEffect(() => {
    if (open && expense?.id && expense.attachments && expense.attachments.length > 0) {
      setAttachmentsLoading(true);
      fetch(`/api/v1/expenses/${expense.id}/attachments`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then(setAttachments)
        .catch(() => setAttachments([]))
        .finally(() => setAttachmentsLoading(false));
    } else {
      setAttachments([]);
    }
  }, [open, expense?.id, expense?.attachments]);

  const handleVoid = async () => {
    if (!expense) return;
    if (reason.trim().length < 3) {
      message.warning("Please provide a reason (minimum 3 characters)");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/expenses/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [expense.id], status: "Voided", comment: reason.trim() }),
      });
      if (response.ok) {
        message.success("Expense voided");
        setReason("");
        onSuccess();
      } else {
        const err = await response.json();
        message.error(err.detail || "Failed to void expense");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  if (!expense) return null;

  const meta = expense.expense_metadata;
  const bankDetails = meta?.bank_details;
  const paymentMethodDisplay = meta?.payment_method || expense.payment_method;

  // Progress steps — same mapping as ExpenseReviewModal
  const EXPENSE_STEPS = ["Submitted", "Manager Review", "Finance Payment", "Paid"];
  const expenseStepIndex: Record<string, number> = {
    "Pending Manager": 1,
    "Pending Finance": 2,
    Paid: 3,
    Rejected: 1,
    Returned: 1,
    Voided: 1,
  };
  const currentExpenseStep = expenseStepIndex[expense.status] ?? 0;
  const isExpenseError =
    expense.status === "Rejected" || expense.status === "Returned" || expense.status === "Voided";

  // Tab 1: Expense Details (read-only, same layout as ExpenseReviewModal)
  const ExpenseDetailsTab = (
    <>
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

      {/* Header Grid */}
      <div style={{ marginBottom: 24, padding: 16, background: "var(--color-surface)", borderRadius: 8 }}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Company</Text>
            </div>
            <Input value={COMPANY_NAME} readOnly />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Application Date</Text>
            </div>
            <Input value={formatDate(meta?.application_date || expense.created_at)} readOnly />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Total Amount</Text>
            </div>
            <Input
              value={fmtCurrency(expense.amount, expense.currency)}
              readOnly
              style={{ fontWeight: "bold" }}
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Payment Method</Text>
            </div>
            <Input value={paymentMethodDisplay || "-"} readOnly />
          </Col>
          <Col span={16}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Remarks</Text>
            </div>
            <Input value={meta?.remarks || expense.description || "-"} readOnly />
          </Col>
        </Row>

        {bankDetails && (
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
        )}
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: 24 }}>
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
            { title: "No.", key: "no", width: 60, align: "center" as const, render: () => 1 },
            { title: "Payment Item", dataIndex: "item_name", key: "item_name", width: 200 },
            {
              title: "Amount",
              dataIndex: "amount",
              key: "amount",
              width: 140,
              align: "right" as const,
              render: (val: number) => fmtAmount(val) || "-",
            },
            { title: "Currency", dataIndex: "currency", key: "currency", width: 80 },
            { title: "Invoice State", dataIndex: "invoice_state", key: "invoice_state", width: 130 },
            { title: "Details", dataIndex: "details", key: "details", ellipsis: true },
            {
              title: "Ex. Rate",
              dataIndex: "exchange_rate",
              key: "exchange_rate",
              width: 100,
              render: (val: number | null) => (val && val !== 1 ? fmtAmount(val) : "-"),
            },
          ]}
          pagination={false}
          size="middle"
          bordered
          footer={() => (
            <div style={{ textAlign: "right", fontWeight: "bold", fontSize: 16 }}>
              Total: {fmtCurrency(expense.amount, expense.currency)}
            </div>
          )}
        />
      </div>

      {/* Trip Info */}
      {expense.trip && (
        <Descriptions title="Trip Information" bordered column={2} size="small">
          <Descriptions.Item label="Trip Number">
            <Text strong>{expense.trip.trip_number}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Route">{expense.trip.route_name || "-"}</Descriptions.Item>
          <Descriptions.Item label="Status"><StatusBadge status={expense.trip.status} /></Descriptions.Item>
          <Descriptions.Item label="Current Location">{expense.trip.current_location || "-"}</Descriptions.Item>
        </Descriptions>
      )}
    </>
  );

  // Tab 2: Attachments — identical to ExpenseReviewModal AttachmentsTab
  const AttachmentsTab = (
    <div style={{ padding: "16px 0" }}>
      {attachmentsLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Spin size="default" /></div>
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
                background: "var(--color-surface)",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
              }}
            >
              <Space>
                {getFileIcon(item.filename)}
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", fontWeight: 500 }}>
                    {item.filename}
                  </a>
                ) : (
                  <Text>{item.filename}</Text>
                )}
              </Space>
              {item.url && (
                <Button type="text" size="small" icon={<DownloadOutlined />} href={item.url} target="_blank" rel="noopener noreferrer" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Tab 3: Tracking — identical steps logic to ExpenseReviewModal
  const buildTrackingSteps = () => {
    const wasReturned = expense.status === "Pending Manager" && !!expense.manager_comment;

    const submitted = {
      title: "Submitted",
      status: "finish" as const,
      description: expense.created_by ? (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {expense.created_by.full_name || expense.created_by.username} · {formatDate(expense.created_at)}
        </Text>
      ) : undefined,
    };

    if (expense.status === "Voided") {
      return [
        submitted,
        {
          title: "Manager Approved",
          status: "finish" as const,
          description: expense.approved_by ? (
            <Space direction="vertical" size={0}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {expense.approved_by.full_name || expense.approved_by.username} · {formatDate(expense.approved_at)}
              </Text>
              {expense.manager_comment && (
                <Text italic style={{ fontSize: 12 }}>"{expense.manager_comment}"</Text>
              )}
            </Space>
          ) : undefined,
        },
        {
          title: "Voided",
          status: "error" as const,
          description: (
            <Space direction="vertical" size={0}>
              {expense.voided_by && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {expense.voided_by.full_name || expense.voided_by.username} · {formatDate(expense.voided_at)}
                </Text>
              )}
              {expense.void_reason && (
                <Text italic style={{ fontSize: 12 }}>"{expense.void_reason}"</Text>
              )}
            </Space>
          ),
        },
      ];
    }

    if (wasReturned) {
      return [
        submitted,
        {
          title: "Returned for Revision",
          status: "error" as const,
          description: <Text italic style={{ fontSize: 12 }}>"{expense.manager_comment}"</Text>,
        },
        {
          title: "Resubmitted",
          status: "process" as const,
          description: <Text type="secondary" style={{ fontSize: 12 }}>Awaiting manager review</Text>,
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
          description: <Text type="secondary" style={{ fontSize: 12 }}>Awaiting manager review</Text>,
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
              <Text type="secondary" style={{ fontSize: 12 }}>
                {expense.approved_by.full_name || expense.approved_by.username} · {formatDate(expense.approved_at)}
              </Text>
              {expense.manager_comment && (
                <Text italic style={{ fontSize: 12 }}>"{expense.manager_comment}"</Text>
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
              <Text type="secondary" style={{ fontSize: 12 }}>
                {expense.approved_by.full_name || expense.approved_by.username} · {formatDate(expense.approved_at)}
              </Text>
              {expense.manager_comment && (
                <Text italic style={{ fontSize: 12 }}>"{expense.manager_comment}"</Text>
              )}
            </Space>
          ) : undefined,
        },
      ];
    }

    // Pending Finance or Paid
    const managerApproved = {
      title: "Manager Approved",
      status: "finish" as const,
      description: expense.approved_by ? (
        <Space direction="vertical" size={0}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {expense.approved_by.full_name || expense.approved_by.username} · {formatDate(expense.approved_at)}
          </Text>
          {expense.manager_comment && (
            <Text italic style={{ fontSize: 12 }}>"{expense.manager_comment}"</Text>
          )}
        </Space>
      ) : undefined,
    };

    const financeStep = {
      title: "Finance Payment",
      status: expense.status === "Paid" ? ("finish" as const) : ("process" as const),
      description:
        expense.status === "Paid" && expense.paid_by ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {expense.paid_by.full_name || expense.paid_by.username} · {formatDate(expense.payment_date)}
            {expense.payment_method && ` · ${expense.payment_method}`}
            {expense.payment_reference && ` (${expense.payment_reference})`}
          </Text>
        ) : expense.status === "Pending Finance" ? (
          <Text type="secondary" style={{ fontSize: 12 }}>Awaiting finance payment</Text>
        ) : undefined,
    };

    return [submitted, managerApproved, financeStep];
  };

  const HistoryTab = (
    <div style={{ padding: "16px 0" }}>
      <Steps direction="vertical" size="small" current={-1} items={buildTrackingSteps()} />
    </div>
  );

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 24 }}>
          <Space>
            <StopOutlined style={{ color: "var(--color-red)" }} />
            <span>Void Expense — {expense.expense_number || expense.id.slice(0, 8).toUpperCase()}</span>
          </Space>
          <ExpenseStatusBadge status={expense.status} />
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={1200}
      style={{ top: 20 }}
      styles={{ body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto" } }}
      footer={null}
      destroyOnHidden
    >
      <Tabs
        defaultActiveKey="details"
        items={[
          { key: "details", label: "Expense Details", children: ExpenseDetailsTab },
          {
            key: "attachments",
            label: `Attachments${expense.attachments?.length ? ` (${expense.attachments.length})` : ""}`,
            children: AttachmentsTab,
          },
          { key: "tracking", label: "Tracking", children: HistoryTab },
        ]}
      />

      {/* Void reason + action — same style as ExpenseReviewModal action panel */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          background: "var(--color-surface)",
          borderRadius: 8,
          border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Void reason (required — minimum 3 characters)
          </Text>
          <TextArea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Add a void reason..."
            maxLength={500}
            showCount
            style={{ marginTop: 4 }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Button
            danger
            type="primary"
            icon={<StopOutlined />}
            loading={submitting}
            disabled={reason.trim().length < 3}
            onClick={handleVoid}
          >
            Confirm Void
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default VoidExpenseModal;
