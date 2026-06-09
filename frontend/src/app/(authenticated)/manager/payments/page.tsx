"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProTable } from "@ant-design/pro-components";
import type { ProColumns, ActionType } from "@ant-design/pro-components";
import { Button, App, Statistic, Space } from "antd";
import {
  PlayCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type {
  ExpenseRequest,
  ExpenseStatus,
  ExpenseRequestDetailed,
} from "@/types/expense";
import { useAuth } from "@/contexts/AuthContext";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { ExpenseReviewModal } from "@/components/expenses/ExpenseReviewModal";
import { CATEGORY_OPTIONS } from "@/constants/expenseConstants";

function PaymentsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { message } = App.useApp();
  const actionRef = useRef<ActionType>(null);

  // Summary stats state (updated after each fetch)
  const [totalsByCurrency, setTotalsByCurrency] = useState<
    Record<string, number>
  >({});

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewExpense, setReviewExpense] =
    useState<ExpenseRequestDetailed | null>(null);
  const [loadingExpense, setLoadingExpense] = useState(false);

  const openReviewModal = async (record: ExpenseRequest) => {
    setLoadingExpense(true);
    setReviewModalOpen(true);
    try {
      const response = await fetch(`/api/v1/expenses/${record.id}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setReviewExpense(data);
      } else {
        message.error("Failed to load expense details");
        setReviewModalOpen(false);
      }
    } catch {
      message.error("Network error");
      setReviewModalOpen(false);
    } finally {
      setLoadingExpense(false);
    }
  };

  const handleActionComplete = () => {
    setReviewModalOpen(false);
    setReviewExpense(null);
    actionRef.current?.reload();
  };

  const columns: ProColumns<ExpenseRequest>[] = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 140,
      fieldProps: { placeholder: "Search expense number" },
      render: (_, record) => (
        <a
          onClick={() => openReviewModal(record)}
          style={{
            fontWeight: 600,
            color: "var(--ant-color-primary)",
            cursor: "pointer",
          }}
        >
          {record.expense_number || record.id?.slice(0, 8).toUpperCase()}
        </a>
      ),
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 110,
      valueType: "date",
      search: false,
      sorter: true,
      render: (_, record) =>
        record.created_at
          ? new Date(record.created_at).toLocaleDateString()
          : "-",
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 120,
      valueType: "select",
      valueEnum: Object.fromEntries(
        CATEGORY_OPTIONS.map((o) => [o.value, { text: o.label }])
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      fieldProps: { placeholder: "Search description" },
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      align: "right",
      search: false,
      sorter: true,
      render: (_, record) => {
        const cur = record.currency || "TZS";
        return (
          <div style={{ fontWeight: 600 }}>
            {cur} {Number(record.amount).toLocaleString("en-US")}
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 260,
      search: false,
      render: (_, record) => <ExpenseStatusBadge status={record.status} />,
    },
    {
      title: "",
      key: "actions",
      width: 90,
      valueType: "option",
      search: false,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => openReviewModal(record)}
        >
          Review
        </Button>
      ),
    },
  ];

  return (
    <>
      <ProTable<ExpenseRequest>
        headerTitle="Finance Payments"
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        request={async (params, sort) => {
          if (!user) return { data: [], total: 0, success: false };

          const currentPage = params.current ?? 1;
          const size = params.pageSize ?? 20;
          const skip = (currentPage - 1) * size;

          const queryParams = new URLSearchParams();
          queryParams.set("skip", String(skip));
          queryParams.set("limit", String(size));
          queryParams.set("status", "Pending Finance");

          if (params.category) {
            queryParams.set("category", String(params.category));
          }
          if (params.expense_number) {
            queryParams.set(
              "expense_number",
              String(params.expense_number)
            );
          }

          try {
            const response = await fetch(
              `/api/v1/expenses/?${queryParams.toString()}`,
              { credentials: "include" }
            );
            if (!response.ok) {
              if (response.status === 401) router.push("/login");
              return { data: [], total: 0, success: false };
            }
            const result = await response.json();
            let data: ExpenseRequest[] = (result.data ?? []) as ExpenseRequest[];

            // Compute totals by currency for summary stats
            const totals = data.reduce(
              (acc, e) => {
                const cur = e.currency || "TZS";
                acc[cur] = (acc[cur] || 0) + Number(e.amount || 0);
                return acc;
              },
              {} as Record<string, number>
            );
            setTotalsByCurrency(totals);

            // Client-side search filters
            if (params.expense_number) {
              const search = String(params.expense_number).toLowerCase();
              data = data.filter((e) =>
                (e.expense_number ?? "").toLowerCase().includes(search)
              );
            }
            if (params.description) {
              const search = String(params.description).toLowerCase();
              data = data.filter((e) =>
                (e.description ?? "").toLowerCase().includes(search)
              );
            }

            // Client-side sort
            if (sort && sort.created_at) {
              data.sort((a, b) => {
                const aDate = a.created_at ?? "";
                const bDate = b.created_at ?? "";
                return sort.created_at === "ascend"
                  ? aDate.localeCompare(bDate)
                  : bDate.localeCompare(aDate);
              });
            }
            if (sort && sort.amount) {
              data.sort((a, b) =>
                sort.amount === "ascend"
                  ? Number(a.amount) - Number(b.amount)
                  : Number(b.amount) - Number(a.amount)
              );
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
        search={{ labelWidth: "auto", defaultCollapsed: true }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total) => `Total ${total} pending expenses`,
        }}
        scroll={{ x: "max-content" }}
        toolBarRender={() => [
          <Space key="stats" size="large">
            {Object.entries(totalsByCurrency).map(([cur, total]) => (
              <Statistic
                key={cur}
                title={`Pending (${cur})`}
                value={total}
                precision={2}
                prefix={cur}
              />
            ))}
            {Object.keys(totalsByCurrency).length === 0 && (
              <Statistic title="Pending Total" value={0} prefix="TZS" />
            )}
          </Space>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            Refresh
          </Button>,
        ]}
      />

      {/* Expense Review Modal */}
      <ExpenseReviewModal
        open={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setReviewExpense(null);
        }}
        expense={reviewExpense}
        actions={["pay", "return"]}
        loading={loadingExpense}
        onActionComplete={handleActionComplete}
      />
    </>
  );
}

export default function FinancePaymentsPage() {
  return (
    <App>
      <PaymentsPageContent />
    </App>
  );
}
