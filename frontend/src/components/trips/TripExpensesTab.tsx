"use client";

import { Space, Button, Table, Alert, Typography, Descriptions, Popconfirm } from "antd";
import { PlusOutlined, ReloadOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { TripDetailed } from "@/types/trip";
import type { ExpenseRequest, ExpenseStatus } from "@/types/expense";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";

const { Text } = Typography;

interface TripExpensesTabProps {
  trip: TripDetailed;
  expenses: ExpenseRequest[];
  expensesLoading: boolean;
  activeCurrency: string;
  toggleCurrencies: string[];
  singleRate: number;
  showFinancials: boolean;
  displayCurrency: string;
  onDisplayCurrencyChange: (cur: string) => void;
  onAddExpense: () => void;
  onRefresh: () => void;
  onDeleteExpense: (expense: ExpenseRequest) => void;
  convertedTotal: (targetCurrency: string) => { total: number; unconvertedCount: number };
  resolveRate: (e: ExpenseRequest) => number;
}

export function TripExpensesTab({
  trip,
  expenses,
  expensesLoading,
  activeCurrency,
  toggleCurrencies,
  singleRate,
  showFinancials,
  displayCurrency,
  onDisplayCurrencyChange,
  onAddExpense,
  onRefresh,
  onDeleteExpense,
  convertedTotal,
}: TripExpensesTabProps) {
  const isClosed = trip.status === "Completed" || trip.status === "Cancelled";
  const { total: expensesTotal, unconvertedCount } = convertedTotal(activeCurrency);

  const convertWaybillRate = (amount: number | null, currency: string | null): number | null => {
    if (amount === null) return null;
    const num = Number(amount);
    if (isNaN(num)) return null;
    const cur = currency || "USD";
    if (cur === activeCurrency) return num;
    if (activeCurrency === "TZS" && cur === "USD") return num * singleRate;
    if (activeCurrency === "USD" && cur === "TZS") return num / singleRate;
    return num;
  };

  const goIncome = convertWaybillRate(trip.waybill_rate, trip.waybill_currency);
  const returnIncome = convertWaybillRate(trip.return_waybill_rate, trip.return_waybill_currency);
  const hasIncome = goIncome !== null || returnIncome !== null;
  const combinedIncome = (goIncome ?? 0) + (returnIncome ?? 0);
  const netProfit = combinedIncome - expensesTotal;

  const fmtAmt = (val: number) =>
    val.toLocaleString("en-US", {
      minimumFractionDigits: activeCurrency === "USD" ? 2 : 0,
      maximumFractionDigits: activeCurrency === "USD" ? 2 : 0,
    });

  const expenseColumns: ColumnsType<ExpenseRequest> = [
    {
      title: "Expense #", dataIndex: "expense_number", key: "expense_number", width: 200,
      render: (val: string | null) => val ?? "—",
    },
    { title: "Category", dataIndex: "category", key: "category", width: 130 },
    { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
    {
      title: "Amount", dataIndex: "amount", key: "amount", align: "right", width: 160,
      render: (amount: number, record: any) => {
        const cur = record.currency || "TZS";
        return `${cur} ${Number(amount).toLocaleString("en-US")}`;
      },
    },
    {
      title: "Status", dataIndex: "status", key: "status", width: 230,
      render: (status: ExpenseStatus) => <ExpenseStatusBadge status={status} compact />,
    },
    {
      title: "Created", dataIndex: "created_at", key: "created_at", width: 130,
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "", key: "actions", width: 50,
      render: (_: unknown, record: ExpenseRequest) => {
        return record.status === "Pending Manager" && !isClosed ? (
          <Popconfirm
            title="Delete expense?"
            description="This cannot be undone."
            onConfirm={() => onDeleteExpense(record)}
            okText="Delete" cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        ) : null;
      },
    },
  ];

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      {isClosed && (
        <Alert
          message="Trip Closed"
          description={`This trip is ${trip.status.toLowerCase()}. No expense modifications are allowed.`}
          type="info" showIcon
        />
      )}

      {/* Currency toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Space size={4}>
          <Text type="secondary">View in:</Text>
          {toggleCurrencies.map((cur) => (
            <Button
              key={cur} size="small"
              type={activeCurrency === cur ? "primary" : "default"}
              onClick={() => onDisplayCurrencyChange(cur)}
            >
              {cur}
            </Button>
          ))}
          {activeCurrency === "USD" && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              1 USD = {singleRate.toLocaleString("en-US")} TZS
            </Text>
          )}
        </Space>
      </div>

      {/* Trip Income */}
      {showFinancials && hasIncome && (
        <Descriptions bordered size="small" column={1} title={<Text strong>Trip Income</Text>}>
          {trip.waybill_rate && (
            <Descriptions.Item
              label={
                <Space>
                  <span>Go Waybill</span>
                  {trip.waybill_currency && trip.waybill_currency !== "TZS" && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ({trip.waybill_currency} {Number(trip.waybill_rate).toLocaleString("en-US")})
                    </Text>
                  )}
                </Space>
              }
            >
              <Text style={{ color: "var(--color-green)", fontWeight: 500 }}>
                {activeCurrency} {fmtAmt(goIncome ?? 0)}
              </Text>
            </Descriptions.Item>
          )}
          {trip.return_waybill_rate && (
            <Descriptions.Item
              label={
                <Space>
                  <span>Return Waybill</span>
                  {trip.return_waybill_currency && trip.return_waybill_currency !== "TZS" && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ({trip.return_waybill_currency} {Number(trip.return_waybill_rate).toLocaleString("en-US")})
                    </Text>
                  )}
                </Space>
              }
            >
              <Text style={{ color: "var(--color-green)", fontWeight: 500 }}>
                {activeCurrency} {fmtAmt(returnIncome ?? 0)}
              </Text>
            </Descriptions.Item>
          )}
          {trip.return_waybill_rate && (
            <Descriptions.Item label={<Text strong>Combined Income</Text>}>
              <Text strong style={{ color: "var(--color-green)", fontSize: "var(--font-lg)" }}>
                {activeCurrency} {fmtAmt(combinedIncome)}
              </Text>
            </Descriptions.Item>
          )}
        </Descriptions>
      )}

      {/* Expense list header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space align="center" wrap>
          <Text strong>Total Expenses:</Text>
          <Text strong style={{ color: "var(--color-red)", fontSize: "var(--font-lg)" }}>
            {activeCurrency} {fmtAmt(expensesTotal)}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {unconvertedCount > 0
              ? `(${unconvertedCount} expense${unconvertedCount > 1 ? "s" : ""} excluded — no exchange rate set)`
              : "(excl. Voided, Rejected & Returned)"}
          </Text>
          {showFinancials && hasIncome && (
            <>
              <Text type="secondary" style={{ fontSize: "var(--font-sm)", margin: "0 4px" }}>|</Text>
              <Text strong>Net Profit:</Text>
              <Text
                strong
                style={{ color: netProfit >= 0 ? "var(--color-green)" : "var(--color-red)", fontSize: "var(--font-lg)" }}
              >
                {netProfit >= 0 ? "+" : ""}{activeCurrency} {fmtAmt(netProfit)}
              </Text>
            </>
          )}
        </Space>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAddExpense} size="small" disabled={isClosed}>
            Add Expense
          </Button>
          <Button icon={<ReloadOutlined />} onClick={onRefresh} size="small">
            Refresh
          </Button>
        </Space>
      </div>

      <Table<ExpenseRequest>
        columns={expenseColumns}
        dataSource={expenses}
        rowKey="id"
        loading={expensesLoading}
        scroll={{ x: "max-content" }}
        pagination={false}
        size="small"
      />
    </Space>
  );
}
