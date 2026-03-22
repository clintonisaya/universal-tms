"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  message,
  Row,
  Col,
  DatePicker,
  Table,
  Typography,
  Tabs,
  List,
  Spin,
  Empty,
  Result,
  Descriptions,
} from "antd";
import {
  DollarOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileUnknownOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { PrintPreviewModal } from "./PrintPreviewModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ExpenseRequestDetailed } from "@/types/expense";
import dayjs from "dayjs";
import { COMPANY_NAME } from "@/constants/expenseConstants";

interface AttachmentInfo {
  key: string;
  filename: string;
  url: string | null;
}

interface PaymentResult {
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  paidAt: string;
  recipient: string;
}

function getFileIcon(filename: string) {
  const lower = filename.toLowerCase();
  const style = { color: "var(--color-text-muted)", fontSize: 18 };
  if (lower.endsWith(".pdf")) return <FilePdfOutlined style={{ ...style, color: "var(--color-red)" }} />;
  if (lower.match(/\.(jpe?g|png|gif|webp)$/)) return <FileImageOutlined style={style} />;
  if (lower.match(/\.(docx?)$/)) return <FileWordOutlined style={style} />;
  return <FileUnknownOutlined style={style} />;
}

const { Text } = Typography;

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expense: ExpenseRequestDetailed | null;
}

export function PaymentModal({ open, onClose, onSuccess, expense }: PaymentModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [printReceiptOpen, setPrintReceiptOpen] = useState(false);

  // Watch Payment Method for conditional fields
  const paymentMethod = Form.useWatch("method", form);

  // Fetch attachment presigned URLs
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

  // Return early but still render the Modal shell to keep form connected
  if (!expense) {
    return (
      <Modal open={false} footer={null}>
        <Form form={form} />
      </Modal>
    );
  }

  const isTripExpense = !!expense.trip_id;
  const tripNumber = expense.trip?.trip_number;

  const handleFinish = async (values: any) => {
    setSubmitting(true);
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
        const methodLabel = values.method === "CASH" ? "Cash" : "Bank Transfer / M-Pesa";
        setPaymentResult({
          amount: expense.amount,
          currency: expense.currency ?? "TZS",
          method: methodLabel,
          reference: values.reference || null,
          paidAt: new Date().toLocaleString(),
          recipient: expense.created_by?.full_name ?? expense.created_by?.username ?? "—",
        });
        onSuccess(); // invalidate React Query — do NOT call onClose() yet
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

  // Helpers
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };
  const formatCurrency = (amount: number, currency: string = "TZS") =>
    `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  // Table data for the expense item
  const tableData = [
    {
      key: "1",
      item: expense.description || expense.category,
      category: expense.category,
      amount: expense.amount,
      currency: expense.currency || "TZS",
      invoice_state: expense.expense_metadata?.invoice_state || "With Invoice",
      details: expense.expense_metadata?.item_details || expense.description,
    },
  ];

  const columns = [
    {
      title: "No.",
      dataIndex: "key",
      width: 50,
      align: "center" as const,
      render: (_: any, __: any, index: number) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: "Payment Item",
      dataIndex: "item",
      width: 200,
    },
    {
      title: "Category",
      dataIndex: "category",
      width: 120,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      width: 140,
      align: "right" as const,
      render: (amount: number, record: any) => (
        <Text strong>
          {record.currency} {amount.toLocaleString("en-US")}
        </Text>
      ),
    },
    {
      title: "Currency",
      dataIndex: "currency",
      width: 100,
    },
    {
      title: "Invoice State",
      dataIndex: "invoice_state",
      width: 150,
    },
    {
      title: "Details",
      dataIndex: "details",
      ellipsis: true,
    },
  ];

  // Basic Info Tab Content
  const BasicInfoTab = (
    <>
      {/* Header Grid - matching ExpenseReviewModal pattern */}
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
            <Input value={formatDate(expense.expense_metadata?.application_date || expense.created_at)} readOnly />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Total Amount</Text>
            </div>
            <Input value={formatCurrency(expense.amount, expense.currency)} readOnly style={{ fontWeight: "bold" }} />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Requester</Text>
            </div>
            <Input value={expense.created_by?.full_name || expense.created_by?.username || "Unknown"} readOnly />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Expense Number</Text>
            </div>
            <Input value={expense.expense_number || "-"} readOnly />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
            </div>
            <Input value={expense.status} readOnly />
          </Col>
          {isTripExpense && (
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Trip</Text>
              </div>
              <Input value={tripNumber || expense.trip_id || "-"} readOnly />
            </Col>
          )}
          <Col span={isTripExpense ? 16 : 16}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Description / Remarks</Text>
            </div>
            <Input value={expense.expense_metadata?.remarks || expense.description || "-"} readOnly />
          </Col>
        </Row>

        {/* Approved by info */}
        {expense.approved_by && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Approved By</Text>
              </div>
              <Input value={expense.approved_by.full_name || expense.approved_by.username} readOnly />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Approved At</Text>
              </div>
              <Input value={formatDate(expense.approved_at)} readOnly />
            </Col>
          </Row>
        )}

        {/* Manager comment */}
        {expense.manager_comment && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Manager Comment</Text>
              </div>
              <Input value={expense.manager_comment} readOnly style={{ color: "var(--color-gold)" }} />
            </Col>
          </Row>
        )}
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: 16 }}>
        <Table
          dataSource={tableData}
          columns={columns}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 900 }}
          footer={() => (
            <div style={{ textAlign: "right", fontWeight: "bold", fontSize: 16 }}>
              Total: {formatCurrency(expense.amount, expense.currency)}
            </div>
          )}
        />
      </div>

      {/* Payment Form */}
      <div style={{ padding: 16, background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Form.Item
              label="Payment Method"
              name="method"
              rules={[{ required: true, message: "Please select payment method" }]}
              initialValue="CASH"
            >
              <Select>
                <Select.Option value="CASH">Cash</Select.Option>
                <Select.Option value="TRANSFER">Bank Transfer / M-Pesa</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Payment Date" name="payment_date">
              <DatePicker style={{ width: "100%" }} defaultValue={dayjs()} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={paymentMethod === "TRANSFER" ? "Reference Number" : "Remarks (Optional)"}
              name="reference"
              rules={[{ required: paymentMethod === "TRANSFER", message: "Reference required for transfers" }]}
            >
              <Input placeholder={paymentMethod === "TRANSFER" ? "e.g. Bank Ref / Transaction ID" : "Optional notes"} />
            </Form.Item>
          </Col>
        </Row>

        {/* Conditional Bank Details */}
        {paymentMethod === "TRANSFER" && (
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Form.Item label="Bank Name" name="bank_name">
                <Input placeholder="Enter Bank Name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Account Name" name="account_name">
                <Input placeholder="Enter Account Name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Account No." name="account_no">
                <Input placeholder="Enter Account Number" />
              </Form.Item>
            </Col>
          </Row>
        )}
      </div>
    </>
  );

  return (
    <Modal
      title={
        <span>
          <DollarOutlined style={{ marginRight: 8 }} />
          Process Payment
        </span>
      }
      open={open}
      width={1100}
      style={{ top: 20 }}
      styles={{ body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto" } }}
      onCancel={() => {
        setPaymentResult(null);
        form.resetFields();
        onClose();
      }}
      footer={paymentResult ? null : [
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={form.submit}>
          Confirm Payment
        </Button>,
      ]}
      forceRender
    >
      {paymentResult ? (
        <Result
          status="success"
          title="Payment Processed Successfully"
          subTitle={`${paymentResult.currency} ${Number(paymentResult.amount).toLocaleString("en-US")} via ${paymentResult.method}`}
          extra={[
            <Button
              key="print"
              icon={<PrinterOutlined />}
              onClick={() => setPrintReceiptOpen(true)}
            >
              Print Receipt
            </Button>,
            <Button
              key="close"
              type="primary"
              onClick={() => {
                setPaymentResult(null);
                form.resetFields();
                onClose();
              }}
            >
              Close
            </Button>,
          ]}
        >
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="Recipient">{paymentResult.recipient}</Descriptions.Item>
            <Descriptions.Item label="Reference">{paymentResult.reference ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Payment Date">{paymentResult.paidAt}</Descriptions.Item>
            <Descriptions.Item label="Method">{paymentResult.method}</Descriptions.Item>
          </Descriptions>
        </Result>
      ) : (
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: "1",
              label: "Payment Information",
              children: BasicInfoTab,
            },
            {
              key: "2",
              label: (
                <span>
                  <PaperClipOutlined /> Attachments
                  {expense.attachments && expense.attachments.length > 0 && (
                    <StatusBadge status={String(expense.attachments.length)} colorKey="gray" />
                  )}
                </span>
              ),
              children: (
                <div style={{ padding: 20 }}>
                  {attachmentsLoading ? (
                    <div style={{ textAlign: "center", padding: 40 }}>
                      <Spin tip="Loading attachments..." />
                    </div>
                  ) : attachments.length === 0 ? (
                    <Empty description="No attachments" />
                  ) : (
                    <List
                      dataSource={attachments}
                      renderItem={(item) => (
                        <List.Item
                          actions={[
                            item.url ? (
                              <Button
                                key="download"
                                type="link"
                                icon={<DownloadOutlined />}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Download
                              </Button>
                            ) : (
                              <Text key="unavailable" type="secondary">Unavailable</Text>
                            ),
                          ]}
                        >
                          <List.Item.Meta
                            avatar={getFileIcon(item.filename)}
                            title={
                              item.url ? (
                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                  {item.filename}
                                </a>
                              ) : (
                                item.filename
                              )
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Form>
      )}

      <PrintPreviewModal
        open={printReceiptOpen}
        onClose={() => setPrintReceiptOpen(false)}
        expenseIds={[expense.id]}
      />
    </Modal>
  );
}
