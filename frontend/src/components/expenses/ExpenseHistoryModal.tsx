"use client";

import { Modal, Steps, Descriptions, Tag, Typography, Space, Divider } from "antd";
import {
  UserOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import type { ExpenseRequestDetailed, ExpenseStatus } from "@/types/expense";

const { Text } = Typography;

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  "Pending Manager": "orange",
  "Pending Finance": "blue",
  Paid: "green",
  Rejected: "red",
  Returned: "purple",
};

interface ExpenseHistoryModalProps {
  open: boolean;
  onClose: () => void;
  expense: ExpenseRequestDetailed | null;
}

function getStepStatus(
  expenseStatus: ExpenseStatus,
  stepIndex: number
): "finish" | "process" | "wait" | "error" {
  switch (expenseStatus) {
    case "Pending Manager":
      if (stepIndex === 0) return "finish";
      if (stepIndex === 1) return "process";
      return "wait";
    case "Pending Finance":
      if (stepIndex <= 1) return "finish";
      if (stepIndex === 2) return "process";
      return "wait";
    case "Paid":
      return "finish";
    case "Rejected":
      if (stepIndex === 0) return "finish";
      if (stepIndex === 1) return "error";
      return "wait";
    case "Returned":
      if (stepIndex === 0) return "finish";
      if (stepIndex === 1) return "error";
      return "wait";
    default:
      return "wait";
  }
}

export function ExpenseHistoryModal({
  open,
  onClose,
  expense,
}: ExpenseHistoryModalProps) {
  if (!expense) return null;

  const formatDate = (date: string | null | undefined) =>
    date ? new Date(date).toLocaleString() : "-";

  const formatAmount = (amount: number, cur?: string) => {
    const currency = cur || "TZS";
    return `${currency} ${Number(amount).toLocaleString()}`;
  };

  const items = [
    {
      title: "Initiated",
      status: getStepStatus(expense.status, 0),
      icon: <UserOutlined />,
      description: (
        <Space orientation="vertical" size={2}>
          <Text>
            Created by{" "}
            <Text strong>
              {expense.created_by?.full_name || expense.created_by?.username || "Unknown"}
            </Text>
          </Text>
          <Text type="secondary">{formatDate(expense.created_at)}</Text>
          <Text type="secondary">
            {formatAmount(expense.amount, expense.currency)} &middot; {expense.category}
          </Text>
        </Space>
      ),
    },
    {
      title:
        expense.status === "Rejected"
          ? "Rejected"
          : expense.status === "Returned"
          ? "Returned"
          : "Manager Approval",
      status: getStepStatus(expense.status, 1),
      icon:
        expense.status === "Rejected" || expense.status === "Returned" ? (
          <CloseCircleOutlined />
        ) : (
          <CheckCircleOutlined />
        ),
      description: (
        <Space orientation="vertical" size={2}>
          {expense.approved_by ? (
            <>
              <Text>
                {expense.status === "Rejected"
                  ? "Rejected"
                  : expense.status === "Returned"
                  ? "Returned"
                  : "Approved"}{" "}
                by{" "}
                <Text strong>
                  {expense.approved_by.full_name || expense.approved_by.username}
                </Text>
              </Text>
              <Text type="secondary">{formatDate(expense.approved_at)}</Text>
            </>
          ) : expense.status === "Pending Manager" ? (
            <Text type="secondary">
              <ClockCircleOutlined /> Awaiting manager review
            </Text>
          ) : expense.status === "Rejected" || expense.status === "Returned" ? (
            <Text type="secondary">
              {expense.status} by manager
            </Text>
          ) : (
            <Text type="secondary">Approved</Text>
          )}
          {expense.manager_comment && (
            <Text italic>Comment: &quot;{expense.manager_comment}&quot;</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Finance Payment",
      status: getStepStatus(expense.status, 2),
      icon: <DollarOutlined />,
      description: (
        <Space orientation="vertical" size={2}>
          {expense.paid_by ? (
            <>
              <Text>
                Paid by{" "}
                <Text strong>
                  {expense.paid_by.full_name || expense.paid_by.username}
                </Text>
              </Text>
              <Text type="secondary">{formatDate(expense.payment_date)}</Text>
              <Text type="secondary">
                Method: {expense.payment_method === "CASH" ? "Cash" : "Transfer"}
                {expense.payment_reference && ` (Ref: ${expense.payment_reference})`}
              </Text>
            </>
          ) : expense.status === "Pending Finance" ? (
            <Text type="secondary">
              <ClockCircleOutlined /> Awaiting finance payment
            </Text>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <span>Expense History</span>
          <Tag color={STATUS_COLORS[expense.status]}>{expense.status}</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
    >
      <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Category">{expense.category}</Descriptions.Item>
        <Descriptions.Item label="Amount">
          {formatAmount(expense.amount, expense.currency)}
        </Descriptions.Item>
        <Descriptions.Item label="Description" span={2}>
          {expense.description}
        </Descriptions.Item>
        {expense.trip && (
          <Descriptions.Item label="Trip" span={2}>
            {expense.trip.trip_number || expense.trip.route_name}
          </Descriptions.Item>
        )}
      </Descriptions>

      <Divider>Approval Flow</Divider>

      <Steps
        orientation="vertical"
        size="small"
        current={-1}
        items={items}
      />
    </Modal>
  );
}
