"use client";

import { useState, useMemo } from "react";
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
    Tooltip,
} from "antd";
import { DollarOutlined } from "@ant-design/icons";
import type { ExpenseRequestDetailed, PaymentMethod } from "@/types/expense";
import dayjs from "dayjs";

const { Text } = Typography;

interface ProcessPaymentModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    expense: ExpenseRequestDetailed | null;
}

export function ProcessPaymentModal({ open, onClose, onSuccess, expense }: ProcessPaymentModalProps) {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    // Watch Payment Method for conditional fields
    const paymentMethod = Form.useWatch("method", form);

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
            width: 60,
            align: "center" as const,
            render: (_: any, __: any, index: number) => index + 1,
        },
        {
            title: "Payment Item",
            dataIndex: "item",
            width: 250,
            ellipsis: true,
        },
        {
            title: "Amount",
            dataIndex: "amount",
            width: 140,
            align: "right" as const,
            render: (amount: number, record: any) => (
                <Text strong>
                    {Number(amount).toLocaleString()}
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
            width: 200,
            ellipsis: true,
        },
        {
            title: "Ex. Rate",
            dataIndex: "exchange_rate",
            width: 100,
            render: (rate: number) => rate || "-",
        },
        {
            title: "Remarks",
            dataIndex: "remarks",
            width: 150,
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
                        <Form.Item label="Payment Date" name="payment_date" initialValue={dayjs()}>
                            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
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
                                <Select.Option value="TRANSFER">Transfer</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>

                    {/* If Trip Expense, show Trip info? Maybe in remarks or title is enough. */}
                    <Col span={16}>
                        <Form.Item
                            label={paymentMethod === "TRANSFER" ? "Reference Number" : "Simple Remarks"}
                            name="reference"
                            rules={[{ required: paymentMethod === "TRANSFER", message: "Reference is required for transfers" }]}
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

            {/* Items Table */}
            <div style={{ marginBottom: 16 }}>
                <Table
                    dataSource={tableData}
                    columns={columns}
                    pagination={false}
                    size="middle"
                    bordered
                    scroll={{ x: 1000 }}
                    footer={() => (
                        <div style={{ textAlign: "right", fontWeight: "bold", fontSize: 16 }}>
                            Total: {expense.currency || "TZS"} {expense.amount.toLocaleString()}
                        </div>
                    )}
                />
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
                            label: "Basic Information",
                            children: BasicInfoTab,
                        },
                        {
                            key: "2",
                            label: "Attachment Manage",
                            children: (
                                <div style={{ padding: 20, textAlign: "center" }}>
                                    Attachment upload functionality coming soon.
                                </div>
                            ),
                        },
                    ]}
                />
            </Form>
        </Modal>
    );
}
