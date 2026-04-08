"use client";

import { Modal, Tabs, Typography, Spin, Space, Steps, Alert } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ExpenseRequestDetailed } from "@/types/expense";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import { EXPENSE_STEPS } from "@/constants/expenseConstants";
import { useExpenseCalculations } from "@/hooks/useExpenseCalculations";
import { ExpenseSummaryPanel } from "./ExpenseSummaryPanel";
import { ExpenseItemList } from "./ExpenseItemList";
import { ExpenseApprovalActions } from "./ExpenseApprovalActions";
import { ExpenseAttachmentsTab } from "./ExpenseAttachmentsTab";
import { ExpenseTrackingTab } from "./ExpenseTrackingTab";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const { Text } = Typography;

interface ExpenseReviewModalProps {
  open: boolean;
  onClose: () => void;
  expense: ExpenseRequestDetailed | null;
  actions?: string[];
  onActionComplete?: () => void;
  /** @deprecated Use onActionComplete instead — payment is now handled inline */
  onPay?: (expense: ExpenseRequestDetailed) => void;
  loading?: boolean;
}

export function ExpenseReviewModal({
  open,
  onClose,
  expense,
  actions = [],
  onActionComplete,
  onPay,
  loading = false,
}: ExpenseReviewModalProps) {
  const {
    editItems,
    editHeader,
    expenseTypesLoading,
    currentExchangeRate,
    editable,
    isReturned,
    groupedExpenseOptions,
    editTotal,
    displayAmount,
    displayCurrency,
    setEditHeader,
    handleItemFieldAt,
    handleAddRow,
    handleDeleteRow,
    getItemName,
  } = useExpenseCalculations({ expense, open, actions });

  const buildResubmitPayload = () => {
    if (!expense || !editHeader) return null;
    const firstItem = editItems[0];
    const total = editItems.reduce((sum, it) => sum + (it.amount || 0), 0);

    const metadataItems = editItems.map((item) => ({
      expense_type_id: item.expense_type_id,
      item_name: getItemName(item),
      item_details: item.details,
      amount: item.amount,
      currency: item.currency,
      invoice_state: item.invoice_state,
      exchange_rate: item.exchange_rate,
      category: item.category,
    }));

    const bankDetails = editHeader.payment_method === "Transfer" ? {
      bank_name: editHeader.bank_name,
      account_name: editHeader.account_name,
      account_no: editHeader.account_no,
    } : null;

    return {
      amount: total,
      description: editHeader.remarks || firstItem.details,
      category: firstItem.category || expense.category,
      expense_metadata: {
        ...(expense.expense_metadata || {}),
        items: metadataItems,
        item_name: getItemName(firstItem),
        item_details: firstItem.details,
        invoice_state: firstItem.invoice_state,
        payment_method: editHeader.payment_method,
        remarks: editHeader.remarks,
        bank_details: bankDetails,
      },
    };
  };

  if (!expense && !loading) return null;

  // Pipeline steps
  const expenseStepIndex: Record<string, number> = {
    "Pending Manager": 1,
    "Pending Finance": 2,
    "Paid": 3,
    "Rejected": 1,
    "Returned": 1,
  };
  const currentExpenseStep = expenseStepIndex[expense?.status ?? ""] ?? 0;
  const isExpenseError = expense?.status === "Rejected" || expense?.status === "Returned";

  const ExpenseDetailsTab = expense ? (
    <>
      <Steps
        size="small"
        current={currentExpenseStep}
        status={isExpenseError ? "error" : "process"}
        style={{ marginBottom: 16 }}
        items={EXPENSE_STEPS.map((label, i) => ({
          title: label,
          status: isExpenseError && i === currentExpenseStep
            ? "error"
            : i < currentExpenseStep
              ? "finish"
              : i === currentExpenseStep
                ? "process"
                : "wait",
        }))}
      />

      {isReturned && expense.manager_comment && (
        <Alert
          type="warning"
          title="Please address the following before resubmitting:"
          description={expense.manager_comment}
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <ExpenseSummaryPanel
        expense={expense}
        editable={editable}
        editHeader={editHeader}
        displayAmount={displayAmount}
        displayCurrency={displayCurrency}
        onEditHeaderChange={setEditHeader}
      />

      <ExpenseItemList
        expense={expense}
        editable={editable}
        editItems={editItems}
        editTotal={editTotal}
        currentExchangeRate={currentExchangeRate}
        groupedExpenseOptions={groupedExpenseOptions}
        expenseTypesLoading={expenseTypesLoading}
        onItemFieldChange={handleItemFieldAt}
        onAddRow={handleAddRow}
        onDeleteRow={handleDeleteRow}
      />
    </>
  ) : null;

  return (
    <ErrorBoundary>
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
              <SearchOutlined />
              <span>
                Expense Review —{" "}
                {expense?.expense_number ||
                  expense?.id?.slice(0, 8).toUpperCase() ||
                  "..."}
              </span>
            </Space>
            {expense && <ExpenseStatusBadge status={expense.status} />}
          </div>
        }
        open={open}
        onCancel={onClose}
        width={1200}
        style={{ top: 20 }}
        styles={{
          body: { maxHeight: "calc(100vh - 200px)", overflowY: "auto" },
        }}
        footer={null}
        forceRender
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 80 }}>
            <Spin size="large" />
          </div>
        ) : expense ? (
          <>
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
                  children: <ExpenseAttachmentsTab expense={expense} editable={editable} />,
                },
                {
                  key: "tracking",
                  label: "Tracking",
                  children: <ExpenseTrackingTab expense={expense} />,
                },
              ]}
            />

            <ExpenseApprovalActions
              expense={expense}
              actions={actions}
              editable={editable}
              editItems={editItems}
              editHeader={editHeader}
              editTotal={editTotal}
              buildResubmitPayload={buildResubmitPayload}
              onActionComplete={onActionComplete}
              onClose={onClose}
            />
          </>
        ) : null}
      </Modal>
    </ErrorBoundary>
  );
}
