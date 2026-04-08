"use client";

import { InputNumber, Select, Space, Button, Table, Input, Tooltip, Typography, Descriptions } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { amountInputProps, fmtAmount, fmtCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ExpenseRequestDetailed } from "@/types/expense";
import type { EditableItem } from "@/hooks/useExpenseCalculations";

const { Text } = Typography;

interface ExpenseItemListProps {
  expense: ExpenseRequestDetailed;
  editable: boolean;
  editItems: EditableItem[];
  editTotal: number;
  currentExchangeRate: number | null;
  groupedExpenseOptions: { label: string; options: { label: string; value: string }[] }[];
  expenseTypesLoading: boolean;
  onItemFieldChange: (index: number, field: keyof EditableItem, value: any) => void;
  onAddRow: () => void;
  onDeleteRow: (index: number) => void;
}

export function ExpenseItemList({
  expense,
  editable,
  editItems,
  editTotal,
  currentExchangeRate,
  groupedExpenseOptions,
  expenseTypesLoading,
  onItemFieldChange,
  onAddRow,
  onDeleteRow,
}: ExpenseItemListProps) {
  const meta = expense.expense_metadata;

  return (
    <div style={{ marginBottom: 24 }}>
      {editable && editItems.length > 0 ? (
        <>
          <Space style={{ marginBottom: 8 }}>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAddRow}>
              Add Item
            </Button>
          </Space>
          <Table
            dataSource={editItems.map((item, idx) => ({ key: idx, ...item }))}
            columns={[
              {
                title: "No.",
                key: "no",
                width: 50,
                align: "center" as const,
                render: (_: any, __: any, idx: number) => idx + 1,
              },
              {
                title: "Payment Item",
                dataIndex: "expense_type_id",
                key: "expense_type_id",
                width: 250,
                render: (val: string, _: any, idx: number) => (
                  <Select
                    showSearch
                    style={{ width: "100%" }}
                    placeholder="Select Item"
                    optionFilterProp="label"
                    value={val}
                    onChange={(v) => onItemFieldChange(idx, "expense_type_id", v)}
                    options={groupedExpenseOptions as any}
                    loading={expenseTypesLoading}
                    allowClear
                  />
                ),
              },
              {
                title: "Amount",
                dataIndex: "amount",
                key: "amount",
                width: 140,
                render: (val: number, _: any, idx: number) => (
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    value={val}
                    onChange={(v) => onItemFieldChange(idx, "amount", v)}
                    {...amountInputProps}
                  />
                ),
              },
              {
                title: "Currency",
                dataIndex: "currency",
                key: "currency",
                width: 100,
                render: (val: string, _: any, idx: number) => (
                  <Select
                    style={{ width: "100%" }}
                    value={val}
                    onChange={(v) => onItemFieldChange(idx, "currency", v)}
                  >
                    <Select.Option value="TZS">TZS</Select.Option>
                    <Select.Option value="USD">USD</Select.Option>
                  </Select>
                ),
              },
              {
                title: "Invoice State",
                dataIndex: "invoice_state",
                key: "invoice_state",
                width: 130,
                render: (val: string, _: any, idx: number) => (
                  <Select
                    style={{ width: "100%" }}
                    value={val}
                    onChange={(v) => onItemFieldChange(idx, "invoice_state", v)}
                  >
                    <Select.Option value="With Invoice">With Invoice</Select.Option>
                    <Select.Option value="Without Invoice">Without Invoice</Select.Option>
                  </Select>
                ),
              },
              {
                title: "Details",
                dataIndex: "details",
                key: "details",
                render: (val: string, _: any, idx: number) => (
                  <Input
                    value={val}
                    onChange={(e) => onItemFieldChange(idx, "details", e.target.value)}
                  />
                ),
              },
              {
                title: (
                  <Tooltip title={currentExchangeRate ? `Current rate: ${currentExchangeRate}` : "No rate set"}>
                    <span style={{ cursor: "help" }}>Ex. Rate</span>
                  </Tooltip>
                ),
                dataIndex: "exchange_rate",
                key: "exchange_rate",
                width: 100,
                render: (val: number, record: any, idx: number) => (
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    value={val}
                    disabled={record.currency === "TZS"}
                    onChange={(v) => onItemFieldChange(idx, "exchange_rate", v)}
                  />
                ),
              },
              {
                title: "",
                key: "delete",
                width: 50,
                align: "center" as const,
                render: (_: any, __: any, idx: number) => (
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    disabled={editItems.length === 1}
                    onClick={() => onDeleteRow(idx)}
                  />
                ),
              },
            ]}
            pagination={false}
            size="middle"
            bordered
            scroll={{ x: 1050 }}
            footer={() => (
              <div style={{ textAlign: "right", fontWeight: 700, fontSize: 16 }}>
                Total: {fmtCurrency(editTotal, editItems[0]?.currency ?? "TZS")}
              </div>
            )}
          />
        </>
      ) : (
        <Table
          scroll={{ x: "max-content" }}
          dataSource={[
            {
              key: "1",
              item_name: meta?.item_name || expense.category,
              amount: expense.amount,
              currency: expense.currency,
              invoice_state: meta?.invoice_state || "-",
              details: meta?.item_details || expense.description || "-",
              exchange_rate: expense.exchange_rate,
            },
          ]}
          columns={[
            {
              title: "No.",
              key: "no",
              width: 60,
              align: "center" as const,
              render: () => 1,
            },
            {
              title: "Payment Item",
              dataIndex: "item_name",
              key: "item_name",
              width: 200,
            },
            {
              title: "Amount",
              dataIndex: "amount",
              key: "amount",
              width: 140,
              align: "right" as const,
              render: (val: number) => fmtAmount(val) || "-",
            },
            {
              title: "Currency",
              dataIndex: "currency",
              key: "currency",
              width: 80,
            },
            {
              title: "Invoice State",
              dataIndex: "invoice_state",
              key: "invoice_state",
              width: 130,
            },
            {
              title: "Details",
              dataIndex: "details",
              key: "details",
              ellipsis: true,
            },
            {
              title: "Ex. Rate",
              dataIndex: "exchange_rate",
              key: "exchange_rate",
              width: 100,
              render: (val: number | null) =>
                val && val !== 1 ? fmtAmount(val) : "-",
            },
          ]}
          pagination={false}
          size="middle"
          bordered
          footer={() => (
            <div
              style={{
                textAlign: "right",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              Total: {fmtCurrency(expense.amount, expense.currency)}
            </div>
          )}
        />
      )}

      {/* Trip Info (if linked) */}
      {expense.trip && (
        <Descriptions title="Trip Information" bordered column={2} size="small">
          <Descriptions.Item label="Trip Number">
            <Text strong>{expense.trip.trip_number}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Route">
            {expense.trip.route_name || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <StatusBadge status={expense.trip.status} />
          </Descriptions.Item>
          <Descriptions.Item label="Current Location">
            {expense.trip.current_location || "-"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </div>
  );
}
