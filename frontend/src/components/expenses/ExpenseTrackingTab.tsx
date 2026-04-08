"use client";

import { Steps, Typography, Space } from "antd";
import type { ExpenseRequestDetailed } from "@/types/expense";

const { Text } = Typography;

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

function buildTrackingSteps(expense: ExpenseRequestDetailed) {
  const wasReturned = expense.status === "Pending Manager" && !!expense.returned_at;

  const submitted = {
    title: "Submitted",
    status: "finish" as const,
    description: expense.created_by ? (
      <Text type="secondary">
        {expense.created_by.full_name || expense.created_by.username} · {formatDate(expense.created_at)}
      </Text>
    ) : undefined,
  };

  if (wasReturned) {
    return [
      submitted,
      {
        title: "Returned for Revision",
        status: "error" as const,
        description: (
          <Text italic style={{ fontSize: "var(--font-sm)" }}>&quot;{expense.manager_comment}&quot;</Text>
        ),
      },
      {
        title: "Resubmitted",
        status: "process" as const,
        description: <Text type="secondary">Awaiting manager review</Text>,
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
        description: <Text type="secondary">Awaiting manager review</Text>,
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
            <Text type="secondary">
              {expense.approved_by.full_name || expense.approved_by.username} · {formatDate(expense.approved_at)}
            </Text>
            {expense.manager_comment && (
              <Text italic style={{ fontSize: "var(--font-sm)" }}>&quot;{expense.manager_comment}&quot;</Text>
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
            <Text type="secondary">
              {expense.approved_by.full_name || expense.approved_by.username} · {formatDate(expense.approved_at)}
            </Text>
            {expense.manager_comment && (
              <Text italic style={{ fontSize: "var(--font-sm)" }}>&quot;{expense.manager_comment}&quot;</Text>
            )}
          </Space>
        ) : undefined,
      },
    ];
  }

  if (expense.status === "Voided") {
    return [
      submitted,
      {
        title: "Manager Approved",
        status: "finish" as const,
        description: expense.approved_by ? (
          <Text type="secondary">
            {expense.approved_by.full_name || expense.approved_by.username} · {formatDate(expense.approved_at)}
          </Text>
        ) : undefined,
      },
      {
        title: "Voided",
        status: "error" as const,
        description: (
          <Space direction="vertical" size={0}>
            {expense.voided_by && (
              <Text type="secondary">
                {expense.voided_by.full_name || expense.voided_by.username} · {formatDate(expense.voided_at)}
              </Text>
            )}
            {expense.void_reason && (
              <Text italic style={{ fontSize: "var(--font-sm)" }}>&quot;{expense.void_reason}&quot;</Text>
            )}
          </Space>
        ),
      },
    ];
  }

  // Pending Finance or Paid
  const managerApproved = {
    title: "Manager Approved",
    status: "finish" as const,
    description: expense.approved_by ? (
      <Space direction="vertical" size={0}>
        <Text type="secondary">
          {expense.approved_by.full_name || expense.approved_by.username} · {formatDate(expense.approved_at)}
        </Text>
        {expense.manager_comment && (
          <Text italic style={{ fontSize: "var(--font-sm)" }}>&quot;{expense.manager_comment}&quot;</Text>
        )}
      </Space>
    ) : undefined,
  };

  const financeStep = {
    title: "Finance Payment",
    status: expense.status === "Paid" ? ("finish" as const) : ("process" as const),
    description:
      expense.status === "Paid" && expense.paid_by ? (
        <Text type="secondary">
          {expense.paid_by.full_name || expense.paid_by.username} · {formatDate(expense.payment_date)}
          {expense.payment_method && ` · ${expense.payment_method}`}
          {expense.payment_reference && ` (${expense.payment_reference})`}
        </Text>
      ) : expense.status === "Pending Finance" ? (
        <Text type="secondary">Awaiting finance payment</Text>
      ) : undefined,
  };

  return [submitted, managerApproved, financeStep];
}

interface ExpenseTrackingTabProps {
  expense: ExpenseRequestDetailed;
}

export function ExpenseTrackingTab({ expense }: ExpenseTrackingTabProps) {
  return (
    <div style={{ padding: "16px 0" }}>
      <Steps
        direction="vertical"
        size="small"
        current={-1}
        items={buildTrackingSteps(expense)}
      />
    </div>
  );
}
