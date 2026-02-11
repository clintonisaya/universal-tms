"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Button,
  Space,
  Tabs,
  Tag,
  Descriptions,
  Table,
  message,
  Typography,
  Spin,
  Popconfirm,
  Alert,
  Tooltip,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { TripDetailed, TripStatus } from "@/types/trip";
import type {
  ExpenseRequest,
  ExpenseRequestCreate,
  ExpenseRequestsResponse,
  ExpenseStatus,
} from "@/types/expense";
import { useAuth } from "@/contexts/AuthContext";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { UpdateTripStatusModal } from "@/components/trips/UpdateTripStatusModal";

const { Title, Text } = Typography;

const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  Waiting: "default",
  Dispatch: "purple",
  Loading: "gold",
  "In Transit": "blue",
  "At Border": "purple",
  Offloaded: "cyan",
  Returned: "geekblue",
  "Waiting for PODs": "orange",
  Completed: "green",
  Cancelled: "red",
};

const EXPENSE_STATUS_COLORS: Record<ExpenseStatus, string> = {
  "Pending Manager": "gold",
  "Pending Finance": "blue",
  Paid: "green",
  Rejected: "red",
  Returned: "orange",
};

export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [trip, setTrip] = useState<TripDetailed | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const fetchTrip = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/trips/${tripId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data: TripDetailed = await response.json();
        setTrip(data);
      } else if (response.status === 401) {
        router.push("/login");
      } else if (response.status === 404) {
        message.error("Trip not found");
        router.push("/ops/trips");
      } else {
        message.error("Failed to fetch trip");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [tripId, router]);

  const fetchExpenses = useCallback(async () => {
    setExpensesLoading(true);
    try {
      const response = await fetch(`/api/v1/expenses/?trip_id=${tripId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data: ExpenseRequestsResponse = await response.json();
        setExpenses(data.data);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        message.error("Failed to fetch expenses");
      }
    } catch {
      message.error("Network error");
    } finally {
      setExpensesLoading(false);
    }
  }, [tripId, router]);

  useEffect(() => {
    if (!authLoading && user && tripId) {
      fetchTrip();
      fetchExpenses();
    }
  }, [authLoading, user, tripId, fetchTrip, fetchExpenses]);

  const handleDeleteExpense = async (expense: ExpenseRequest) => {
    try {
      const response = await fetch(`/api/v1/expenses/${expense.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        message.success("Expense deleted");
        fetchExpenses();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete expense");
      }
    } catch {
      message.error("Network error");
    }
  };

  // Check if trip is in a closed state (no expense modifications allowed)
  const isTripClosed = trip?.status === "Completed" || trip?.status === "Cancelled";

  const expenseColumns: ColumnsType<ExpenseRequest> = [
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number, record: any) => {
        const cur = record.currency || "TZS";
        return `${cur} ${Number(amount).toLocaleString()}`;
      },
      align: "right",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: ExpenseStatus) => (
        <Tag color={EXPENSE_STATUS_COLORS[status]}>{status}</Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string | null) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) =>
        record.status === "Pending Manager" && !isTripClosed ? (
          <div className="row-actions">
            <Popconfirm
              title="Delete expense"
              description="Are you sure?"
              onConfirm={() => handleDeleteExpense(record)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          </div>
        ) : null,
    },
  ];

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (authLoading || loading) {
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

  if (!trip) {
    return null;
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
                onClick={() => router.push("/ops/trips")}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Trip: {trip.route_name}
              </Title>
              <Tag color={TRIP_STATUS_COLORS[trip.status]}>{trip.status}</Tag>
              <Button 
                type="link" 
                onClick={() => setIsStatusModalOpen(true)}
              >
                Update Status
              </Button>
            </Space>
          </div>

          <Tabs
            defaultActiveKey="details"
            items={[
              {
                key: "details",
                label: "Details",
                children: (
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Route">
                      {trip.route_name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={TRIP_STATUS_COLORS[trip.status]}>
                        {trip.status}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Detailed Status/Location">
                      {trip.current_location || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Truck">
                      {trip.truck
                        ? `${trip.truck.plate_number} - ${trip.truck.make} ${trip.truck.model}`
                        : "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Trailer">
                      {trip.trailer
                        ? `${trip.trailer.plate_number} - ${trip.trailer.type}`
                        : "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Driver">
                      {trip.driver?.full_name || "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Start Date">
                      {trip.start_date
                        ? new Date(trip.start_date).toLocaleDateString()
                        : "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="End Date">
                      {trip.end_date
                        ? new Date(trip.end_date).toLocaleDateString()
                        : "-"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Created">
                      {trip.created_at
                        ? new Date(trip.created_at).toLocaleDateString()
                        : "-"}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: "financials",
                label: "Financials",
                children: (
                  <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                    {isTripClosed && (
                      <Alert
                        message="Trip Closed"
                        description={`This trip is ${trip.status.toLowerCase()}. No expense modifications are allowed.`}
                        type="info"
                        showIcon
                      />
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Space>
                        <Text strong>Total Expenses:</Text>
                        <Text>
                          TZS {Number(totalExpenses).toLocaleString()}
                        </Text>
                      </Space>
                      <Space>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={fetchExpenses}
                        >
                          Refresh
                        </Button>
                        <Tooltip
                          title={isTripClosed ? "Cannot add expenses to completed/cancelled trips" : ""}
                        >
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsModalOpen(true)}
                            disabled={isTripClosed}
                          >
                            Add Expense
                          </Button>
                        </Tooltip>
                      </Space>
                    </div>

                    <Table<ExpenseRequest>
                      columns={expenseColumns}
                      dataSource={expenses}
                      rowKey="id"
                      loading={expensesLoading}
                      sticky
                      pagination={false}
                      size="small"
                    />
                  </Space>
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <AddExpenseModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchExpenses}
        tripId={tripId}
      />

      <UpdateTripStatusModal
        open={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSuccess={() => {
          fetchTrip();
          fetchExpenses();
        }}
        tripId={tripId}
        initialValues={{
          status: trip.status,
          current_location: trip.current_location,
        }}
      />
    </div>
  );
}
