"use client";

import { Row, Col, Input, Select, Typography } from "antd";
import type { ExpenseRequestDetailed } from "@/types/expense";
import type { EditableHeader } from "@/hooks/useExpenseCalculations";
import { COMPANY_NAME } from "@/constants/expenseConstants";
import { fmtCurrency } from "@/lib/utils";

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

interface ExpenseSummaryPanelProps {
  expense: ExpenseRequestDetailed;
  editable: boolean;
  editHeader: EditableHeader | null;
  displayAmount: number;
  displayCurrency: string;
  onEditHeaderChange: (header: EditableHeader) => void;
}

export function ExpenseSummaryPanel({
  expense,
  editable,
  editHeader,
  displayAmount,
  displayCurrency,
  onEditHeaderChange,
}: ExpenseSummaryPanelProps) {
  const meta = expense.expense_metadata;
  const bankDetails = meta?.bank_details;
  const paymentMethodDisplay = meta?.payment_method || expense.payment_method;

  const updateHeader = (patch: Partial<EditableHeader>) => {
    if (editHeader) onEditHeaderChange({ ...editHeader, ...patch });
  };

  return (
    <div
      style={{
        marginBottom: 24,
        padding: 16,
        background: "var(--color-surface)",
        borderRadius: 8,
      }}
    >
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary">Company</Text>
          </div>
          <Input value={COMPANY_NAME} readOnly />
        </Col>
        <Col span={8}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary">Application Date</Text>
          </div>
          <Input
            value={formatDate(meta?.application_date || expense.created_at)}
            readOnly
          />
        </Col>
        <Col span={8}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary">Total Amount</Text>
          </div>
          <Input
            value={fmtCurrency(displayAmount, displayCurrency)}
            readOnly
            style={{ fontWeight: 700 }}
          />
        </Col>
        <Col span={8}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary">Payment Method</Text>
          </div>
          {editable && editHeader ? (
            <Select
              style={{ width: "100%" }}
              value={editHeader.payment_method}
              onChange={(val) => updateHeader({ payment_method: val })}
            >
              <Select.Option value="Cash">Cash</Select.Option>
              <Select.Option value="Transfer">Transfer</Select.Option>
            </Select>
          ) : (
            <Input value={paymentMethodDisplay || "-"} readOnly />
          )}
        </Col>
        <Col span={16}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary">Remarks</Text>
          </div>
          {editable && editHeader ? (
            <Input
              value={editHeader.remarks}
              onChange={(e) => updateHeader({ remarks: e.target.value })}
              placeholder="General remarks"
            />
          ) : (
            <Input value={meta?.remarks || expense.description || "-"} readOnly />
          )}
        </Col>
      </Row>

      {/* Bank Details */}
      {editable && editHeader?.payment_method === "Transfer" ? (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">Bank Name</Text>
            </div>
            <Input
              value={editHeader.bank_name}
              onChange={(e) => updateHeader({ bank_name: e.target.value })}
              placeholder="Enter Bank Name"
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">Account Name</Text>
            </div>
            <Input
              value={editHeader.account_name}
              onChange={(e) => updateHeader({ account_name: e.target.value })}
              placeholder="Enter Account Name"
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">Account No.</Text>
            </div>
            <Input
              value={editHeader.account_no}
              onChange={(e) => updateHeader({ account_no: e.target.value })}
              placeholder="Enter Account Number"
            />
          </Col>
        </Row>
      ) : bankDetails ? (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">Bank Name</Text>
            </div>
            <Input value={bankDetails.bank_name || "-"} readOnly />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">Account Name</Text>
            </div>
            <Input value={bankDetails.account_name || "-"} readOnly />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary">Account No.</Text>
            </div>
            <Input value={bankDetails.account_no || "-"} readOnly />
          </Col>
        </Row>
      ) : null}
    </div>
  );
}
