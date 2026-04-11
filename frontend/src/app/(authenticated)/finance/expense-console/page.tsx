"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Select,
  DatePicker,
  Input,
  Typography,
  message,
} from "antd";
import {
  ReloadOutlined,
  ArrowLeftOutlined,
  StopOutlined,
  PaperClipOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { getStandardRowSelection } from "@/components/ui/tableUtils";
import type { ExpenseRequestDetailed, ExpenseStatus } from "@/types/expense";
import { useExpenses, useInvalidateQueries } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { VoidExpenseModal } from "@/components/expenses/VoidExpenseModal";
import { AmendAttachmentModal } from "@/components/expenses/AmendAttachmentModal";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;

const ALL_STATUSES: ExpenseStatus[] = [
  "Pending Manager",
  "Pending Finance",
  "Paid",
  "Rejected",
  "Returned",
  "Voided",
];

export default function ExpenseConsolePage() {
  const router = useRouter();
  const { hasAnyPermission, hasFullAccess } = usePermissions();
  const { data, isLoading, refetch } = useExpenses();
  const { invalidateExpenses } = useInvalidateQueries();

  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequestDetailed | null>(null);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus[]>([]);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [searchText, setSearchText] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Permission gate
  useEffect(() => {
    if (!hasAnyPermission("expenses:audit-console") && !hasFullAccess) {
      message.error("Access denied");
      router.push("/dashboard");
    }
  }, [hasAnyPermission, hasFullAccess, router]);

  const expenses: ExpenseRequestDetailed[] = (data?.data ?? []) as ExpenseRequestDetailed[];

  const getExpenseType = (expenseNumber: string | null): string => {
    if (!expenseNumber) return "Trip";
    return expenseNumber.startsWith("EX") ? "Office" : "Trip";
  };

  const filtered = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return expenses.filter((exp) => {
      if (statusFilter.length > 0 && !statusFilter.includes(exp.status)) return false;
      if (typeFilter && getExpenseType(exp.expense_number) !== typeFilter) return false;
      if (dateRange && dateRange[0] && dateRange[1]) {
        const created = exp.created_at ? dayjs(exp.created_at) : null;
        if (!created || created.isBefore(dateRange[0], "day") || created.isAfter(dateRange[1], "day")) return false;
      }
      if (search && !(exp.expense_number ?? "").toLowerCase().includes(search)) return false;
      return true;
    });
  }, [expenses, statusFilter, typeFilter, dateRange, searchText]);

  const canVoid = hasAnyPermission("expenses:void");
  const canAmendAttachment = hasAnyPermission("expenses:amend-attachment");

  const columns: ColumnsType<ExpenseRequestDetailed> = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      render: (val: string | null) => val ?? "—",
      width: 200,
    },
    {
      title: "Type",
      key: "type",
      width: 80,
      render: (_, record) => {
        const t = getExpenseType(record.expense_number);
        return <StatusBadge status={t} colorKey={t === "Office" ? "blue" : "cyan"} />;
      },
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 110,
    },
    {
      title: "Amount",
      key: "amount",
      width: 120,
      render: (_, record) =>
        `${record.currency ?? "USD"} ${record.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      title: "Status",
      key: "status",
      width: 275,
      render: (_, record) => <ExpenseStatusBadge status={record.status} />,
    },
    {
      title: "Submitted By",
      key: "submitted_by",
      width: 140,
      render: (_, record) => record.created_by?.full_name ?? record.created_by?.username ?? "—",
    },
    {
      title: "Date",
      key: "date",
      width: 110,
      render: (_, record) =>
        record.created_at ? dayjs(record.created_at).format("DD MMM YYYY") : "—",
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: canVoid && canAmendAttachment ? 200 : canVoid || canAmendAttachment ? 120 : 0,
      render: (_, record) => (
        <Space>
          {canVoid && record.status !== "Voided" && record.status !== "Rejected" && record.status !== "Pending Manager" && (
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
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/dashboard")}>
          Back
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          Expense Console
        </Title>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Search expense number"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            mode="multiple"
            placeholder="Filter by status"
            style={{ minWidth: 220 }}
            options={ALL_STATUSES.map((s) => ({ label: s, value: s }))}
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
          />
          <Select
            placeholder="Filter by type"
            style={{ width: 140 }}
            options={[
              { label: "Trip", value: "Trip" },
              { label: "Office", value: "Office" },
            ]}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v ?? null)}
            allowClear
          />
          <RangePicker
            value={dateRange as any}
            onChange={(vals) => setDateRange(vals as any)}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              invalidateExpenses();
              refetch();
            }}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      <Card>
        <Table<ExpenseRequestDetailed>
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          rowSelection={getStandardRowSelection(
            currentPage,
            pageSize,
            selectedRowKeys,
            setSelectedRowKeys
          )}
          loading={isLoading}
          scroll={{ x: 1000 }}
          pagination={{
            current: currentPage,
            pageSize,
            total: filtered.length,
            showTotal: (total) => `Total ${total} expenses`,
            showSizeChanger: true,
            pageSizeOptions: ["20", "50", "100"],
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          size="small"
        />
      </Card>

      <VoidExpenseModal
        expense={selectedExpense}
        open={voidModalOpen}
        onClose={() => setVoidModalOpen(false)}
        onSuccess={() => {
          setVoidModalOpen(false);
          invalidateExpenses();
        }}
      />

      <AmendAttachmentModal
        expense={selectedExpense}
        open={attachmentModalOpen}
        onClose={() => setAttachmentModalOpen(false)}
      />
    </div>
  );
}
