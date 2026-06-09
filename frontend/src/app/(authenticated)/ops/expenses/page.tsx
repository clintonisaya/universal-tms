"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ProTable,
  ProColumns,
} from "@ant-design/pro-components";
import type { ActionType } from "@ant-design/pro-components";
import {
  Button,
  Space,
  Modal,
  Select,
  Tooltip,
  App,
  Typography,
} from "antd";
import {
  ReloadOutlined,
  EyeOutlined,
  PlusOutlined,
  PrinterOutlined,
  HistoryOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import type { ExpenseRequestDetailed, ExpenseStatus } from "@/types/expense";
import type { Trip } from "@/types/trip";
import { useAuth } from "@/contexts/AuthContext";
import { useTrips, useInvalidateQueries, apiFetch } from "@/hooks/application/useApi";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { ExpenseHistoryModal } from "@/components/expenses/ExpenseHistoryModal";
import { ExpenseReviewModal } from "@/components/expenses/ExpenseReviewModal";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { TripPaymentPrintLayout } from "@/components/expenses/TripPaymentPrintLayout";
import { TripDetailDrawer } from "@/components/trips/TripDetailDrawer";
import { CATEGORY_FILTERS } from "@/constants/expenseConstants";

const STATUS_FILTERS: Record<string, { text: string }> = {
  "Pending Manager": { text: "Pending Manager" },
  "Pending Finance": { text: "Pending Finance" },
  Paid: { text: "Paid" },
  Rejected: { text: "Rejected" },
  Returned: { text: "Returned" },
  Voided: { text: "Voided" },
};

export default function ExpensesPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const { user } = useAuth();
  const { invalidateExpenses } = useInvalidateQueries();
  const actionRef = useRef<ActionType>(null);

  const isAuthenticated = !!user;

  // Trips data for trip selector dropdown (not for the main table)
  const { data: tripsData, isLoading: tripsLoading } = useTrips({ limit: 100 }, isAuthenticated);

  // Filter to active trips OR completed/cancelled trips with expense window open
  const trips = useMemo(() => {
    const allTrips = tripsData?.data || [];
    return allTrips.filter(
      (t: Trip) =>
        !["Completed", "Cancelled"].includes(t.status) || t.expense_window_open
    );
  }, [tripsData]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Trip Selection State
  const [tripSelectModalOpen, setTripSelectModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTripNumber, setSelectedTripNumber] = useState<string>("");

  // History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyExpense, setHistoryExpense] = useState<ExpenseRequestDetailed | null>(null);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<ExpenseRequestDetailed | null>(null);

  // Print Preview Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printExpenseIds, setPrintExpenseIds] = useState<string[]>([]);

  // Trip Detail Drawer State
  const [tripDrawerOpen, setTripDrawerOpen] = useState(false);
  const [selectedTripIdForView, setSelectedTripIdForView] = useState<string | null>(null);

  const handleViewDetail = (record: ExpenseRequestDetailed) => {
    setDetailExpense(record);
    setDetailModalOpen(true);
  };

  const handleNewExpense = () => {
    setTripSelectModalOpen(true);
  };

  const handleTripSelected = () => {
    if (!selectedTripId) {
      message.warning("Please select a trip");
      return;
    }
    const trip = trips.find((t) => t.id === selectedTripId);
    setSelectedTripNumber(trip?.trip_number || "");
    setTripSelectModalOpen(false);
    setIsModalOpen(true);
  };

  const handlePrint = (id: string) => {
    setPrintExpenseIds([id]);
    setPrintModalOpen(true);
  };

  const handleBulkPrint = () => {
    if (selectedRowKeys.length === 0) {
      message.warning("Please select expenses to print");
      return;
    }
    setPrintExpenseIds(selectedRowKeys as string[]);
    setPrintModalOpen(true);
  };

  const handleViewHistory = (record: ExpenseRequestDetailed) => {
    setHistoryExpense(record);
    setHistoryModalOpen(true);
  };

  const handleViewTrip = (tripId: string) => {
    setSelectedTripIdForView(tripId);
    setTripDrawerOpen(true);
  };

  const canPrint = (status: ExpenseStatus) => {
    return ["Pending Finance", "Paid"].includes(status);
  };

  const categoryValueEnum: Record<string, { text: string }> = {};
  CATEGORY_FILTERS.forEach((f) => {
    categoryValueEnum[f.value] = { text: f.text };
  });

  const columns: ProColumns<ExpenseRequestDetailed>[] = [
    {
      title: "Actions",
      key: "actions",
      width: 100,
      valueType: "option",
      search: false,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<HistoryOutlined />}
            title="View History"
            aria-label="View Expense History"
            onClick={() => handleViewHistory(record)}
          />
          {record.trip_id && (
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              title="View Trip"
              aria-label="View Trip"
              onClick={() => handleViewTrip(record.trip_id!)}
            />
          )}
          {canPrint(record.status) && (
            <Button
              type="text"
              size="small"
              icon={<PrinterOutlined />}
              title="Print Voucher"
              aria-label="Print Expense Voucher"
              onClick={() => handlePrint(record.id)}
            />
          )}
        </Space>
      ),
    },
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 180,
      fieldProps: { placeholder: "Search expense number" },
      render: (_, record) => (
        <a
          onClick={() => handleViewDetail(record)}
          style={{ fontWeight: 600, color: "var(--color-gold)", cursor: "pointer" }}
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
      sorter: true,
      search: false,
      render: (_, record) => record.created_at ? new Date(record.created_at).toLocaleDateString() : "-",
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 120,
      valueType: "select",
      valueEnum: categoryValueEnum,
      render: (_, record) => record.category || "-",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      fieldProps: { placeholder: "Search description" },
      render: (_, record) => record.description || "-",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      align: "right",
      sorter: true,
      search: false,
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
      width: 275,
      valueType: "select",
      valueEnum: STATUS_FILTERS,
      render: (_, record) => <ExpenseStatusBadge status={record.status} />,
    },
  ];

  return (
    <>
      <ProTable<ExpenseRequestDetailed>
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        request={async (params) => {
          const { current, pageSize, category, status, ...rest } = params;
          const skip = ((current || 1) - 1) * (pageSize || 20);
          const qs = new URLSearchParams();
          qs.set("skip", String(skip));
          qs.set("limit", String(pageSize || 20));
          if (category) qs.set("category", category as string);
          if (status) qs.set("status", status as string);
          const data = await apiFetch<{ data: ExpenseRequestDetailed[]; count: number }>(`/api/v1/expenses?${qs.toString()}`);
          // Filter out office expenses (they start with "EX")
          const filtered = (data.data || []).filter(
            (e) => !e.expense_number?.startsWith("EX")
          );
          return {
            data: filtered,
            total: data.count || 0,
            success: true,
          };
        }}
        search={{ labelWidth: "auto" }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showTotal: (total) => `Total ${total} expenses`,
        }}
        scroll={{ x: "max-content" }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        headerTitle={
          <div>
            <span>Trip Expenses</span>
            {user?.role === "ops" && (
              <div style={{ marginTop: 4 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Showing: all trip expenses · your office expenses{" "}
                  <Tooltip title="Ops users see all trip expenses and their own submitted office expenses. Managers and Finance see all office expenses.">
                    <QuestionCircleOutlined style={{ cursor: "help" }} />
                  </Tooltip>
                </Typography.Text>
              </div>
            )}
          </div>
        }
        toolBarRender={() => [
          selectedRowKeys.length > 0 && (
            <Button
              key="print"
              icon={<PrinterOutlined />}
              onClick={handleBulkPrint}
            >
              Print Selected ({selectedRowKeys.length})
            </Button>
          ),
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => actionRef.current?.reload()}
          >
            Refresh
          </Button>,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleNewExpense}
          >
            New Trip Expense
          </Button>,
        ]}
      />

      {/* Trip Selection Modal */}
      <Modal
        title="Select Trip for Expense"
        open={tripSelectModalOpen}
        width={600}
        onCancel={() => {
          setTripSelectModalOpen(false);
          setSelectedTripId(null);
        }}
        onOk={handleTripSelected}
        okText="Continue"
        cancelText="Cancel"
      >
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">
            Select the trip to add expense for:
          </Typography.Text>
        </div>
        <Select
          showSearch
          style={{ width: "100%" }}
          placeholder="Search and select a trip"
          optionFilterProp="label"
          loading={tripsLoading}
          value={selectedTripId}
          onChange={setSelectedTripId}
          options={trips.map((trip) => ({
            label: `${trip.trip_number} - ${trip.route_name} (${trip.status})${
              ["Completed", "Cancelled"].includes(trip.status) && trip.expense_window_open
                ? " [Expenses Open]"
                : ""
            }`,
            value: trip.id,
          }))}
          allowClear
        />
      </Modal>

      <AddExpenseModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTripId(null);
          setSelectedTripNumber("");
        }}
        onSuccess={() => {
          actionRef.current?.reload();
        }}
        tripId={selectedTripId}
        tripNumber={selectedTripNumber}
      />

      <ExpenseHistoryModal
        open={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryExpense(null);
        }}
        expense={historyExpense}
      />

      <ExpenseReviewModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailExpense(null);
        }}
        expense={detailExpense}
      />

      <TripPaymentPrintLayout
        open={printModalOpen}
        onClose={() => {
          setPrintModalOpen(false);
          setPrintExpenseIds([]);
        }}
        expenseIds={printExpenseIds}
      />

      <TripDetailDrawer
        open={tripDrawerOpen}
        onClose={() => {
          setTripDrawerOpen(false);
          setSelectedTripIdForView(null);
        }}
        tripId={selectedTripIdForView}
      />
    </>
  );
}
