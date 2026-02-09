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
  Spin,
  Tabs,
  Modal,
  Select,
} from "antd";
import {
  ReloadOutlined,
  ArrowLeftOutlined,
  EyeOutlined,
  PlusOutlined,
  DollarOutlined,
  PrinterOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ExpenseRequestDetailed, ExpenseStatus } from "@/types/expense";
import type { Trip } from "@/types/trip";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenses, useTrips, useInvalidateQueries } from "@/hooks/useApi";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { PaymentModal } from "@/components/expenses/PaymentModal";
import { ExpenseHistoryModal } from "@/components/expenses/ExpenseHistoryModal";
import { ExpenseDetailModal } from "@/components/expenses/ExpenseDetailModal";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title } = Typography;

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  "Pending Manager": "orange",
  "Pending Finance": "blue",
  Paid: "green",
  Rejected: "red",
  Returned: "purple",
};

const STATUS_FILTERS = Object.keys(STATUS_COLORS).map((status) => ({
  text: status,
  value: status,
}));

const CATEGORY_FILTERS = [
  { text: "Fuel", value: "Fuel" },
  { text: "Allowance", value: "Allowance" },
  { text: "Maintenance", value: "Maintenance" },
  { text: "Office", value: "Office" },
  { text: "Border", value: "Border" },
  { text: "Other", value: "Other" },
];

const ACTIVE_STATUSES: ExpenseStatus[] = ["Pending Manager", "Pending Finance", "Returned"];
const HISTORY_STATUSES: ExpenseStatus[] = ["Paid", "Rejected"];

export default function ExpensesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { invalidateExpenses } = useInvalidateQueries();

  // Only fetch when user is authenticated
  const isAuthenticated = !!user && !authLoading;

  // TanStack Query for expenses and trips data
  const { data: expensesData, isLoading: loading, refetch } = useExpenses(isAuthenticated);
  const { data: tripsData, isLoading: tripsLoading } = useTrips({ limit: 100 }, isAuthenticated);

  // Filter to show only trip expenses (expense_number does NOT start with "EXP")
  const expenses = useMemo(() => {
    const allExpenses = expensesData?.data || [];
    return allExpenses.filter(
      (e: ExpenseRequestDetailed) => !e.expense_number?.startsWith("EXP")
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
  const [activeTab, setActiveTab] = useState<string>("active");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Trip Selection State
  const [tripSelectModalOpen, setTripSelectModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedTripNumber, setSelectedTripNumber] = useState<string>("");

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequestDetailed | null>(null);

  // History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyExpense, setHistoryExpense] = useState<ExpenseRequestDetailed | null>(null);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<ExpenseRequestDetailed | null>(null);

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

  const handlePay = (record: ExpenseRequestDetailed) => {
    setSelectedExpense(record);
    setPaymentModalOpen(true);
  };

  const handlePrint = (id: string) => {
    window.open(`/finance/vouchers/${id}`, "_blank");
  };

  const handleViewHistory = (record: ExpenseRequestDetailed) => {
    setHistoryExpense(record);
    setHistoryModalOpen(true);
  };

  const filteredExpenses = useMemo(() => {
    if (activeTab === "active") {
      return expenses.filter((e) => ACTIVE_STATUSES.includes(e.status));
    }
    return expenses.filter((e) => HISTORY_STATUSES.includes(e.status));
  }, [expenses, activeTab]);

  const columns: ColumnsType<ExpenseRequestDetailed> = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 140,
      render: (num: string | null, record: ExpenseRequestDetailed) => (
        <a
          onClick={() => handleViewDetail(record)}
          style={{ fontWeight: 600, color: "#1890ff", cursor: "pointer" }}
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
            {cur} {Number(amount).toLocaleString()}
          </div>
        );
      },
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 220,
      render: (status: ExpenseStatus) => <ExpenseStatusBadge status={status} />,
      ...getColumnFilterProps("status", STATUS_FILTERS),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<HistoryOutlined />}
              title="View History"
              onClick={() => handleViewHistory(record)}
            />

            {record.trip_id && (
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                title="View Trip"
                onClick={() => router.push(`/ops/trips/${record.trip_id}`)}
              />
            )}

            {(user?.role === "finance" || user?.role === "admin") &&
              record.status === "Pending Finance" && (
                <Button
                  type="primary"
                  size="small"
                  icon={<DollarOutlined />}
                  onClick={() => handlePay(record)}
                >
                  Pay
                </Button>
              )}

            {record.status === "Paid" && (
              <Button
                type="default"
                size="small"
                icon={<PrinterOutlined />}
                onClick={() => handlePrint(record.id)}
              />
            )}
          </Space>
        </div>
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "24px",
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

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "active",
                label: `Active (${expenses.filter((e) => ACTIVE_STATUSES.includes(e.status)).length})`,
              },
              {
                key: "history",
                label: `History (${expenses.filter((e) => HISTORY_STATUSES.includes(e.status)).length})`,
              },
            ]}
          />

          <Table<ExpenseRequestDetailed>
            columns={resizableColumns}
            components={components}
            dataSource={filteredExpenses}
            rowKey="id"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            rowSelection={getStandardRowSelection(
              currentPage,
              pageSize,
              selectedRowKeys,
              setSelectedRowKeys
            )}
            pagination={{
              current: currentPage,
              pageSize,
              total: filteredExpenses.length,
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

      <PaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={() => invalidateExpenses()}
        expense={selectedExpense}
      />

      <ExpenseHistoryModal
        open={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryExpense(null);
        }}
        expense={historyExpense}
      />

      <ExpenseDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailExpense(null);
        }}
        expense={detailExpense}
      />
    </div>
  );
}
