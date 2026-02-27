"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Modal,
  Upload,
  Alert,
  Tooltip,
  Popconfirm,
} from "antd";
import type { UploadFile } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { TripDetailed, TripStatus, PodDocument } from "@/types/trip";
import type { Waybill } from "@/types/waybill";
import type {
  ExpenseRequest,
  ExpenseRequestsResponse,
  ExpenseStatus,
} from "@/types/expense";
import type { ExchangeRate } from "@/types/finance";
import { useAuth } from "@/contexts/AuthContext";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { UpdateTripStatusModal } from "@/components/trips/UpdateTripStatusModal";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";
import { TripStatusTag } from "@/components/ui/TripStatusTag";

const { Text } = Typography;


interface TripDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  tripId: string | null;
  onEdit?: (tripId: string) => void;
}

export function TripDetailDrawer({ open, onClose, tripId, onEdit }: TripDetailDrawerProps) {
  const { user } = useAuth();

  const [trip, setTrip] = useState<TripDetailed | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
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

  // Attachments state
  interface TripAttachment { key: string; filename: string; url: string; }
  const [tripAttachments, setTripAttachments] = useState<TripAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deletingAttachmentKey, setDeletingAttachmentKey] = useState<string | null>(null);

  // Cancellation modal state (Story 2.25 — dual waybill cancel)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelGoWaybill, setCancelGoWaybill] = useState(true);
  const [cancelReturnWaybill, setCancelReturnWaybill] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Currency display preference
  const [displayCurrency, setDisplayCurrency] = useState<string>("TZS");

  // Finance exchange rates — keyed by "YYYY-M" for quick lookup
  const [exchangeRateMap, setExchangeRateMap] = useState<Record<string, number>>({});

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

  // Attachment handlers
  const fetchTripAttachments = useCallback(async () => {
    if (!tripId) return;
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
    if (!tripId || !fileToUpload) return false;
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
        fetchTrip(); // refresh trip so attachment count updates
      } else {
        const err = await res.json();
        message.error(err.detail || "Upload failed");
      }
    } catch {
      message.error("Network error");
    } finally {
      setUploadingAttachment(false);
    }
    return false; // prevent antd default upload
  };

  const handleDeleteAttachment = async (key: string) => {
    if (!tripId) return;
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

  // Fetch all finance exchange rates once on open — used as fallback for expenses
  // without their own exchange_rate
  useEffect(() => {
    if (!open) return;
    fetch("/api/v1/finance/exchange-rates?limit=200", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.data) return;
        const map: Record<string, number> = {};
        (data.data as ExchangeRate[]).forEach((er) => {
          map[`${er.year}-${er.month}`] = er.rate;
        });
        setExchangeRateMap(map);
      })
      .catch(() => {}); // silently fail — conversion falls back gracefully
  }, [open]);

  useEffect(() => {
    if (open && tripId) {
      fetchTrip();
      fetchExpenses();
      fetchBorderCrossings();
      fetchTripAttachments();
    }
    if (!open) {
      setTrip(null);
      setExpenses([]);
      setBorderCrossings([]);
      setTripAttachments([]);
      setExchangeRateMap({});
      setActiveTab("details");
    }
  }, [open, tripId, fetchTrip, fetchExpenses, fetchBorderCrossings, fetchTripAttachments]);

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

  // Derive a single exchange rate from the rate map (most recent month/year)
  const singleRate = useMemo(() => {
    let bestYear = 0, bestMonth = 0, bestRate = 2500;
    for (const [key, rate] of Object.entries(exchangeRateMap)) {
      const [yearStr, monthStr] = key.split("-");
      const year = parseInt(yearStr), month = parseInt(monthStr);
      if (year > bestYear || (year === bestYear && month > bestMonth)) {
        bestYear = year; bestMonth = month; bestRate = rate;
      }
    }
    return bestRate;
  }, [exchangeRateMap]);

  const expenseColumns: ColumnsType<ExpenseRequest> = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 200,
      render: (val: string | null) => val ?? "—",
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 130,
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
      width: 160,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 200,
      render: (status: ExpenseStatus) => <ExpenseStatusBadge status={status} compact />,
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 110,
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_: unknown, record: ExpenseRequest) => {
        const isClosed = trip?.status === "Completed" || trip?.status === "Cancelled";
        return record.status === "Pending Manager" && !isClosed ? (
          <Popconfirm
            title="Delete expense?"
            description="This cannot be undone."
            onConfirm={() => handleDeleteExpense(record)}
            okText="Delete"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        ) : null;
      },
    },
  ];

  // Exclude Voided and Rejected — only count active/processed expenses
  const countableExpenses = expenses.filter(
    (e) => e.status !== "Voided" && e.status !== "Rejected"
  );

  // Resolve the best available exchange rate for an expense:
  // 1. Use expense's own exchange_rate if it's a real rate (> 1)
  // 2. Fall back to finance exchange rate table keyed by expense's created_at month/year
  // exchange_rate = TZS per 1 unit of the expense's foreign currency (e.g. 1 USD = 2500 TZS)
  const resolveRate = (e: ExpenseRequest): number | null => {
    const ownRate = e.exchange_rate ? Number(e.exchange_rate) : null;
    if (ownRate && ownRate > 1) return ownRate;

    // Fall back to finance exchange rate table
    if (e.created_at) {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const financeRate = exchangeRateMap[key];
      if (financeRate && financeRate > 1) return financeRate;
    }

    // Try latest available rate as last resort
    const rates = Object.values(exchangeRateMap).filter((r) => r > 1);
    if (rates.length > 0) return Math.max(...rates); // most recent tends to be highest index — use last entry instead
    return null;
  };

  const convertedTotal = (targetCurrency: string): { total: number; unconvertedCount: number } => {
    let total = 0;
    let unconvertedCount = 0;

    for (const e of countableExpenses) {
      const cur = e.currency || "TZS";
      const amount = Number(e.amount);

      if (cur === targetCurrency) {
        total += amount;
      } else {
        const rate = resolveRate(e);
        if (rate) {
          if (targetCurrency === "TZS") {
            // Foreign → TZS: multiply
            total += amount * rate;
          } else if (targetCurrency === "USD" && cur === "TZS") {
            // TZS → USD: divide
            total += amount / rate;
          } else {
            // Other currency pair — no conversion rule
            unconvertedCount += 1;
          }
        } else {
          unconvertedCount += 1;
        }
      }
    }

    return { total, unconvertedCount };
  };

  // Determine which currencies are actually present in countable expenses
  const availableCurrencies = [...new Set(countableExpenses.map((e) => e.currency || "TZS"))];
  // Show USD when any expense is in USD OR when any waybill rate is priced in USD
  const toggleCurrencies = (
    availableCurrencies.includes("USD") ||
    trip?.waybill_currency === "USD" ||
    trip?.return_waybill_currency === "USD"
  ) ? ["TZS", "USD"] : ["TZS"];

  const activeCurrency = toggleCurrencies.includes(displayCurrency)
    ? displayCurrency
    : toggleCurrencies[0];

  // Only admin, manager, and superuser can see financial data
  const showFinancials = user?.role === "admin" || user?.role === "manager" || user?.is_superuser;

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
        styles={{ wrapper: { width: "min(1500px, 90vw)" } }}
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
              {trip.status !== "Completed" && trip.status !== "Cancelled" && (
                <Button type="primary" ghost onClick={() => onEdit?.(trip.id)}>
                  Edit Trip
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
            activeKey={activeTab}
            onChange={setActiveTab}
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
                        <Descriptions.Item label="Waybill #" span={2}>
                          <Text strong>{trip.waybill_number ?? trip.waybill_id}</Text>
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
                        <Descriptions.Item label="Waybill #" span={2}>
                          <Text strong>{trip.return_waybill_number ?? trip.return_waybill_id}</Text>
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
              ...(showFinancials ? [{
                key: "financials",
                label: "Financials",
                children: (() => {
                  const isClosed = trip.status === "Completed" || trip.status === "Cancelled";
                  const { total: expensesTotal, unconvertedCount } = convertedTotal(activeCurrency);

                  // Convert a waybill rate from its currency to activeCurrency
                  const convertWaybillRate = (amount: number | null, currency: string | null): number | null => {
                    if (amount === null) return null;
                    const cur = currency || "USD";
                    if (cur === activeCurrency) return amount;
                    if (activeCurrency === "TZS" && cur === "USD") return amount * singleRate;
                    if (activeCurrency === "USD" && cur === "TZS") return amount / singleRate;
                    return amount;
                  };

                  const goIncome = convertWaybillRate(trip.waybill_rate, trip.waybill_currency);
                  const returnIncome = convertWaybillRate(trip.return_waybill_rate, trip.return_waybill_currency);
                  const hasIncome = goIncome !== null || returnIncome !== null;
                  const combinedIncome = (goIncome ?? 0) + (returnIncome ?? 0);
                  const netProfit = combinedIncome - expensesTotal;

                  const fmtAmt = (val: number) =>
                    val.toLocaleString("en-US", {
                      minimumFractionDigits: activeCurrency === "USD" ? 2 : 0,
                      maximumFractionDigits: activeCurrency === "USD" ? 2 : 0,
                    });

                  return (
                    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                      {/* Trip closed alert */}
                      {isClosed && (
                        <Alert
                          message="Trip Closed"
                          description={`This trip is ${trip.status.toLowerCase()}. No expense modifications are allowed.`}
                          type="info"
                          showIcon
                        />
                      )}

                      {/* Currency toggle */}
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <Space size={4}>
                          <Text type="secondary" style={{ fontSize: 12 }}>View in:</Text>
                          {toggleCurrencies.map((cur) => (
                            <Button
                              key={cur}
                              size="small"
                              type={activeCurrency === cur ? "primary" : "default"}
                              onClick={() => setDisplayCurrency(cur)}
                            >
                              {cur}
                            </Button>
                          ))}
                          {activeCurrency === "USD" && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              1 USD = {singleRate.toLocaleString("en-US")} TZS
                            </Text>
                          )}
                        </Space>
                      </div>

                      {/* Trip Income section */}
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
                                {activeCurrency} {fmtAmt(goIncome ?? 0)}
                              </Text>
                            </Descriptions.Item>
                          )}
                          {trip.return_waybill_rate && (
                            <Descriptions.Item
                              label={
                                <Space>
                                  <span>Return Waybill</span>
                                  {trip.return_waybill_currency && trip.return_waybill_currency !== "TZS" && (
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      ({trip.return_waybill_currency} {Number(trip.return_waybill_rate).toLocaleString("en-US")})
                                    </Text>
                                  )}
                                </Space>
                              }
                            >
                              <Text style={{ color: "#52c41a", fontWeight: 500 }}>
                                {activeCurrency} {fmtAmt(returnIncome ?? 0)}
                              </Text>
                            </Descriptions.Item>
                          )}
                          {trip.return_waybill_rate && (
                            <Descriptions.Item label={<Text strong>Combined Income</Text>}>
                              <Text strong style={{ color: "#52c41a", fontSize: 15 }}>
                                {activeCurrency} {fmtAmt(combinedIncome)}
                              </Text>
                            </Descriptions.Item>
                          )}
                        </Descriptions>
                      )}

                      {/* Expense list header — Total Expenses + Net Profit left, buttons right */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Space align="center" wrap>
                          <Text strong>Total Expenses:</Text>
                          <Text strong style={{ color: "#ff4d4f", fontSize: 15 }}>
                            {activeCurrency} {fmtAmt(expensesTotal)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {unconvertedCount > 0
                              ? `(${unconvertedCount} expense${unconvertedCount > 1 ? "s" : ""} excluded — no exchange rate set)`
                              : "(excl. Voided & Rejected)"}
                          </Text>
                          {hasIncome && (
                            <>
                              <Text type="secondary" style={{ fontSize: 13, margin: "0 4px" }}>|</Text>
                              <Text strong>Net Profit:</Text>
                              <Text
                                strong
                                style={{ color: netProfit >= 0 ? "#52c41a" : "#ff4d4f", fontSize: 15 }}
                              >
                                {netProfit >= 0 ? "+" : ""}{activeCurrency} {fmtAmt(netProfit)}
                              </Text>
                            </>
                          )}
                        </Space>
                        <Space>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsAddExpenseOpen(true)}
                            size="small"
                            disabled={isClosed}
                          >
                            Add Expense
                          </Button>
                          <Button icon={<ReloadOutlined />} onClick={fetchExpenses} size="small">
                            Refresh
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
                  );
                })(),
              }] : []),
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
              {
                key: "attachments",
                label: (
                  <Space size={4}>
                    <PaperClipOutlined />
                    {`Attachments${tripAttachments.length > 0 ? ` (${tripAttachments.length})` : ""}`}
                  </Space>
                ),
                children: (() => {
                  const isClosed = trip.status === "Completed" || trip.status === "Cancelled";
                  return (
                    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                      {isClosed && (
                        <Alert
                          type="info"
                          showIcon
                          message="Trip Closed"
                          description="This trip is closed. Attachments are read-only."
                          style={{ marginBottom: 4 }}
                        />
                      )}

                      {/* Upload area — disabled when trip is closed */}
                      {!isClosed && (
                        <Upload
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx"
                          beforeUpload={(file) => {
                            // Client-side size validation (10 MB)
                            const maxSize = 5 * 1024 * 1024;
                            if (file.size > maxSize) {
                              message.error(`${file.name} exceeds 5 MB limit`);
                              return Upload.LIST_IGNORE;
                            }
                            // Client-side type validation
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
                            handleUploadAttachment(file as any);
                            return false;
                          }}
                          showUploadList={false}
                          disabled={uploadingAttachment}
                        >
                          <Button
                            icon={<UploadOutlined />}
                            loading={uploadingAttachment}
                          >
                            Upload Document
                          </Button>
                        </Upload>
                      )}
                      {!isClosed && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Accepted: PDF, JPEG, PNG, WebP, GIF, Word (.doc/.docx), Excel (.xls/.xlsx) · Max 5 MB per file
                        </Text>
                      )}

                      {/* Attachment list */}
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
                              render: (name: string, rec) => (
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
                              render: (_: unknown, rec) => (
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
                                  {!isClosed && (
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
                  );
                })(),
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

    </>
  );
}
