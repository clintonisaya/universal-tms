"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { message } from "antd";
import type { TripDetailed } from "@/types/trip";
import type { ExpenseRequest, ExpenseRequestsResponse } from "@/types/expense";
import type { ExchangeRate } from "@/types/finance";
import type { Waybill } from "@/types/waybill";

interface TripAttachment { key: string; filename: string; url: string; }

export function useTripDetail(tripId: string | null, open: boolean) {
  const [trip, setTrip] = useState<TripDetailed | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [expensesLoading, setExpensesLoading] = useState(true);

  // Attach Return Waybill state
  const [isAttachWaybillOpen, setIsAttachWaybillOpen] = useState(false);
  const [openWaybills, setOpenWaybills] = useState<Waybill[]>([]);
  const [loadingWaybills, setLoadingWaybills] = useState(false);
  const [selectedReturnWaybillId, setSelectedReturnWaybillId] = useState<string | null>(null);
  const [attachingWaybill, setAttachingWaybill] = useState(false);

  // Border crossings state
  const [borderCrossings, setBorderCrossings] = useState<any[]>([]);
  const [loadingCrossings, setLoadingCrossings] = useState(false);

  // Attachments state
  const [tripAttachments, setTripAttachments] = useState<TripAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deletingAttachmentKey, setDeletingAttachmentKey] = useState<string | null>(null);

  // Cancellation modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelGoWaybill, setCancelGoWaybill] = useState(true);
  const [cancelReturnWaybill, setCancelReturnWaybill] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Currency display preference
  const [displayCurrency, setDisplayCurrency] = useState<string>("TZS");

  // Finance exchange rates
  const [exchangeRateMap, setExchangeRateMap] = useState<Record<string, number>>({});

  const fetchTrip = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/trips/${tripId}`, { credentials: "include" });
      if (response.ok) {
        setTrip(await response.json());
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
      const response = await fetch(`/api/v1/expenses/?trip_id=${tripId}`, { credentials: "include" });
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
      if (res.ok) setBorderCrossings(await res.json());
    } catch {
      message.error("Failed to load border crossings");
    } finally {
      setLoadingCrossings(false);
    }
  }, [tripId]);

  const fetchTripAttachments = useCallback(async () => {
    if (!tripId) return;
    setAttachmentsLoading(true);
    try {
      const res = await fetch(`/api/v1/trips/${tripId}/attachments`, { credentials: "include" });
      if (res.ok) setTripAttachments(await res.json());
    } catch {
      message.error("Failed to load trip attachments");
    } finally {
      setAttachmentsLoading(false);
    }
  }, [tripId]);

  const handleUploadAttachment = async (file: any) => {
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

  // Fetch exchange rates on open
  useEffect(() => {
    if (!open) return;
    fetch("/api/v1/finance/exchange-rates?limit=200", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.data) return;
        const map: Record<string, number> = {};
        (data.data as ExchangeRate[]).forEach((er) => {
          map[`${er.year}-${er.month}`] = er.rate;
        });
        setExchangeRateMap(map);
      })
      .catch(() => { message.error("Failed to load exchange rates"); });
  }, [open]);

  // Fetch all data on open
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

  // Return waybill attachment
  const fetchOpenWaybills = async () => {
    setLoadingWaybills(true);
    try {
      const res = await fetch("/api/v1/waybills?status=Open&limit=200", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const filtered = (data.data as Waybill[]).filter((wb) => wb.id !== trip?.waybill_id);
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

  // Trip cancellation
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
    setCancelGoWaybill(!!trip?.waybill_id);
    setCancelReturnWaybill(!!trip?.return_waybill_id);
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

  // Derived financials
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

  const countableExpenses = expenses.filter(
    (e) => e.status !== "Voided" && e.status !== "Rejected" && e.status !== "Returned"
  );

  const resolveRate = (e: ExpenseRequest): number => {
    const ownRate = e.exchange_rate ? Number(e.exchange_rate) : null;
    if (ownRate && ownRate > 1) return ownRate;
    if (e.created_at) {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const financeRate = exchangeRateMap[key];
      if (financeRate && financeRate > 1) return financeRate;
    }
    return singleRate;
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
        if (targetCurrency === "TZS") {
          total += amount * rate;
        } else if (targetCurrency === "USD" && cur === "TZS") {
          total += amount / rate;
        } else {
          unconvertedCount += 1;
        }
      }
    }
    return { total, unconvertedCount };
  };

  const availableCurrencies = [...new Set(countableExpenses.map((e) => e.currency || "TZS"))];
  const toggleCurrencies = (
    availableCurrencies.includes("USD") ||
    trip?.waybill_currency === "USD" ||
    trip?.return_waybill_currency === "USD"
  ) ? ["TZS", "USD"] : ["TZS"];

  const activeCurrency = toggleCurrencies.includes(displayCurrency)
    ? displayCurrency
    : toggleCurrencies[0];

  return {
    // Data
    trip, expenses, loading, expensesLoading, activeTab,
    borderCrossings, loadingCrossings,
    tripAttachments, attachmentsLoading, uploadingAttachment, deletingAttachmentKey,
    // Waybill attachment
    isAttachWaybillOpen, openWaybills, loadingWaybills,
    selectedReturnWaybillId, attachingWaybill,
    // Cancel
    isCancelModalOpen, cancelGoWaybill, cancelReturnWaybill, cancelling,
    // Financials
    displayCurrency, singleRate, activeCurrency, toggleCurrencies,
    exchangeRateMap, countableExpenses,
    // Setters
    setActiveTab, setIsAddExpenseOpen: () => {},
    setSelectedReturnWaybillId, setIsAttachWaybillOpen,
    setCancelGoWaybill, setCancelReturnWaybill, setIsCancelModalOpen,
    setDisplayCurrency,
    // Fetchers
    fetchTrip, fetchExpenses, fetchBorderCrossings, fetchTripAttachments,
    // Handlers
    handleUploadAttachment, handleDeleteAttachment,
    handleOpenAttachWaybill, handleAttachReturnWaybill,
    handleCancelTrip, openCancelModal, handleDeleteExpense,
    // Computed
    convertedTotal, resolveRate,
  };
}
