"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Collapse,
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
import type { TripDetailed, TripStatus, PodDocument } from "@/types/trip";
import type { Waybill } from "@/types/waybill";
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
import { TripStatusTag } from "@/components/ui/TripStatusTag";

const { Title, Text } = Typography;
const { TextArea } = Input;


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

  // Attach Return Waybill state (Story 2.25)
  const [isAttachWaybillOpen, setIsAttachWaybillOpen] = useState(false);
  const [openWaybills, setOpenWaybills] = useState<Waybill[]>([]);
  const [loadingWaybills, setLoadingWaybills] = useState(false);
  const [selectedReturnWaybillId, setSelectedReturnWaybillId] = useState<string | null>(null);
  const [attachingWaybill, setAttachingWaybill] = useState(false);

  // Border crossings state (Story 2.26)
  const [borderCrossings, setBorderCrossings] = useState<any[]>([]);
  const [loadingCrossings, setLoadingCrossings] = useState(false);

  // Cancellation modal state (Story 2.25 — dual waybill cancel)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelGoWaybill, setCancelGoWaybill] = useState(true);
  const [cancelReturnWaybill, setCancelReturnWaybill] = useState(true);
  const [cancelling, setCancelling] = useState(false);

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

  const fetchBorderCrossings = useCallback(async () => {
    if (!tripId) return;
    setLoadingCrossings(true);
    try {
      const res = await fetch(`/api/v1/trips/${tripId}/border-crossings`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setBorderCrossings(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingCrossings(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (open && tripId) {
      fetchTrip();
      fetchExpenses();
      fetchBorderCrossings();
    }
    if (!open) {
      setTrip(null);
      setExpenses([]);
      setBorderCrossings([]);
    }
  }, [open, tripId, fetchTrip, fetchExpenses, fetchBorderCrossings]);

  // Story 2.25: Fetch open waybills for the return waybill selector
  const fetchOpenWaybills = async () => {
    setLoadingWaybills(true);
    try {
      const res = await fetch("/api/v1/waybills?status=Open&limit=200", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        // Filter out current trip's go waybill
        const filtered = (data.data as Waybill[]).filter(
          (wb) => wb.id !== trip?.waybill_id
        );
        setOpenWaybills(filtered);
      }
    } catch {
      message.error("Failed to fetch waybills");
    } finally {
      setLoadingWaybills(false);
    }
  };

  const handleOpenAttachWaybill = () => {
    setSelectedReturnWaybillId(null);
    setIsAttachWaybillOpen(true);
    fetchOpenWaybills();
  };

  const handleAttachReturnWaybill = async () => {
    if (!selectedReturnWaybillId || !tripId) return;
    setAttachingWaybill(true);
    try {
      const res = await fetch(`/api/v1/trips/${tripId}/attach-return-waybill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ return_waybill_id: selectedReturnWaybillId }),
      });
      if (res.ok) {
        message.success("Return waybill attached successfully");
        setIsAttachWaybillOpen(false);
        fetchTrip();
      } else {
        const error = await res.json();
        message.error(error.detail || "Failed to attach return waybill");
      }
    } catch {
      message.error("Network error");
    } finally {
      setAttachingWaybill(false);
    }
  };

  // Story 2.25: Handle trip cancellation with dual-waybill selection
  const handleCancelTrip = async () => {
    if (!tripId) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/v1/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: "Cancelled",
          cancel_go_waybill: cancelGoWaybill,
          cancel_return_waybill: cancelReturnWaybill,
        }),
      });
      if (res.ok) {
        message.success("Trip cancelled");
        setIsCancelModalOpen(false);
        fetchTrip();
      } else {
        const error = await res.json();
        message.error(error.detail || "Failed to cancel trip");
      }
    } catch {
      message.error("Network error");
    } finally {
      setCancelling(false);
    }
  };

  const openCancelModal = () => {
    setCancelGoWaybill(true);
    setCancelReturnWaybill(true);
    setIsCancelModalOpen(true);
  };

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
              <Button type="text" danger icon={<DeleteOutlined />} size="small" aria-label="Delete Expense" />
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
              <TripStatusTag status={trip.status} />
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
            <Space>
              {trip.status === "Offloading" && !trip.return_waybill_id && (
                <Button type="default" onClick={handleOpenAttachWaybill}>
                  Attach Return Waybill
                </Button>
              )}
              {trip.status !== "Completed" && trip.status !== "Cancelled" && (
                <Button danger onClick={openCancelModal}>
                  Cancel Trip
                </Button>
              )}
              <Button type="link" onClick={() => setIsStatusModalOpen(true)}>
                Update Status
              </Button>
            </Space>
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
                  <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="Route">
                        {trip.route_name}
                      </Descriptions.Item>
                      <Descriptions.Item label="Direction">
                        <Tag color={trip.return_waybill_id ? "geekblue" : "default"}>
                          {trip.return_waybill_id ? "Return" : "Go"}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Status">
                        <TripStatusTag status={trip.status} />
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

                    {/* Go Waybill section */}
                    {trip.waybill_id && (
                      <Descriptions
                        title={<Text strong style={{ color: "#1677ff" }}>Go Waybill</Text>}
                        bordered
                        column={2}
                        size="small"
                      >
                        <Descriptions.Item label="Waybill ID" span={2}>
                          <Text code>{trip.waybill_id}</Text>
                        </Descriptions.Item>
                        {trip.dispatch_date && (
                          <Descriptions.Item label="Dispatched">
                            {new Date(trip.dispatch_date).toLocaleString()}
                          </Descriptions.Item>
                        )}
                        {trip.arrival_loading_date && (
                          <Descriptions.Item label="Arrival Loading">
                            {new Date(trip.arrival_loading_date).toLocaleString()}
                          </Descriptions.Item>
                        )}
                        {trip.offloading_date && (
                          <Descriptions.Item label="Offloading">
                            {new Date(trip.offloading_date).toLocaleString()}
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    )}

                    {/* Return Waybill section (Story 2.25) */}
                    {trip.return_waybill_id && (
                      <Descriptions
                        title={<Text strong style={{ color: "#52c41a" }}>Return Waybill</Text>}
                        bordered
                        column={2}
                        size="small"
                      >
                        <Descriptions.Item label="Waybill ID" span={2}>
                          <Text code>{trip.return_waybill_id}</Text>
                        </Descriptions.Item>
                        {trip.arrival_loading_return_date && (
                          <Descriptions.Item label="Arrival at Return Loading">
                            {new Date(trip.arrival_loading_return_date).toLocaleString()}
                          </Descriptions.Item>
                        )}
                        {trip.loading_return_start_date && (
                          <Descriptions.Item label="Loading Started">
                            {new Date(trip.loading_return_start_date).toLocaleString()}
                          </Descriptions.Item>
                        )}
                        {trip.loading_return_end_date && (
                          <Descriptions.Item label="Loading Completed">
                            {new Date(trip.loading_return_end_date).toLocaleString()}
                          </Descriptions.Item>
                        )}
                        {trip.arrival_return_date && (
                          <Descriptions.Item label="Returned to Yard">
                            {new Date(trip.arrival_return_date).toLocaleString()}
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    )}

                    {/* POD Documents — grouped by leg (Story 2.25) */}
                    {trip.pod_documents && trip.pod_documents.length > 0 && (() => {
                      const goPods = trip.pod_documents.filter(
                        (d) => typeof d === "string" || (d as any).leg === "go" || !(d as any).leg
                      );
                      const returnPods = trip.pod_documents.filter(
                        (d) => typeof d !== "string" && (d as any).leg === "return"
                      );
                      const getDocName = (d: PodDocument) =>
                        typeof d === "string" ? d : d.name;
                      const getDocUrl = (d: PodDocument) =>
                        typeof d === "string" ? d : d.url;
                      return (
                        <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                          {goPods.length > 0 && (
                            <div>
                              <Text strong>Go PODs</Text>
                              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                                {goPods.map((d, i) => (
                                  <li key={i}>
                                    <a href={getDocUrl(d)} target="_blank" rel="noreferrer">
                                      {getDocName(d)}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {returnPods.length > 0 && (
                            <div>
                              <Text strong style={{ color: "#52c41a" }}>Return PODs</Text>
                              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                                {returnPods.map((d, i) => (
                                  <li key={i}>
                                    <a href={getDocUrl(d)} target="_blank" rel="noreferrer">
                                      {getDocName(d)}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </Space>
                      );
                    })()}
                  </Space>
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
              {
                key: "border-crossings",
                label: `Border Crossings${borderCrossings.length > 0 ? ` (${borderCrossings.length})` : ""}`,
                children: (
                  <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                    {loadingCrossings ? (
                      <div style={{ textAlign: "center", padding: 24 }}>
                        <Spin />
                      </div>
                    ) : borderCrossings.length === 0 ? (
                      <Text type="secondary">No border crossings recorded for this trip.</Text>
                    ) : (
                      <Collapse
                        items={borderCrossings.map((crossing: any) => {
                          const bp = crossing.border_post;
                          const isGo = crossing.direction === "go";
                          const sideALabel = isGo ? bp?.side_a_name : bp?.side_b_name;
                          const sideBLabel = isGo ? bp?.side_b_name : bp?.side_a_name;

                          const dateFields = [
                            { field: "arrived_side_a_at", label: `Arrived at ${sideALabel}` },
                            { field: "documents_submitted_side_a_at", label: `Documents Submitted at ${sideALabel}` },
                            { field: "documents_cleared_side_a_at", label: `Documents Cleared at ${sideALabel}` },
                            { field: "arrived_side_b_at", label: `Crossed ${sideALabel} (= Arrive at ${sideBLabel})` },
                            { field: "departed_border_at", label: "Departed Border Zone" },
                          ];

                          const filledCount = dateFields.filter((df) => crossing[df.field]).length;
                          const completionTag =
                            filledCount === 5 ? (
                              <Tag color="success">Complete</Tag>
                            ) : filledCount > 0 ? (
                              <Tag color="warning">In Progress ({filledCount}/5)</Tag>
                            ) : (
                              <Tag color="default">Pending</Tag>
                            );

                          return {
                            key: crossing.id,
                            label: (
                              <Space>
                                <strong>{bp?.display_name || "Unknown Border"}</strong>
                                <Tag color={isGo ? "default" : "geekblue"}>
                                  {isGo ? "Go" : "Return"}
                                </Tag>
                                {completionTag}
                              </Space>
                            ),
                            children: (
                              <Descriptions bordered column={1} size="small">
                                {dateFields.map((df) => (
                                  <Descriptions.Item key={df.field} label={df.label}>
                                    {crossing[df.field]
                                      ? new Date(crossing[df.field]).toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                        })
                                      : "—"}
                                  </Descriptions.Item>
                                ))}
                              </Descriptions>
                            ),
                          };
                        })}
                      />
                    )}
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
            return_waybill_id: trip.return_waybill_id,
          }}
        />
      )}

      {/* Story 2.25: Attach Return Waybill Modal */}
      <Modal
        title="Attach Return Waybill"
        open={isAttachWaybillOpen}
        onCancel={() => setIsAttachWaybillOpen(false)}
        onOk={handleAttachReturnWaybill}
        okText="Attach Waybill"
        confirmLoading={attachingWaybill}
        okButtonProps={{ disabled: !selectedReturnWaybillId }}
        width={700}
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Text type="secondary">
            Select an open waybill to attach as the return leg for this trip.
          </Text>
          {loadingWaybills ? (
            <Spin />
          ) : openWaybills.length === 0 ? (
            <Text type="secondary">No open waybills available.</Text>
          ) : (
            <Table
              size="small"
              dataSource={openWaybills}
              rowKey="id"
              pagination={false}
              scroll={{ y: 300 }}
              rowSelection={{
                type: "radio",
                selectedRowKeys: selectedReturnWaybillId ? [selectedReturnWaybillId] : [],
                onChange: (keys) => setSelectedReturnWaybillId(keys[0] as string),
              }}
              columns={[
                { title: "Waybill #", dataIndex: "waybill_number", key: "wbn", width: 130 },
                { title: "Client", dataIndex: "client_name", key: "client", ellipsis: true },
                {
                  title: "Route",
                  key: "route",
                  render: (_: unknown, r: Waybill) => `${r.origin} → ${r.destination}`,
                  ellipsis: true,
                },
                {
                  title: "Rate",
                  key: "rate",
                  width: 110,
                  render: (_: unknown, r: Waybill) =>
                    `${r.currency} ${Number(r.agreed_rate).toLocaleString()}`,
                },
              ]}
            />
          )}
        </Space>
      </Modal>

      {/* Story 2.25: Cancel Trip Modal — dual waybill selection */}
      <Modal
        title="Cancel Trip"
        open={isCancelModalOpen}
        onCancel={() => setIsCancelModalOpen(false)}
        onOk={handleCancelTrip}
        okText="Confirm Cancel"
        okButtonProps={{ danger: true }}
        confirmLoading={cancelling}
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Text>
            Are you sure you want to cancel this trip?
          </Text>
          {trip?.return_waybill_id ? (
            <>
              <Text type="secondary">This trip has 2 waybills. Select which to reset to Open:</Text>
              <Space orientation="vertical">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={cancelGoWaybill}
                    onChange={(e) => setCancelGoWaybill(e.target.checked)}
                  />
                  <span>Go Waybill (reset to Open)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={cancelReturnWaybill}
                    onChange={(e) => setCancelReturnWaybill(e.target.checked)}
                  />
                  <span>Return Waybill (reset to Open)</span>
                </label>
              </Space>
            </>
          ) : (
            <Text type="secondary">The linked waybill will be reset to Open.</Text>
          )}
        </Space>
      </Modal>

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
