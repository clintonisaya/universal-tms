"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns, ActionType } from "@ant-design/pro-components";
import { Button, App, Space } from "antd";
import {
  ReloadOutlined,
  StopOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import type { ExpenseRequestDetailed, ExpenseStatus } from "@/types/expense";
import { usePermissions } from "@/hooks/application/usePermissions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { VoidExpenseModal } from "@/components/expenses/VoidExpenseModal";
import { AmendAttachmentModal } from "@/components/expenses/AmendAttachmentModal";
import dayjs from "dayjs";

const ALL_STATUSES: ExpenseStatus[] = [
  "Pending Manager",
  "Pending Finance",
  "Paid",
  "Rejected",
  "Returned",
  "Voided",
];

const STATUS_ENUM = Object.fromEntries(
  ALL_STATUSES.map((s) => [s, { text: s }])
);

function getExpenseType(expenseNumber: string | null): string {
  if (!expenseNumber) return "Trip";
  return expenseNumber.startsWith("EX") ? "Office" : "Trip";
}

export default function ExpenseConsolePage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { hasAnyPermission, hasFullAccess } = usePermissions();
  const actionRef = useRef<ActionType>(null);

  const [selectedExpense, setSelectedExpense] =
    useState<ExpenseRequestDetailed | null>(null);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);

  const canVoid = hasAnyPermission("expenses:void");
  const canAmendAttachment = hasAnyPermission("expenses:amend-attachment");

  const columns: ProColumns<ExpenseRequestDetailed>[] = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 200,
      render: (_, record) => record.expense_number ?? "—",
      fieldProps: { placeholder: "Search expense number" },
    },
    {
      title: "Type",
      key: "type",
      dataIndex: "type" as any,
      width: 100,
      valueType: "select",
      valueEnum: {
        Trip: { text: "Trip" },
        Office: { text: "Office" },
      },
      search: {
        transform: (value) => ({ type: value }),
      },
      render: (_, record) => {
        const t = getExpenseType(record.expense_number);
        return (
          <StatusBadge status={t} colorKey={t === "Office" ? "blue" : "cyan"} />
        );
      },
      hideInTable: false,
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 110,
      valueType: "select",
      valueEnum: {
        Fuel: { text: "Fuel" },
        Allowance: { text: "Allowance" },
        Maintenance: { text: "Maintenance" },
        Office: { text: "Office" },
        Border: { text: "Border" },
        Other: { text: "Other" },
      },
    },
    {
      title: "Amount",
      key: "amount",
      dataIndex: "amount",
      width: 130,
      search: false,
      sorter: true,
      render: (_, record) =>
        `${record.currency ?? "USD"} ${record.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 180,
      valueType: "select",
      fieldProps: {
        mode: "multiple",
        placeholder: "Filter by status",
      },
      valueEnum: STATUS_ENUM,
      render: (_, record) => <ExpenseStatusBadge status={record.status} />,
    },
    {
      title: "Submitted By",
      key: "submitted_by",
      dataIndex: ["created_by", "full_name"],
      width: 150,
      search: false,
      render: (_, record) =>
        record.created_by?.full_name ?? record.created_by?.username ?? "—",
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 130,
      valueType: "dateRange",
      search: {
        transform: (value) => ({ startDate: value[0], endDate: value[1] }),
      },
      sorter: true,
      render: (_, record) =>
        record.created_at
          ? dayjs(record.created_at).format("DD MMM YYYY")
          : "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 200,
      valueType: "option",
      search: false,
      render: (_, record) => (
        <Space size="small">
          {canVoid &&
            record.status !== "Voided" &&
            record.status !== "Rejected" &&
            record.status !== "Pending Manager" && (
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={() => {
                  setSelectedExpense(record);
                  setVoidModalOpen(true);
                }}
              >
                Void
              </Button>
            )}
          {canAmendAttachment && (
            <Button
              size="small"
              icon={<PaperClipOutlined />}
              onClick={() => {
                setSelectedExpense(record);
                setAttachmentModalOpen(true);
              }}
            >
              Attachments
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <ProTable<ExpenseRequestDetailed>
        headerTitle="Expense Console"
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        request={async (params, sort) => {
          // Build server-side params
          const skip = ((params.current ?? 1) - 1) * (params.pageSize ?? 20);
          const limit = params.pageSize ?? 20;

          const searchParams = new URLSearchParams();
          searchParams.set("skip", String(skip));
          searchParams.set("limit", String(limit));

          // Status filter (can be array for multi-select)
          if (params.status) {
            const statusVal = Array.isArray(params.status)
              ? params.status[0]
              : params.status;
            if (statusVal) searchParams.set("status", String(statusVal));
          }
          // Category filter
          if (params.category) {
            searchParams.set("category", String(params.category));
          }

          try {
            const response = await fetch(
              `/api/v1/expenses/?${searchParams.toString()}`,
              { credentials: "include" }
            );
            if (!response.ok) {
              if (response.status === 401) router.push("/login");
              return { data: [], total: 0, success: false };
            }
            const result = await response.json();
            let data: ExpenseRequestDetailed[] = (result.data ??
              []) as ExpenseRequestDetailed[];

            // Client-side filters
            // Type filter
            if (params.type) {
              data = data.filter(
                (exp) => getExpenseType(exp.expense_number) === params.type
              );
            }
            // Date range filter
            if (params.startDate && params.endDate) {
              const start = dayjs(params.startDate as string).startOf("day");
              const end = dayjs(params.endDate as string).endOf("day");
              data = data.filter((exp) => {
                if (!exp.created_at) return false;
                const created = dayjs(exp.created_at);
                return (
                  created.isAfter(start) ||
                  created.isSame(start, "day") ||
                  created.isBefore(end) ||
                  created.isSame(end, "day")
                );
              });
            }
            // Expense number search
            if (params.expense_number) {
              const search = String(params.expense_number).toLowerCase();
              data = data.filter((exp) =>
                (exp.expense_number ?? "").toLowerCase().includes(search)
              );
            }

            // Client-side sort
            if (sort && sort.amount) {
              data.sort((a, b) =>
                sort.amount === "ascend"
                  ? a.amount - b.amount
                  : b.amount - a.amount
              );
            }
            if (sort && sort.created_at) {
              data.sort((a, b) => {
                const aDate = a.created_at ?? "";
                const bDate = b.created_at ?? "";
                return sort.created_at === "ascend"
                  ? aDate.localeCompare(bDate)
                  : bDate.localeCompare(aDate);
              });
            }

            return {
              data,
              total: result.count ?? data.length,
              success: true,
            };
          } catch {
            message.error("Network error");
            return { data: [], total: 0, success: false };
          }
        }}
        search={{ labelWidth: "auto", defaultCollapsed: false }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ["20", "50", "100"],
        }}
        toolBarRender={() => [
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            Refresh
          </Button>,
        ]}
      />

      <VoidExpenseModal
        expense={selectedExpense}
        open={voidModalOpen}
        onClose={() => setVoidModalOpen(false)}
        onSuccess={() => {
          setVoidModalOpen(false);
          actionRef.current?.reload();
        }}
      />

      <AmendAttachmentModal
        expense={selectedExpense}
        open={attachmentModalOpen}
        onClose={() => setAttachmentModalOpen(false)}
      />
    </>
  );
}
