"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  App,
  Row,
  Col,
  DatePicker,
  Table,
  Typography,
  Tabs,
  Descriptions,
  Timeline,
  Space,
  Spin,
  Empty,
} from "antd";
import {
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  BankOutlined,
  FileTextOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileUnknownOutlined,
} from "@ant-design/icons";
import type { ExpenseRequestDetailed } from "@/types/expense";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fmtAmount, fmtCurrency } from "@/lib/utils";
import dayjs from "dayjs";
import { COMPANY_NAME } from "@/constants/expenseConstants";

const { Text } = Typography;

interface ProcessPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expense: ExpenseRequestDetailed | null;
}

interface AttachmentInfo {
  key: string;
  filename: string;
  url: string | null;
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

export function ProcessPaymentModal({
  open,
  onClose,
  onSuccess,
  expense,
}: ProcessPaymentModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const paymentMethod = Form.useWatch("method", form);

  // Fetch attachments
  useEffect(() => {
    if (
      open &&
      expense?.id &&
      expense.attachments &&
      expense.attachments.length > 0
    ) {
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

  if (!expense) {
    return (
      <Modal open={false} footer={null}>
        <Form form={form} />
      </Modal>
    );
  }

  const isTripExpense = !!expense.trip_id;
  const meta = expense.expense_metadata;
  const bankDetails = meta?.bank_details;
  const paymentMethodDisplay = meta?.payment_method || expense.payment_method;

  const handleFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/v1/expenses/${expense.id}/payment`,
        {
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
        }
      );

      if (response.ok) {
        message.success("Payment processed successfully");
        form.resetFields();
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        message.error(error.detail || "Payment failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Tab 1: Expense Details ---
  const ExpenseDetailsTab = (
    <>
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
              <Text type="secondary">
                Company
              </Text>
            </div>
            <Input value={COMPANY_NAME} readOnly />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">
                Application Date
              </Text>
            </div>
            <Input
              value={formatDate(meta?.application_date || expense.created_at)}
              readOnly
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">
                Total Amount
              </Text>
            </div>
            <Input
              value={formatCurrency(expense.amount, expense.currency)}
              readOnly
              style={{ fontWeight: 700 }}
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">
                Payment Method
              </Text>
            </div>
            <Input value={paymentMethodDisplay || "-"} readOnly />
          </Col>
          <Col span={16}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">
                Remarks
              </Text>
            </div>
            <Input
              value={meta?.remarks || expense.description || "-"}
              readOnly
            />
          </Col>
        </Row>

        {/* Bank Details */}
        {bankDetails && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">
                  Bank Name
                </Text>
              </div>
              <Input value={bankDetails.bank_name || "-"} readOnly />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">
                  Account Name
                </Text>
              </div>
              <Input value={bankDetails.account_name || "-"} readOnly />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary">
                  Account No.
                </Text>
              </div>
              <Input value={bankDetails.account_no || "-"} readOnly />
            </Col>
          </Row>
        )}
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: 24 }}>
        <Table
          scroll={{ x: "max-content" }}
          dataSource={[
            {
              key: "1",
              item_name: meta?.item_name || expense.category,
              amount: expense.amount,
              currency: expense.currency,
              invoice_state: meta?.invoice_state || "-",
              details:
                meta?.item_details || expense.description || "-",
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
      </div>

      {/* Trip Info (if linked) */}
      {expense.trip && (
        <Descriptions
          title="Trip Information"
          bordered
          column={2}
          size="small"
        >
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
  );

  // --- Tab 2: Attachments ---
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

  // --- Tab 3: Tracking/Timeline ---
  const getTimelineItems = () => {
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

  const TrackingTab = (
    <div style={{ padding: "16px 0" }}>
      <Timeline items={getTimelineItems()} />
    </div>
  );

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
            <DollarOutlined />
            <span>
              {isTripExpense ? "Process Trip Payment" : "Process Office Payment"}{" "}
              — {expense.expense_number || expense.id?.slice(0, 8).toUpperCase() || "..."}
            </span>
          </Space>
          <ExpenseStatusBadge status={expense.status} />
        </div>
      }
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      width={1200}
      style={{ top: 20 }}
      styles={{
        body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto" },
      }}
      footer={null}
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
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
              children: TrackingTab,
            },
          ]}
        />

        {/* Payment Processing Panel */}
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
                  paymentMethod === "TRANSFER"
                    ? "Reference Number"
                    : "Remarks (Optional)"
                }
                name="reference"
                rules={[
                  {
                    required: paymentMethod === "TRANSFER",
                    message: "Reference required for transfers",
                  },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input
                  placeholder={
                    paymentMethod === "TRANSFER"
                      ? "e.g. Bank Ref / Transaction ID"
                      : "Optional notes"
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Bank Details */}
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

          {/* Confirm Button — centered */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 16,
            }}
          >
            <Button
              type="primary"
              icon={<DollarOutlined />}
              loading={submitting}
              onClick={form.submit}
              size="large"
            >
              Confirm Payment
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
