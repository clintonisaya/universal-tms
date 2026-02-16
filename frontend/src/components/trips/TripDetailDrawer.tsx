"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Drawer,
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
  Modal,
  Form,
  Input,
  Radio,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RollbackOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { TripDetailed, TripStatus } from "@/types/trip";
import type {
  ExpenseRequest,
  ExpenseRequestsResponse,
  ExpenseStatus,
  PaymentMethod,
} from "@/types/expense";
import { useAuth } from "@/contexts/AuthContext";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { UpdateTripStatusModal } from "@/components/trips/UpdateTripStatusModal";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";

const { Title, Text } = Typography;
const { TextArea } = Input;

const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  Waiting: "default",
  Dispatch: "purple",
  "Wait to Load": "lime",
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

interface TripDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  tripId: string | null;
}

export function TripDetailDrawer({ open, onClose, tripId }: TripDetailDrawerProps) {
  const { user } = useAuth();

  const [trip, setTrip] = useState<TripDetailed | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Inline approval state
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"Returned" | "Rejected" | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalExpenseId, setApprovalExpenseId] = useState<string | null>(null);
  const [approvalProcessing, setApprovalProcessing] = useState(false);

  // Inline payment state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentExpense, setPaymentExpense] = useState<ExpenseRequest | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentForm] = Form.useForm();
  const paymentMethod = Form.useWatch("method", paymentForm);

  const fetchTrip = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/trips/${tripId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data: TripDetailed = await response.json();
        setTrip(data);
      } else {
        message.error("Failed to fetch trip");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  const fetchExpenses = useCallback(async () => {
    if (!tripId) return;
    setExpensesLoading(true);
    try {
      const response = await fetch(`/api/v1/expenses/?trip_id=${tripId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data: ExpenseRequestsResponse = await response.json();
        setExpenses(data.data);
      } else {
        message.error("Failed to fetch expenses");
      }
    } catch {
      message.error("Network error");
    } finally {
      setExpensesLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (open && tripId) {
      fetchTrip();
      fetchExpenses();
    }
    if (!open) {
      setTrip(null);
      setExpenses([]);
    }
  }, [open, tripId, fetchTrip, fetchExpenses]);

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

  // Inline approve
  const handleApprove = async (expenseId: string) => {
    setApprovalProcessing(true);
    try {
      const response = await fetch("/api/v1/expenses/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ids: [expenseId],
          status: "Pending Finance",
        }),
      });

      if (response.ok) {
        message.success("Expense approved");
        fetchExpenses();
      } else {
        const error = await response.json();
        message.error(error.detail || "Approval failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setApprovalProcessing(false);
    }
  };

  // Inline return/reject
  const openApprovalModal = (expenseId: string, action: "Returned" | "Rejected") => {
    setApprovalExpenseId(expenseId);
    setApprovalAction(action);
    setApprovalComment("");
    setApprovalModalVisible(true);
  };

  const handleReturnReject = async () => {
    if (!approvalExpenseId || !approvalAction) return;
    setApprovalProcessing(true);
    try {
      const response = await fetch("/api/v1/expenses/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ids: [approvalExpenseId],
          status: approvalAction,
          comment: approvalComment,
        }),
      });

      if (response.ok) {
        message.success(`Expense ${approvalAction.toLowerCase()}`);
        setApprovalModalVisible(false);
        fetchExpenses();
      } else {
        const error = await response.json();
        message.error(error.detail || "Operation failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setApprovalProcessing(false);
    }
  };

  // Inline payment
  const openPaymentModal = (expense: ExpenseRequest) => {
    setPaymentExpense(expense);
    paymentForm.resetFields();
    paymentForm.setFieldsValue({ method: "CASH" });
    setPaymentModalVisible(true);
  };

  const handlePayment = async (values: { method: PaymentMethod; reference?: string }) => {
    if (!paymentExpense) return;
    setPaymentProcessing(true);
    try {
      const body: { method: string; reference?: string } = {
        method: values.method,
      };
      if (values.method === "TRANSFER" && values.reference) {
        body.reference = values.reference;
      }

      const response = await fetch(
        `/api/v1/expenses/${paymentExpense.id}/payment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );

      if (response.ok) {
        message.success("Payment processed");
        setPaymentModalVisible(false);
        setPaymentExpense(null);
        paymentForm.resetFields();
        fetchExpenses();
      } else {
        const error = await response.json();
        message.error(error.detail || "Payment failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const userRole = user?.role;
  const isManager = userRole === "manager" || user?.is_superuser;
  const isFinance = userRole === "finance" || user?.is_superuser;

  const expenseColumns: ColumnsType<ExpenseRequest> = [
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 150, 
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
        return `${cur} ${Number(amount).toLocaleString("en-US")}`;
      },
      align: "right",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 200,
      render: (status: ExpenseStatus) => <ExpenseStatusBadge status={status} compact />,
    },
    {
      title: "Actions",
      key: "actions",
      width: 300,
      render: (_, record) => (
        <Space size="small" wrap className="row-actions">
          {/* Manager actions for Pending Manager */}
          {isManager && record.status === "Pending Manager" && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record.id)}
                loading={approvalProcessing}
              >
                Approve
              </Button>
              <Button
                size="small"
                danger
                icon={<RollbackOutlined />}
                onClick={() => openApprovalModal(record.id, "Returned")}
              >
                Return
              </Button>
              <Button
                size="small"
                danger
                type="dashed"
                icon={<CloseCircleOutlined />}
                onClick={() => openApprovalModal(record.id, "Rejected")}
              >
                Reject
              </Button>
            </>
          )}
          {/* Finance actions for Pending Finance */}
          {isFinance && record.status === "Pending Finance" && (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => openPaymentModal(record)}
            >
              Pay
            </Button>
          )}
          {/* Delete for Pending Manager */}
          {record.status === "Pending Manager" && (
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
          )}
        </Space>
      ),
    },
  ];

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <Drawer
        title={
          trip ? (
            <Space>
              <span>Trip: {trip.route_name}</span>
              <Tag color={TRIP_STATUS_COLORS[trip.status]}>{trip.status}</Tag>
            </Space>
          ) : (
            "Trip Details"
          )
        }
        open={open}
        onClose={onClose}
        styles={{ wrapper: { width: 1200 } }}
        destroyOnHidden={false}
        extra={
          trip && (
            <Button type="link" onClick={() => setIsStatusModalOpen(true)}>
              Update Status
            </Button>
          )
        }
      >
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
            <Spin size="large" />
          </div>
        ) : !trip ? (
          <div style={{ textAlign: "center", padding: 50 }}>Trip not found</div>
        ) : (
          <Tabs
            defaultActiveKey="details"
            items={[
              {
                key: "details",
                label: "Details",
                children: (
                  <Descriptions bordered column={2} size="small">
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
                          TZS {Number(totalExpenses).toLocaleString("en-US")}
                        </Text>
                      </Space>
                      <Space>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={fetchExpenses}
                          size="small"
                        >
                          Refresh
                        </Button>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setIsAddExpenseOpen(true)}
                          size="small"
                        >
                          Add Expense
                        </Button>
                      </Space>
                    </div>

                    <Table<ExpenseRequest>
                      columns={expenseColumns}
                      dataSource={expenses}
                      rowKey="id"
                      loading={expensesLoading}
                      pagination={false}
                      size="small"
                    />
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* Add Expense Modal */}
      {tripId && (
        <AddExpenseModal
          open={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          onSuccess={fetchExpenses}
          tripId={tripId}
        />
      )}

      {/* Update Trip Status Modal */}
      {tripId && trip && (
        <UpdateTripStatusModal
          open={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          onSuccess={fetchTrip}
          tripId={tripId}
          initialValues={{
            status: trip.status,
            current_location: trip.current_location,
          }}
        />
      )}

      {/* Inline Return/Reject Comment Modal */}
      <Modal
        title={`${approvalAction} Expense`}
        open={approvalModalVisible}
        onOk={handleReturnReject}
        onCancel={() => {
          setApprovalModalVisible(false);
          setApprovalComment("");
        }}
        confirmLoading={approvalProcessing}
        okText={`Confirm ${approvalAction}`}
        okButtonProps={{ danger: true }}
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Text>Please provide a reason:</Text>
          <TextArea
            rows={3}
            value={approvalComment}
            onChange={(e) => setApprovalComment(e.target.value)}
            placeholder="e.g. Missing receipt, Duplicate entry..."
          />
        </Space>
      </Modal>

      {/* Inline Payment Modal */}
      <Modal
        title={`Process Payment — ${paymentExpense?.description || ""}`}
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false);
          setPaymentExpense(null);
          paymentForm.resetFields();
        }}
        footer={null}
        forceRender
      >
        {paymentExpense && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Amount: </Text>
            <Text strong>
              {paymentExpense.currency || "TZS"} {Number(paymentExpense.amount).toLocaleString("en-US")}
            </Text>
          </div>
        )}

        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handlePayment}
          initialValues={{ method: "CASH" }}
        >
          <Form.Item
            name="method"
            label="Payment Method"
            rules={[{ required: true }]}
          >
            <Radio.Group>
              <Radio.Button value="CASH">Cash</Radio.Button>
              <Radio.Button value="TRANSFER">Transfer</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {paymentMethod === "TRANSFER" && (
            <Form.Item
              name="reference"
              label="Reference Number"
              rules={[
                { required: true, message: "Reference is required for transfers" },
              ]}
            >
              <Input placeholder="e.g. Bank Transaction ID" />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  setPaymentModalVisible(false);
                  setPaymentExpense(null);
                  paymentForm.resetFields();
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={paymentProcessing}>
                Confirm Payment
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
