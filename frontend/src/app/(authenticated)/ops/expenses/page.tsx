"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  message,
  Typography,
  Modal,
  Select,
  Tooltip,
} from "antd";
import {
  ReloadOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  PlusOutlined,
  PrinterOutlined,
  HistoryOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ExpenseRequestDetailed, ExpenseStatus } from "@/types/expense";
import type { Trip } from "@/types/trip";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenses, useTrips, useInvalidateQueries } from "@/hooks/useApi";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { EmptyState } from "@/components/ui";

import { ExpenseHistoryModal } from "@/components/expenses/ExpenseHistoryModal";
import { ExpenseReviewModal } from "@/components/expenses/ExpenseReviewModal";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { TripPaymentPrintLayout } from "@/components/expenses/TripPaymentPrintLayout";
import { TripDetailDrawer } from "@/components/trips/TripDetailDrawer";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";
import { CATEGORY_FILTERS } from "@/constants/expenseConstants";

const { Title } = Typography;

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  "Pending Manager": "orange",
  "Pending Finance": "blue",
  Paid: "green",
  Rejected: "red",
  Returned: "purple",
  Voided: "red",
};

const STATUS_FILTERS = Object.keys(STATUS_COLORS).map((status) => ({
  text: status,
  value: status,
}));


export default function ExpensesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { invalidateExpenses } = useInvalidateQueries();

  // Only fetch when user is authenticated
  const isAuthenticated = !!user;

  // TanStack Query for expenses and trips data
  const { data: expensesData, isLoading: loading, refetch } = useExpenses(undefined, isAuthenticated);
  const { data: tripsData, isLoading: tripsLoading } = useTrips({ limit: 100 }, isAuthenticated);

  // Filter to show only trip expenses (NOT office expenses)
  // Office expenses start with "EX" (both old EXP- and new EX- formats)
  const expenses = useMemo(() => {
    const allExpenses = expensesData?.data || [];
    return allExpenses.filter(
      (e: ExpenseRequestDetailed) => !e.expense_number?.startsWith("EX")
    );
  }, [expensesData]);

  // Filter to active trips only for the dropdown
  const trips = useMemo(() => {
    const allTrips = tripsData?.data || [];
    return allTrips.filter(
      (t: Trip) => !["Completed", "Cancelled"].includes(t.status)
    );
  }, [tripsData]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tableFilters, setTableFilters] = useState<Record<string, any>>({});
  const [tableKey, setTableKey] = useState(0);

  const hasActiveFilters = Object.values(tableFilters).some(
    (v) => v != null && (Array.isArray(v) ? v.length > 0 : true)
  );
  const clearAllFilters = () => { setTableFilters({}); setTableKey((k) => k + 1); };

  // Trip Selection State
  const [tripSelectModalOpen, setTripSelectModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTripNumber, setSelectedTripNumber] = useState<string>("");

  // Payment Modal State

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

  // Bulk print - open print preview modal with all selected expenses
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

  // Check if print is allowed (after manager approval)
  const canPrint = (status: ExpenseStatus) => {
    return ["Pending Finance", "Paid"].includes(status);
  };

  const columns: ColumnsType<ExpenseRequestDetailed> = [
    {
      title: "Actions",
      key: "actions",
      width: 100,
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
      render: (num: string | null, record: ExpenseRequestDetailed) => (
        <a
          onClick={() => handleViewDetail(record)}
          style={{ fontWeight: 600, color: "var(--color-gold)", cursor: "pointer" }}
        >
          {num || record.id?.slice(0, 8).toUpperCase()}
        </a>
      ),
      ...getColumnSearchProps("expense_number"),
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 110,
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : "-",
      sorter: (a, b) => (a.created_at || "").localeCompare(b.created_at || ""),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 120,
      render: (category: string) => category || "-",
      ...getColumnFilterProps("category", CATEGORY_FILTERS),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (text: string) => text || "-",
      ...getColumnSearchProps("description"),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 140,
      align: "right",
      render: (amount: number, record) => {
        const cur = record.currency || "TZS";
        return (
          <div style={{ fontWeight: 600 }}>
            {cur} {Number(amount).toLocaleString("en-US")}
          </div>
        );
      },
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 275,
      render: (status: ExpenseStatus) => <ExpenseStatusBadge status={status} />,
      ...getColumnFilterProps("status", STATUS_FILTERS),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        padding: "var(--space-xl)",
      }}
    >
      <Card>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/dashboard")}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Trip Expenses
              </Title>
            </Space>
            <Space>
              {selectedRowKeys.length > 0 && (
                <Button
                  icon={<PrinterOutlined />}
                  onClick={handleBulkPrint}
                >
                  Print Selected ({selectedRowKeys.length})
                </Button>
              )}
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleNewExpense}
              >
                New Trip Expense
              </Button>
            </Space>
          </div>

          {user?.role === 'ops' && (
            <div style={{ marginBottom: 8 }}>
              <Typography.Text type="secondary">
                Showing: all trip expenses · your office expenses{' '}
                <Tooltip title="Ops users see all trip expenses and their own submitted office expenses. Managers and Finance see all office expenses.">
                  <QuestionCircleOutlined style={{ cursor: 'help' }} />
                </Tooltip>
              </Typography.Text>
            </div>
          )}

          <Table<ExpenseRequestDetailed>
            key={tableKey}
            columns={resizableColumns}
            components={components}
            dataSource={expenses}
            rowKey="id"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            scroll={{ x: "max-content" }}
            onChange={(_, filters) => setTableFilters(filters as Record<string, any>)}
            locale={{
              emptyText: hasActiveFilters ? (
                <EmptyState
                  message="No results match your filters."
                  action={{ label: "Clear Filters", onClick: clearAllFilters }}
                />
              ) : (
                <EmptyState message="No expenses found for this period." />
              ),
            }}
            rowSelection={getStandardRowSelection(
              currentPage,
              pageSize,
              selectedRowKeys,
              setSelectedRowKeys
            )}
            pagination={{
              current: currentPage,
              pageSize,
              total: expenses.length,
              showTotal: (total) => `Total ${total} expenses`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
          />
        </Space>
      </Card>

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
            label: `${trip.trip_number} - ${trip.route_name} (${trip.status})`,
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
        onSuccess={() => invalidateExpenses()}
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
    </div>
  );
}
