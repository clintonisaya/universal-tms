"use client";

import { useState, useEffect } from "react";
import { Modal, Descriptions, Tag, Space, Divider, Typography, Timeline, List, Spin, Empty, Button } from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BankOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileUnknownOutlined,
} from "@ant-design/icons";
import type { ExpenseRequestDetailed, ExpenseStatus } from "@/types/expense";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";

interface AttachmentInfo {
  key: string;
  filename: string;
  url: string | null;
}

function getFileIcon(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return <FilePdfOutlined style={{ color: "#ff4d4f", fontSize: 18 }} />;
  if (lower.match(/\.(jpe?g|png|gif|webp)$/)) return <FileImageOutlined style={{ color: "#1890ff", fontSize: 18 }} />;
  if (lower.match(/\.(docx?)$/)) return <FileWordOutlined style={{ color: "#2f54eb", fontSize: 18 }} />;
  return <FileUnknownOutlined style={{ fontSize: 18 }} />;
}

const { Text, Title } = Typography;

interface ExpenseDetailModalProps {
  open: boolean;
  onClose: () => void;
  expense: ExpenseRequestDetailed | null;
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

const formatCurrency = (amount: number, currency: string = "TZS") => {
  return `${currency} ${amount.toLocaleString()}`;
};

export function ExpenseDetailModal({ open, onClose, expense }: ExpenseDetailModalProps) {
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  useEffect(() => {
    if (open && expense?.id && expense.attachments && expense.attachments.length > 0) {
      const fetchAttachments = async () => {
        setAttachmentsLoading(true);
        try {
          const response = await fetch(`/api/v1/expenses/${expense.id}/attachments`, {
            credentials: "include",
          });
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

  if (!expense) return null;

  // Build timeline items based on expense status
  const getTimelineItems = () => {
    const items = [];

    // Created
    items.push({
      color: "green",
      dot: <FileTextOutlined />,
      children: (
        <div>
          <Text strong>Application Submitted</Text>
          <br />
          <Text type="secondary">
            {formatDate(expense.created_at)}
            {expense.created_by && ` by ${expense.created_by.full_name || expense.created_by.username}`}
          </Text>
        </div>
      ),
    });

    // Manager Approval
    if (expense.approved_at && expense.approved_by) {
      items.push({
        color: "green",
        dot: <CheckCircleOutlined />,
        children: (
          <div>
            <Text strong>Manager Approved</Text>
            <br />
            <Text type="secondary">
              {formatDate(expense.approved_at)} by {expense.approved_by.full_name || expense.approved_by.username}
            </Text>
            {expense.manager_comment && (
              <>
                <br />
                <Text italic>"{expense.manager_comment}"</Text>
              </>
            )}
          </div>
        ),
      });
    } else if (expense.status === "Rejected") {
      items.push({
        color: "red",
        dot: <CloseCircleOutlined />,
        children: (
          <div>
            <Text strong>Manager Rejected</Text>
            {expense.manager_comment && (
              <>
                <br />
                <Text italic>"{expense.manager_comment}"</Text>
              </>
            )}
          </div>
        ),
      });
    } else if (expense.status === "Returned") {
      items.push({
        color: "orange",
        dot: <ClockCircleOutlined />,
        children: (
          <div>
            <Text strong>Returned for Revision</Text>
            {expense.manager_comment && (
              <>
                <br />
                <Text italic>"{expense.manager_comment}"</Text>
              </>
            )}
          </div>
        ),
      });
    } else if (expense.status === "Pending Manager") {
      items.push({
        color: "blue",
        dot: <ClockCircleOutlined />,
        children: (
          <div>
            <Text strong>Awaiting Manager Approval</Text>
          </div>
        ),
      });
    }

    // Finance Payment
    if (expense.status === "Paid" && expense.payment_date) {
      items.push({
        color: "green",
        dot: <BankOutlined />,
        children: (
          <div>
            <Text strong>Payment Processed</Text>
            <br />
            <Text type="secondary">
              {formatDate(expense.payment_date)}
              {expense.paid_by && ` by ${expense.paid_by.full_name || expense.paid_by.username}`}
            </Text>
            <br />
            <Text>
              Method: {expense.payment_method || "N/A"}
              {expense.payment_reference && ` | Ref: ${expense.payment_reference}`}
            </Text>
          </div>
        ),
      });
    } else if (expense.status === "Pending Finance") {
      items.push({
        color: "blue",
        dot: <ClockCircleOutlined />,
        children: (
          <div>
            <Text strong>Awaiting Finance Payment</Text>
          </div>
        ),
      });
    }

    return items;
  };

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined />
          <span>Expense Details - {expense.expense_number || expense.id.slice(0, 8).toUpperCase()}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
    >
      {/* Status Badge */}
      <div style={{ marginBottom: 16 }}>
        <ExpenseStatusBadge status={expense.status} />
      </div>

      {/* Basic Information */}
      <Descriptions
        title="Application Details"
        bordered
        column={2}
        size="small"
        style={{ marginBottom: 24 }}
      >
        <Descriptions.Item label="Expense Number" span={1}>
          <Text strong>{expense.expense_number || expense.id.slice(0, 8).toUpperCase()}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Category" span={1}>
          <Tag color="blue">{expense.category}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Remarks" span={2}>
          {expense.description || "-"}
        </Descriptions.Item>
        {expense.expense_metadata?.item_details && (
          <Descriptions.Item label="Item Details" span={2}>
            {expense.expense_metadata.item_details}
          </Descriptions.Item>
        )}
        {expense.expense_metadata?.item_name && (
          <Descriptions.Item label="Expense Type" span={1}>
            {expense.expense_metadata.item_name}
          </Descriptions.Item>
        )}
        {expense.expense_metadata?.invoice_state && (
          <Descriptions.Item label="Invoice" span={1}>
            {expense.expense_metadata.invoice_state}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Amount" span={1}>
          <Text strong style={{ fontSize: 16, color: "#1890ff" }}>
            {formatCurrency(expense.amount, expense.currency)}
          </Text>
        </Descriptions.Item>
        <Descriptions.Item label="Currency" span={1}>
          {expense.currency || "TZS"}
        </Descriptions.Item>
        {expense.currency !== "TZS" && expense.exchange_rate && (
          <>
            <Descriptions.Item label="Exchange Rate" span={1}>
              {expense.exchange_rate}
            </Descriptions.Item>
            <Descriptions.Item label="Amount (TZS)" span={1}>
              <Text>{formatCurrency(expense.amount * expense.exchange_rate, "TZS")}</Text>
            </Descriptions.Item>
          </>
        )}
        <Descriptions.Item label="Submitted Date" span={1}>
          {formatDate(expense.created_at)}
        </Descriptions.Item>
        <Descriptions.Item label="Submitted By" span={1}>
          {expense.created_by?.full_name || expense.created_by?.username || "-"}
        </Descriptions.Item>
      </Descriptions>

      {/* Trip Information (if linked) */}
      {expense.trip && (
        <Descriptions
          title="Trip Information"
          bordered
          column={2}
          size="small"
          style={{ marginBottom: 24 }}
        >
          <Descriptions.Item label="Trip Number" span={1}>
            <Text strong>{expense.trip.trip_number}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Route" span={1}>
            {expense.trip.route_name || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Status" span={1}>
            <Tag>{expense.trip.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Current Location" span={1}>
            {expense.trip.current_location || "-"}
          </Descriptions.Item>
        </Descriptions>
      )}

      {/* Payment Information (if paid) */}
      {expense.status === "Paid" && (
        <Descriptions
          title="Payment Information"
          bordered
          column={2}
          size="small"
          style={{ marginBottom: 24 }}
        >
          <Descriptions.Item label="Payment Method" span={1}>
            {expense.payment_method || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Reference" span={1}>
            {expense.payment_reference || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Payment Date" span={1}>
            {formatDate(expense.payment_date)}
          </Descriptions.Item>
          <Descriptions.Item label="Processed By" span={1}>
            {expense.paid_by?.full_name || expense.paid_by?.username || "-"}
          </Descriptions.Item>
        </Descriptions>
      )}

      {/* Approval Information */}
      {(expense.approved_by || expense.manager_comment) && (
        <Descriptions
          title="Approval Information"
          bordered
          column={2}
          size="small"
          style={{ marginBottom: 24 }}
        >
          <Descriptions.Item label="Approved By" span={1}>
            {expense.approved_by?.full_name || expense.approved_by?.username || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Approved At" span={1}>
            {formatDate(expense.approved_at)}
          </Descriptions.Item>
          {expense.manager_comment && (
            <Descriptions.Item label="Manager Comment" span={2}>
              <Text italic>{expense.manager_comment}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>
      )}

      {/* Attachments */}
      {expense.attachments && expense.attachments.length > 0 && (
        <>
          <Divider titlePlacement="left" styles={{ content: { margin: 0 } }}>
            <Text strong><PaperClipOutlined /> Attachments ({expense.attachments.length})</Text>
          </Divider>
          {attachmentsLoading ? (
            <div style={{ textAlign: "center", padding: 20 }}><Spin size="small" /></div>
          ) : (
            <List
              size="small"
              dataSource={attachments}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    item.url ? (
                      <Button
                        key="dl"
                        type="link"
                        size="small"
                        icon={<DownloadOutlined />}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </Button>
                    ) : null,
                  ]}
                >
                  <List.Item.Meta
                    avatar={getFileIcon(item.filename)}
                    title={
                      item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer">{item.filename}</a>
                      ) : (
                        item.filename
                      )
                    }
                  />
                </List.Item>
              )}
              style={{ marginBottom: 16 }}
            />
          )}
        </>
      )}

      {/* Timeline */}
      <Divider titlePlacement="left" styles={{ content: { margin: 0 } }}>
        <Text strong>Application Timeline</Text>
      </Divider>
      <Timeline items={getTimelineItems()} />
    </Modal>
  );
}
