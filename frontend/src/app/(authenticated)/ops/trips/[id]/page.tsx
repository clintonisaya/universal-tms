"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Button,
  Space,
  Tabs,
  Descriptions,
  Table,
  message,
  Typography,
  Spin,
  Popconfirm,
  Alert,
  Tooltip,
  Upload,
  Breadcrumb,
} from "antd";
import type { UploadFile } from "antd";
import Link from "next/link";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { TripDetailed, TripStatus } from "@/types/trip";
import type { Waybill } from "@/types/waybill";
import type {
  ExpenseRequest,
  ExpenseRequestCreate,
  ExpenseRequestsResponse,
  ExpenseStatus,
} from "@/types/expense";
import { useAuth } from "@/contexts/AuthContext";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { UpdateTripStatusModal } from "@/components/trips/UpdateTripStatusModal";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { TripStatusTag } from "@/components/ui/TripStatusTag";

const { Title, Text } = Typography;


export default function TripDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;
  const { user } = useAuth();

  interface TripAttachment { key: string; filename: string; url: string; }

  const [trip, setTrip] = useState<TripDetailed | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [returnWaybill, setReturnWaybill] = useState<Waybill | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(2500);
  const [displayCurrency, setDisplayCurrency] = useState<"TZS" | "USD">("TZS");
  const [loading, setLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Attachments
  const [tripAttachments, setTripAttachments] = useState<TripAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deletingAttachmentKey, setDeletingAttachmentKey] = useState<string | null>(null);

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

  // Fetch return waybill whenever trip loads and has one
  useEffect(() => {
    if (!trip?.return_waybill_id) { setReturnWaybill(null); return; }
    fetch(`/api/v1/waybills/${trip.return_waybill_id}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setReturnWaybill(d))
      .catch(() => {});
  }, [trip?.return_waybill_id]);

  const fetchTripAttachments = useCallback(async () => {
    setAttachmentsLoading(true);
    try {
      const res = await fetch(`/api/v1/trips/${tripId}/attachments`, { credentials: "include" });
      if (res.ok) setTripAttachments(await res.json());
    } catch { /* silently fail */ } finally {
      setAttachmentsLoading(false);
    }
  }, [tripId]);

  const handleUploadAttachment = async (file: UploadFile) => {
    const fileToUpload = (file.originFileObj || file) as File;
    if (!fileToUpload) return false;
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      const res = await fetch(`/api/v1/trips/${tripId}/attachment`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (res.ok) {
        message.success("Attachment uploaded");
        fetchTripAttachments();
        fetchTrip();
      } else {
        const err = await res.json();
        message.error(err.detail || "Upload failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setUploadingAttachment(false);
    }
    return false;
  };

  const handleDeleteAttachment = async (key: string) => {
    setDeletingAttachmentKey(key);
    try {
      const res = await fetch(
        `/api/v1/trips/${tripId}/attachment?key=${encodeURIComponent(key)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        message.success("Attachment removed");
        setTripAttachments((prev) => prev.filter((a) => a.key !== key));
        fetchTrip();
      } else {
        const err = await res.json();
        message.error(err.detail || "Delete failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setDeletingAttachmentKey(null);
    }
  };

  // Resolve exchange rate — mirrors backend fallback: current month → most recent → 2500
  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const resolve = async () => {
      const r1 = await fetch(`/api/v1/finance/exchange-rates/current?month=${month}&year=${year}`, { credentials: "include" });
      if (r1.ok) { const d = await r1.json(); if (d?.rate && Number(d.rate) > 1) return Number(d.rate); }
      const r2 = await fetch(`/api/v1/finance/exchange-rates?limit=1`, { credentials: "include" });
      if (r2.ok) { const d = await r2.json(); const first = d?.data?.[0]; if (first?.rate && Number(first.rate) > 1) return Number(first.rate); }
      return 2500;
    };
    resolve().then(setExchangeRate).catch(() => setExchangeRate(2500));
  }, []);

  useEffect(() => {
    if (user && tripId) {
      fetchTrip();
      fetchExpenses();
      fetchTripAttachments();
    }
  }, [user, tripId, fetchTrip, fetchExpenses, fetchTripAttachments]);

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
        return `${cur} ${Number(amount).toLocaleString("en-US")}`;
      },
      align: "right",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: ExpenseStatus) => <ExpenseStatusBadge status={status} compact />,
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

  // Fix: use Number() to guard against string amounts from API
  const countableExpenses = expenses.filter(
    (e) => e.status !== "Voided" && e.status !== "Rejected"
  );
  const totalExpenses = countableExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Convert a value to displayCurrency using exchange rate
  const toDisplay = (amount: number, currency: string): number => {
    if (displayCurrency === currency) return amount;
    if (displayCurrency === "TZS" && currency === "USD") return amount * exchangeRate;
    if (displayCurrency === "USD" && currency === "TZS") return amount / exchangeRate;
    return amount;
  };

  const fmt = (amount: number, currency: string) => {
    const val = toDisplay(amount, currency);
    return `${displayCurrency} ${val.toLocaleString("en-US", {
      minimumFractionDigits: displayCurrency === "USD" ? 2 : 0,
      maximumFractionDigits: displayCurrency === "USD" ? 2 : 0,
    })}`;
  };

  // Combined income: go waybill + return waybill (if present), converted to displayCurrency
  const goIncomeTZS = trip?.waybill_rate
    ? toDisplay(Number(trip.waybill_rate), trip.waybill_currency || "USD")
    : null;
  const returnIncomeTZS = returnWaybill
    ? toDisplay(Number(returnWaybill.agreed_rate), returnWaybill.currency || "USD")
    : null;
  const combinedIncome = (goIncomeTZS ?? 0) + (returnIncomeTZS ?? 0);

  // Also convert total expenses to display currency (expenses are stored in their own currency)
  const totalExpensesDisplay = countableExpenses.reduce((sum, e) => {
    return sum + toDisplay(Number(e.amount), e.currency || "TZS");
  }, 0);

  const hasIncome = goIncomeTZS !== null || returnIncomeTZS !== null;

  if (loading) {
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

  const RETURN_STATUSES = new Set([
    "Dispatched (Return)", "Arrived at Loading Point (Return)", "Loading (Return)",
    "Loaded (Return)", "In Transit (Return)", "At Border (Return)",
    "Arrived at Destination (Return)", "Offloading (Return)", "Offloaded (Return)",
    "Arrived at Yard", "Waiting for PODs",
  ]);
  const effectiveRoute =
    RETURN_STATUSES.has(trip.status) && trip.return_route_name
      ? trip.return_route_name
      : trip.route_name;

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
                Trip: {effectiveRoute}
              </Title>
              <TripStatusTag status={trip.status} />
              <Button
                type="link"
                onClick={() => setIsStatusModalOpen(true)}
              >
                Update Status
              </Button>
            </Space>
          </div>

          <Breadcrumb
            style={{ marginBottom: 4 }}
            items={[
              { title: <Link href="/ops/trips">Trips</Link> },
              { title: effectiveRoute },
            ]}
          />

          <Tabs
            defaultActiveKey="details"
            items={[
              {
                key: "details",
                label: "Details",
                children: (
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Route">
                      {effectiveRoute}
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

                    {/* ── Currency toggle ── */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <Space size={4}>
                        <Text type="secondary" style={{ fontSize: 12 }}>View in:</Text>
                        {(["TZS", "USD"] as const).map((c) => (
                          <Button
                            key={c}
                            size="small"
                            type={displayCurrency === c ? "primary" : "default"}
                            onClick={() => setDisplayCurrency(c)}
                          >
                            {c}
                          </Button>
                        ))}
                        {displayCurrency === "USD" && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            1 USD = {exchangeRate.toLocaleString("en-US")} TZS
                          </Text>
                        )}
                      </Space>
                    </div>

                    {/* ── Income summary ── */}
                    {hasIncome && (
                      <Descriptions
                        bordered
                        size="small"
                        column={1}
                        title={<Text strong>Trip Income</Text>}
                      >
                        {trip.waybill_rate && (
                          <Descriptions.Item
                            label={
                              <Space>
                                <span>Go Waybill</span>
                                {trip.waybill_currency && trip.waybill_currency !== "TZS" && (
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    ({trip.waybill_currency} {Number(trip.waybill_rate).toLocaleString("en-US")})
                                  </Text>
                                )}
                              </Space>
                            }
                          >
                            <Text style={{ color: "#52c41a", fontWeight: 500 }}>
                              {fmt(Number(trip.waybill_rate), trip.waybill_currency || "USD")}
                            </Text>
                          </Descriptions.Item>
                        )}
                        {returnWaybill && (
                          <Descriptions.Item
                            label={
                              <Space>
                                <span>Return Waybill</span>
                                {returnWaybill.currency && returnWaybill.currency !== "TZS" && (
                                  <Text type="secondary" style={{ fontSize: 11 }}>
                                    ({returnWaybill.currency} {Number(returnWaybill.agreed_rate).toLocaleString("en-US")})
                                  </Text>
                                )}
                              </Space>
                            }
                          >
                            <Text style={{ color: "#52c41a", fontWeight: 500 }}>
                              {fmt(Number(returnWaybill.agreed_rate), returnWaybill.currency || "USD")}
                            </Text>
                          </Descriptions.Item>
                        )}
                        {returnWaybill && (
                          <Descriptions.Item label={<Text strong>Combined Income</Text>}>
                            <Text strong style={{ color: "#52c41a", fontSize: 15 }}>
                              {displayCurrency}{" "}
                              {combinedIncome.toLocaleString("en-US", {
                                minimumFractionDigits: displayCurrency === "USD" ? 2 : 0,
                                maximumFractionDigits: displayCurrency === "USD" ? 2 : 0,
                              })}
                            </Text>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    )}

                    {/* ── Expense list header ── */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Space align="center" wrap>
                        <Text strong>Total Expenses:</Text>
                        <Text strong style={{ color: "#ff4d4f" }}>
                          {displayCurrency}{" "}
                          {totalExpensesDisplay.toLocaleString("en-US", {
                            minimumFractionDigits: displayCurrency === "USD" ? 2 : 0,
                            maximumFractionDigits: displayCurrency === "USD" ? 2 : 0,
                          })}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>(excl. Voided & Rejected)</Text>
                        {hasIncome && (
                          <>
                            <Text type="secondary" style={{ fontSize: 13, margin: "0 4px" }}>|</Text>
                            <Text strong>Net Profit:</Text>
                            <Text
                              strong
                              style={{
                                color: (combinedIncome - totalExpensesDisplay) >= 0 ? "#52c41a" : "#ff4d4f",
                                fontSize: 15,
                              }}
                            >
                              {(combinedIncome - totalExpensesDisplay) >= 0 ? "+" : ""}
                              {displayCurrency}{" "}
                              {(combinedIncome - totalExpensesDisplay).toLocaleString("en-US", {
                                minimumFractionDigits: displayCurrency === "USD" ? 2 : 0,
                                maximumFractionDigits: displayCurrency === "USD" ? 2 : 0,
                              })}
                            </Text>
                          </>
                        )}
                      </Space>
                      <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchExpenses}>
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
              {
                key: "attachments",
                label: (
                  <Space size={4}>
                    <PaperClipOutlined />
                    {`Attachments${tripAttachments.length > 0 ? ` (${tripAttachments.length})` : ""}`}
                  </Space>
                ),
                children: (
                  <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    {isTripClosed && (
                      <Alert
                        type="info"
                        showIcon
                        message="Trip Closed"
                        description="This trip is closed. Attachments are read-only."
                        style={{ marginBottom: 4 }}
                      />
                    )}

                    {!isTripClosed && (
                      <Upload
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx"
                        beforeUpload={(file) => {
                          const maxSize = 5 * 1024 * 1024;
                          if (file.size > maxSize) {
                            message.error(`${file.name} exceeds 5 MB limit`);
                            return Upload.LIST_IGNORE;
                          }
                          const allowed = [
                            "application/pdf",
                            "image/jpeg", "image/png", "image/webp", "image/gif",
                            "application/msword",
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            "application/vnd.ms-excel",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                          ];
                          if (!allowed.includes(file.type)) {
                            message.error(`${file.name}: unsupported file type. Use PDF, images, Word, or Excel.`);
                            return Upload.LIST_IGNORE;
                          }
                          handleUploadAttachment(file as unknown as UploadFile);
                          return false;
                        }}
                        showUploadList={false}
                        disabled={uploadingAttachment}
                      >
                        <Button icon={<UploadOutlined />} loading={uploadingAttachment}>
                          Upload Document
                        </Button>
                      </Upload>
                    )}
                    {!isTripClosed && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Accepted: PDF, JPEG, PNG, WebP, GIF, Word (.doc/.docx), Excel (.xls/.xlsx) · Max 5 MB per file
                      </Text>
                    )}

                    {attachmentsLoading ? (
                      <div style={{ textAlign: "center", padding: 24 }}>
                        <Spin />
                      </div>
                    ) : tripAttachments.length === 0 ? (
                      <Text type="secondary">No attachments uploaded yet.</Text>
                    ) : (
                      <Table
                        size="small"
                        dataSource={tripAttachments}
                        rowKey="key"
                        pagination={false}
                        columns={[
                          {
                            title: "File",
                            dataIndex: "filename",
                            key: "filename",
                            render: (name: string, rec: TripAttachment) => (
                              <a href={rec.url} target="_blank" rel="noreferrer">
                                <Space size={4}>
                                  <PaperClipOutlined />
                                  {name}
                                </Space>
                              </a>
                            ),
                          },
                          {
                            title: "",
                            key: "actions",
                            width: 80,
                            align: "right" as const,
                            render: (_: unknown, rec: TripAttachment) => (
                              <Space>
                                <Tooltip title="Download">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    href={rec.url}
                                    target="_blank"
                                  />
                                </Tooltip>
                                {!isTripClosed && (
                                  <Tooltip title="Delete">
                                    <Button
                                      type="text"
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                      loading={deletingAttachmentKey === rec.key}
                                      onClick={() => handleDeleteAttachment(rec.key)}
                                    />
                                  </Tooltip>
                                )}
                              </Space>
                            ),
                          },
                        ]}
                      />
                    )}
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
          return_waybill_id: trip.return_waybill_id,
        }}
      />
    </div>
  );
}
