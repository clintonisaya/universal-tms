"use client";

import { useState, useEffect, useMemo } from "react";
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
  InputNumber,
  List,
  Spin,
  Empty,
  Tag,
} from "antd";
import {
  DollarOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileUnknownOutlined,
} from "@ant-design/icons";
import type { ExpenseRequestDetailed } from "@/types/expense";
import dayjs from "dayjs";

interface AttachmentInfo {
  key: string;
  filename: string;
  url: string | null;
}

function getFileIcon(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return <FilePdfOutlined style={{ color: "#ff4d4f", fontSize: 20 }} />;
  if (lower.match(/\.(jpe?g|png|gif|webp)$/)) return <FileImageOutlined style={{ color: "#1890ff", fontSize: 20 }} />;
  if (lower.match(/\.(docx?)$/)) return <FileWordOutlined style={{ color: "#2f54eb", fontSize: 20 }} />;
  return <FileUnknownOutlined style={{ fontSize: 20 }} />;
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
        }),
      });

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
      width: 60,
      align: "center" as const,
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
          {record.currency} {amount.toLocaleString()}
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
      {/* Header Grid */}
      <div style={{ marginBottom: 24, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Form.Item label="Company">
              <Input value="EDUPO COMPANY LIMITED" readOnly />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Payment Date" name="payment_date">
              <DatePicker style={{ width: "100%" }} defaultValue={dayjs()} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Payment Amount">
              <Input
                value={`${expense.currency || "TZS"} ${expense.amount.toLocaleString()}`}
                readOnly
                style={{ fontWeight: "bold" }}
              />
            </Form.Item>
          </Col>
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
            <Form.Item label="Payee">
              <Input value={expense.created_by?.full_name || "Unknown"} readOnly />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Expense Number">
              <Input value={expense.expense_number || "-"} readOnly />
            </Form.Item>
          </Col>
        </Row>

        {/* Conditional Bank Details / Reference */}
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
            <Col span={24}>
              <Form.Item
                label="Reference Number"
                name="reference"
                rules={[{ required: true, message: "Reference is required for transfers" }]}
              >
                <Input placeholder="e.g. QXJ123456 or M-Pesa Transaction ID" />
              </Form.Item>
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
          size="middle"
          bordered
          scroll={{ x: 900 }}
          footer={() => (
            <div style={{ textAlign: "right", fontWeight: "bold", fontSize: 16 }}>
              Total: {expense.currency || "TZS"} {expense.amount.toLocaleString()}
            </div>
          )}
        />
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
      width={1000}
      style={{ top: 20 }}
      styles={{ body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto" } }}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={form.submit}>
          Confirm Payment
        </Button>,
      ]}
      forceRender
    >
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
                    <Tag color="blue" style={{ marginLeft: 6 }}>{expense.attachments.length}</Tag>
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
    </Modal>
  );
}
