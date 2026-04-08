"use client";

import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
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
  const managerLabel = compact ? "M" : "Manager";
  const financeLabel = compact ? "F" : "Finance";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      {getDualStatusBadges(status, managerLabel, financeLabel, compact)}
    </span>
  );
}

function getDualStatusBadges(
  status: ExpenseStatus,
  managerLabel: string,
  financeLabel: string,
  compact: boolean,
): ReactNode[] {
  // P5: compact mode uses abbreviated labels visually but passes full labels to aria
  const mFull = "Manager";
  const fFull = "Finance";

  switch (status) {
    case "Pending Manager":
      return [
        <StatusBadge key="manager" status={`${managerLabel}: Pending`} colorKey="orange" ariaLabel={compact ? `${mFull}: Pending` : undefined} />,
        <StatusBadge key="finance" status={`${financeLabel}: Waiting`} colorKey="gray"   ariaLabel={compact ? `${fFull}: Waiting` : undefined} />,
      ];

    case "Pending Finance":
      return [
        <StatusBadge key="manager" status={`${managerLabel}: Approved`} colorKey="green"  ariaLabel={compact ? `${mFull}: Approved` : undefined} />,
        <StatusBadge key="finance" status={`${financeLabel}: Pending`}  colorKey="orange" ariaLabel={compact ? `${fFull}: Pending` : undefined} />,
      ];

    case "Paid":
      return [
        <StatusBadge key="manager" status={`${managerLabel}: Approved`} colorKey="green" ariaLabel={compact ? `${mFull}: Approved` : undefined} />,
        <StatusBadge key="finance" status={`${financeLabel}: Paid`}     colorKey="green" ariaLabel={compact ? `${fFull}: Paid` : undefined} />,
      ];

    case "Rejected":
      return [
        <StatusBadge key="manager" status={`${managerLabel}: Rejected`} colorKey="red" ariaLabel={compact ? `${mFull}: Rejected` : undefined} />,
      ];

    case "Returned":
      return [
        <StatusBadge key="manager" status={`${managerLabel}: Returned`} colorKey="orange" ariaLabel={compact ? `${mFull}: Returned` : undefined} />,
      ];

    case "Voided":
      return [
        <StatusBadge key="voided" status="Voided" colorKey="red" />,
      ];

    default:
      return [
        <StatusBadge key="unknown" status={status} colorKey="gray" />,
      ];
  }
}

export default ExpenseStatusBadge;
