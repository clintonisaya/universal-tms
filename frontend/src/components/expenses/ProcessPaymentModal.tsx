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
    Space,
    Table,
    Typography,
    Tabs,
    Tooltip,
    Descriptions,
    Tag,
    List,
    Spin,
    Empty,
} from "antd";
import {
    UserOutlined,
    FileTextOutlined,
    CarOutlined,
    CheckCircleOutlined,
    PaperClipOutlined,
    DownloadOutlined,
    FilePdfOutlined,
    FileImageOutlined,
    FileWordOutlined,
    FileUnknownOutlined,
} from "@ant-design/icons";
import type { ExpenseRequestDetailed } from "@/types/expense";
import dayjs from "dayjs";

const { Text, Paragraph } = Typography;

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

// Simplified Icon Logic - Cleaner, uniform look
function getFileIcon(filename: string) {
    const lower = filename.toLowerCase();
    const style = { color: "#8c8c8c", fontSize: 18 }; // Uniform grey for less noise
    
    if (lower.endsWith(".pdf")) return <FilePdfOutlined style={{ ...style, color: "#ff4d4f" }} />; // Keep PDF red as it's standard
    if (lower.match(/\.(jpe?g|png|gif|webp)$/)) return <FileImageOutlined style={style} />;
    if (lower.match(/\.(docx?)$/)) return <FileWordOutlined style={style} />;
    return <FileUnknownOutlined style={style} />;
}

export function ProcessPaymentModal({ open, onClose, onSuccess, expense }: ProcessPaymentModalProps) {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);

    // Watch Payment Method for conditional fields
    const paymentMethod = Form.useWatch("method", form);

    // Fetch attachment presigned URLs when modal opens
    useEffect(() => {
        if (open && expense?.id && expense.attachments && expense.attachments.length > 0) {
            const fetchAttachments = async () => {
                setAttachmentsLoading(true);
                try {
                    const response = await fetch(`/api/v1/expenses/${expense.id}/attachments`, {
                        credentials: "include",
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setAttachments(data);
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

    // Determine if this is a Trip Expense or Office Expense for display
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
            item: expense.description || expense.category, // Payment Item description
            category: expense.category,
            amount: expense.amount,
            currency: expense.currency || "TZS",
            invoice_state: expense.expense_metadata?.invoice_state || "With Invoice",
            details: expense.expense_metadata?.item_details || expense.expense_metadata?.item_name || expense.description,
            exchange_rate: expense.exchange_rate,
            remarks: expense.expense_metadata?.remarks,
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
            ellipsis: { showTitle: false },
            render: (text: string) => (
                <Tooltip placement="topLeft" title={text} styles={{ root: { maxWidth: 400 } }}>
                    <Text strong>{text || "-"}</Text>
                </Tooltip>
            ),
        },
        {
            title: "Category",
            dataIndex: "category",
            width: 100,
            render: (cat: string) => <Tag color="default" style={{ borderColor: '#d9d9d9', color: '#595959' }}>{cat}</Tag>,
        },
        {
            title: "Amount",
            dataIndex: "amount",
            width: 120,
            align: "right" as const,
            render: (amount: number) => (
                <Text>
                    {Number(amount).toLocaleString()}
                </Text>
            ),
        },
        {
            title: "Currency",
            dataIndex: "currency",
            width: 80,
            render: (curr: string) => <Text type="secondary">{curr}</Text>
        },
        {
            title: "Invoice State",
            dataIndex: "invoice_state",
            width: 120,
            render: (state: string) => <Text style={{ fontSize: 12 }}>{state}</Text>
        },
        {
            title: "Details",
            dataIndex: "details",
            width: 180,
            ellipsis: { showTitle: false },
            render: (text: string) => (
                <Tooltip placement="topLeft" title={text} styles={{ root: { maxWidth: 400 } }}>
                    <span style={{ color: '#8c8c8c', cursor: "pointer" }}>{text || "-"}</span>
                </Tooltip>
            ),
        },
        {
            title: "Ex. Rate",
            dataIndex: "exchange_rate",
            width: 80,
            render: (rate: number) => rate ? <Text type="secondary">{rate}</Text> : "-",
        },
        {
            title: "Remarks",
            dataIndex: "remarks",
            ellipsis: { showTitle: false },
            render: (text: string) => text ? (
                <Tooltip placement="topLeft" title={text} styles={{ root: { maxWidth: 400 } }}>
                    <span style={{ cursor: "pointer" }}>{text}</span>
                </Tooltip>
            ) : "-",
        },
    ];

    // Expense Summary Section - Cleaner, Lighter
    const ExpenseSummary = (
        <div style={{ marginBottom: 24, padding: "16px 24px", background: "#ffffff", borderRadius: 8, border: "1px solid #f0f0f0" }}>
            <Descriptions
                title={<Text strong style={{ fontSize: 15 }}>Expense Details</Text>}
                size="small"
                column={3}
                styles={{ label: { color: '#8c8c8c' } }} // Muted labels
            >
                <Descriptions.Item label="Expense Number">
                    <Text copyable style={{ color: "#D4AF37", fontWeight: 600 }}>{expense.expense_number || "N/A"}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                    <Tag color="gold" bordered={false}>{expense.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Amount">
                    <Text strong style={{ fontSize: 16 }}>
                        {expense.currency || "TZS"} {expense.amount.toLocaleString()}
                    </Text>
                </Descriptions.Item>
                
                <Descriptions.Item label="Initiated By">
                    <Space size={4}>
                        <UserOutlined style={{ color: '#bfbfbf' }} />
                        <Text>{expense.created_by?.full_name || expense.created_by?.username || "Unknown"}</Text>
                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                            {expense.created_at ? dayjs(expense.created_at).format("MMM D, HH:mm") : ""}
                        </Text>
                    </Space>
                </Descriptions.Item>
                
                <Descriptions.Item label="Approved By">
                    {expense.approved_by ? (
                        <Space size={4}>
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            <Text>
                                {expense.approved_by.full_name || expense.approved_by.username}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                                {expense.approved_at ? dayjs(expense.approved_at).format("MMM D, HH:mm") : ""}
                            </Text>
                        </Space>
                    ) : (
                        <Text type="secondary">-</Text>
                    )}
                </Descriptions.Item>

                {isTripExpense && (
                    <Descriptions.Item label="Trip">
                        <Space>
                            <CarOutlined style={{ color: '#bfbfbf' }} />
                            <Text>{tripNumber || expense.trip_id}</Text>
                        </Space>
                    </Descriptions.Item>
                )}
                
                <Descriptions.Item label="Description" span={isTripExpense ? 2 : 3}>
                    <Text type="secondary">{expense.description || "-"}</Text>
                </Descriptions.Item>
                
                {expense.manager_comment && (
                    <Descriptions.Item label="Manager Comment" span={3}>
                        <div style={{ padding: '8px 12px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4, width: '100%' }}>
                             <Text type="warning">{expense.manager_comment}</Text>
                        </div>
                    </Descriptions.Item>
                )}
            </Descriptions>
        </div>
    );

    // Basic Info Tab Content
    const BasicInfoTab = (
        <>
            {/* Expense Summary */}
            {ExpenseSummary}

            {/* Items Table */}
            <div style={{ marginBottom: 20 }}>
                <Text strong style={{ display: "block", marginBottom: 12, fontSize: 14 }}>Expense Items</Text>
                <Table
                    dataSource={tableData}
                    columns={columns}
                    pagination={false}
                    size="small"
                    bordered
                    scroll={{ x: 900 }}
                    footer={() => (
                        <div style={{ textAlign: "right", fontWeight: "bold", fontSize: 16 }}>
                            Total: {expense.currency || "TZS"} {expense.amount.toLocaleString()}
                        </div>
                    )}
                />
            </div>

            {/* Compact Payment Form */}
            <div style={{ padding: 16, background: "#f0f5ff", borderRadius: 8, border: "1px solid #d6e4ff" }}>
                <Row gutter={[16, 8]} align="middle">
                    <Col xs={24} sm={6}>
                        <Form.Item
                            label="Payment Method"
                            name="method"
                            rules={[{ required: true, message: "Required" }]}
                            initialValue={expense.expense_metadata?.payment_method?.toUpperCase() === "TRANSFER" ? "TRANSFER" : "CASH"}
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
                            label={paymentMethod === "TRANSFER" ? "Reference Number" : "Remarks (Optional)"}
                            name="reference"
                            rules={[{ required: paymentMethod === "TRANSFER", message: "Reference required for transfers" }]}
                            style={{ marginBottom: 0 }}
                        >
                            <Input placeholder={paymentMethod === "TRANSFER" ? "e.g. Bank Ref / Transaction ID" : "Optional notes"} />
                        </Form.Item>
                    </Col>
                </Row>

                {/* Bank Details */}
                <Row gutter={[16, 8]} style={{ marginTop: 12 }}>
                    <Col xs={24} sm={8}>
                        <Form.Item label="Bank Name" name="bank_name" initialValue={expense.expense_metadata?.bank_details?.bank_name} style={{ marginBottom: 0 }}>
                            <Input placeholder="Bank Name" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item label="Account Name" name="account_name" initialValue={expense.expense_metadata?.bank_details?.account_name} style={{ marginBottom: 0 }}>
                            <Input placeholder="Account Name" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Form.Item label="Account No." name="account_no" initialValue={expense.expense_metadata?.bank_details?.account_no} style={{ marginBottom: 0 }}>
                            <Input placeholder="Account Number" />
                        </Form.Item>
                    </Col>
                </Row>
            </div>
        </>
    );

    // Dynamic Title Logic
    const modalTitle = isTripExpense
        ? (
            <span>
                Process Trip Payment {tripNumber ? `- ${tripNumber}` : ''}
                <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px', fontWeight: 'normal' }}>
                    ({expense.expense_number || 'New'})
                </span>
            </span>
        )
        : (
            <span>
                Process Office Payment
                <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px', fontWeight: 'normal' }}>
                    ({expense.expense_number || 'New'})
                </span>
            </span>
        );

    return (
        <Modal
            title={modalTitle}
            open={open}
            width={1100}
            destroyOnHidden
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
        >
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Tabs
                    defaultActiveKey="1"
                    items={[
                        {
                            key: "1",
                            label: "Basic Information",
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
