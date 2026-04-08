"use client";

import { useState } from "react";
import {
  Row,
  Col,
  Input,
  Select,
  Space,
  Button,
  Form,
  DatePicker,
  Typography,
  App,
} from "antd";
import dayjs from "dayjs";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  UndoOutlined,
  DollarOutlined,
  SendOutlined,
} from "@ant-design/icons";
import type { ExpenseRequestDetailed } from "@/types/expense";

const { Text } = Typography;
const { TextArea } = Input;

interface ExpenseApprovalActionsProps {
  expense: ExpenseRequestDetailed;
  actions: string[];
  editable: boolean;
  editItems: { amount: number; [key: string]: any }[];
  editHeader: { payment_method: string; remarks: string; bank_name: string; account_name: string; account_no: string } | null;
  editTotal: number;
  /** Builds the resubmit payload from current edit state */
  buildResubmitPayload: () => { amount: number; description: string; category: string; expense_metadata: Record<string, any> } | null;
  /** Called after a successful action to refresh parent */
  onActionComplete?: () => void;
  /** Called to close the modal */
  onClose: () => void;
}

export function ExpenseApprovalActions({
  expense,
  actions,
  editable,
  editItems,
  editHeader,
  editTotal,
  buildResubmitPayload,
  onActionComplete,
  onClose,
}: ExpenseApprovalActionsProps) {
  const { message } = App.useApp();
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [paymentForm] = Form.useForm();
  const paymentMethodValue = Form.useWatch("method", paymentForm);

  const showApprove = actions.includes("approve");
  const showReject = actions.includes("reject");
  const showReturn = actions.includes("return");
  const showPay = actions.includes("pay");
  const showSubmit = actions.includes("submit");
  const hasActions = actions.length > 0;
  const commentRequired = showReject || showReturn;
  const bankDetails = expense.expense_metadata?.bank_details;

  const handleApprove = async () => {
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
    // If editable, save changes first then resubmit
    if (editable && editItems.length > 0) {
      for (const item of editItems) {
        if (!item.amount || item.amount <= 0) {
          message.error("Please enter a valid amount for all items");
          return;
        }
      }

      const payload = buildResubmitPayload();
      if (!payload) return;

      setProcessing(true);
      try {
        const updateResponse = await fetch(`/api/v1/expenses/${expense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (!updateResponse.ok) {
          const err = await updateResponse.json();
          message.error(err.detail || "Failed to update expense");
          return;
        }

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

  const handleConfirmPayment = async (values: any) => {
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

  return (
    <>
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
                  expense.expense_metadata?.payment_method?.toUpperCase() === "TRANSFER"
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

      {/* Standard action panel — for non-payment actions */}
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
  );
}
