"use client";

import { Space, Tag } from "antd";
import type { ExpenseStatus } from "@/types/expense";

interface ExpenseStatusBadgeProps {
  status: ExpenseStatus;
  compact?: boolean;
}

/**
 * Dual Status Badge for Expenses - Story 2.20
 * Shows both Manager Approval and Finance Payment status side-by-side.
 *
 * Status Flow:
 * - Pending Manager: Manager=Pending(blue), Finance=Waiting(grey)
 * - Pending Finance: Manager=Approved(green), Finance=Pending(blue)
 * - Paid: Manager=Approved(green), Finance=Paid(green)
 * - Rejected: Manager=Rejected(red), Finance hidden
 * - Returned: Manager=Returned(orange), Finance hidden
 */
export function ExpenseStatusBadge({ status, compact = false }: ExpenseStatusBadgeProps) {
  const badges = getDualStatusBadges(status, compact);

  return (
    <Space size={4} wrap>
      {badges}
    </Space>
  );
}

function getDualStatusBadges(status: ExpenseStatus, compact: boolean): React.ReactNode[] {
  const managerLabel = compact ? "M" : "Manager";
  const financeLabel = compact ? "F" : "Finance";

  switch (status) {
    case "Pending Manager":
      return [
        <Tag key="manager" color="processing">
          {managerLabel}: Pending
        </Tag>,
        <Tag key="finance" color="default">
          {financeLabel}: Waiting
        </Tag>,
      ];

    case "Pending Finance":
      return [
        <Tag key="manager" color="success">
          {managerLabel}: Approved
        </Tag>,
        <Tag key="finance" color="processing">
          {financeLabel}: Pending
        </Tag>,
      ];

    case "Paid":
      return [
        <Tag key="manager" color="success">
          {managerLabel}: Approved
        </Tag>,
        <Tag key="finance" color="success">
          {financeLabel}: Paid
        </Tag>,
      ];

    case "Rejected":
      return [
        <Tag key="manager" color="error">
          {managerLabel}: Rejected
        </Tag>,
      ];

    case "Returned":
      return [
        <Tag key="manager" color="warning">
          {managerLabel}: Returned
        </Tag>,
      ];

    default:
      return [
        <Tag key="unknown" color="default">
          {status}
        </Tag>,
      ];
  }
}

export default ExpenseStatusBadge;
