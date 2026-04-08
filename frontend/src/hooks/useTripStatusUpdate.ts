"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Form, message } from "antd";
import dayjs from "dayjs";
import type { TripUpdate, TripStatus, Trip } from "@/types/trip";
import type { Country } from "@/types/location";
import {
  VALID_NEXT_STATUSES,
  ALL_RETURN_STATUSES,
  CLOSED_STATUSES,
} from "@/constants/tripStatuses";
import { useAuth } from "@/contexts/AuthContext";

interface UseTripStatusUpdateProps {
  tripId: string;
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
  initialValues?: Partial<{ status: string; current_location?: string | null; return_waybill_id?: string | null; is_delayed?: boolean }>;
}

export function useTripStatusUpdate({ tripId, open, onSuccess, onClose, initialValues }: UseTripStatusUpdateProps) {
  const { user } = useAuth();
  const canReopen = user?.role === "admin" || user?.role === "manager";
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TripStatus | null>(null);
  const [tripData, setTripData] = useState<Trip | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(false);
  const [nextBorder, setNextBorder] = useState<any | null>(null);
  const [existingCrossing, setExistingCrossing] = useState<any | null>(null);
  const [loadingBorder, setLoadingBorder] = useState(false);
  const dirtyFields = useRef<Set<string>>(new Set());
  const prevStatus = useRef<TripStatus | null>(null);

  const currentStatus = initialValues?.status as TripStatus | undefined;
  const hasReturnWaybill = !!initialValues?.return_waybill_id;
  const isTripClosed = currentStatus && CLOSED_STATUSES.includes(currentStatus);
  const isReopening = isTripClosed && selectedStatus && !CLOSED_STATUSES.includes(selectedStatus);

  const validNextStatuses: TripStatus[] = (() => {
    if (isTripClosed && canReopen) {
      const reopenTargets: TripStatus[] = hasReturnWaybill
        ? ["Waiting for PODs", "Arrived at Yard", "Waiting (Return)"]
        : ["Waiting for PODs", "Returning Empty", "Offloaded"];
      return reopenTargets;
    }
    const all = (VALID_NEXT_STATUSES[currentStatus ?? ""] ?? []) as TripStatus[];
    return all.filter((s) => {
      if (!hasReturnWaybill && ALL_RETURN_STATUSES.includes(s)) return false;
      if (hasReturnWaybill && currentStatus === "Arrived at Yard" && s === "Returning Empty") return false;
      return true;
    });
  })();

  const nextStepStatuses = validNextStatuses.filter((s) => s !== "Breakdown" && s !== "Cancelled");
  const specialStatuses = validNextStatuses.filter((s) => s === "Breakdown" || s === "Cancelled");

  const fetchBorderData = async (status: TripStatus) => {
    const isAtBorder = status === "At Border" || status === "At Border (Return)";
    if (!isAtBorder) {
      setNextBorder(null);
      setExistingCrossing(null);
      return;
    }
    const direction = status === "At Border" ? "go" : "return";
    setLoadingBorder(true);
    try {
      const [nextRes, crossingsRes] = await Promise.all([
        fetch(`/api/v1/trips/${tripId}/next-border?direction=${direction}`, { credentials: "include" }),
        fetch(`/api/v1/trips/${tripId}/border-crossings`, { credentials: "include" }),
      ]);
      const nextData = nextRes.ok ? await nextRes.json() : null;
      setNextBorder(nextData || null);
      if (nextData && crossingsRes.ok) {
        const crossings: any[] = await crossingsRes.json();
        const match = crossings.find(
          (c) => c.border_post_id === nextData.id && c.direction === direction
        );
        setExistingCrossing(match || null);
        if (match) {
          const fields: any = {};
          const dateFields = [
            "arrived_side_a_at",
            "documents_submitted_side_a_at",
            "documents_cleared_side_a_at",
            "arrived_side_b_at",
            "departed_border_at",
          ];
          dateFields.forEach((f) => {
            if (match[f]) fields[`border_${f}`] = dayjs(match[f]);
          });
          form.setFieldsValue(fields);
        }
      } else {
        setExistingCrossing(null);
      }
    } catch {
      setNextBorder(null);
      setExistingCrossing(null);
    } finally {
      setLoadingBorder(false);
    }
  };

  const handleStatusChange = (value: TripStatus) => {
    setSelectedStatus(value);
    fetchBorderData(value);
    if (value !== "Breakdown") {
      form.setFieldValue("breakdown_reason", undefined);
    }
  };

  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const res = await fetch("/api/v1/countries", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCountries(data.data);
      }
    } catch {
      message.error("Failed to load countries");
    } finally {
      setLoadingResources(false);
    }
  };

  const fetchTripData = async () => {
    setLoadingTrip(true);
    try {
      const res = await fetch(`/api/v1/trips/${tripId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTripData(data);
      }
    } catch {
      message.error("Failed to load trip data");
    } finally {
      setLoadingTrip(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (nextBorder && (selectedStatus === "At Border" || selectedStatus === "At Border (Return)")) {
        const direction = selectedStatus === "At Border" ? "go" : "return";
        const dateFields = [
          "arrived_side_a_at",
          "documents_submitted_side_a_at",
          "documents_cleared_side_a_at",
          "arrived_side_b_at",
          "departed_border_at",
        ];
        const crossingPayload: any = { direction };
        dateFields.forEach((f) => {
          const val = values[`border_${f}`];
          if (val) crossingPayload[f] = val.format("YYYY-MM-DD");
        });
        await fetch(`/api/v1/trips/${tripId}/border-crossings/${nextBorder.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(crossingPayload),
        });
      }

      const city = (values.city || "").trim();
      const country = (values.country || "").trim();
      let current_location: string | null = null;
      if (city && country) {
        current_location = `${city}, ${country}`;
      } else if (city) {
        current_location = city;
      } else if (country) {
        current_location = country;
      }

      let effectiveStatus: TripStatus = values.status;
      if (values.border_departed_border_at) {
        if (selectedStatus === "At Border") effectiveStatus = "In Transit";
        else if (selectedStatus === "At Border (Return)") effectiveStatus = "In Transit (Return)";
      }

      const payload: TripUpdate = {
        status: effectiveStatus,
        current_location,
      };

      const dateFieldMap: Record<string, string> = {
        dispatch_date: "dispatch_date",
        arrival_loading_date: "arrival_loading_date",
        loading_start_date: "loading_start_date",
        loading_end_date: "loading_end_date",
        arrival_offloading_date: "arrival_offloading_date",
        offloading_date: "offloading_date",
        offloading_return_date: "offloading_return_date",
        arrival_return_date: "arrival_return_date",
        dispatch_return_date: "dispatch_return_date",
        arrival_loading_return_date: "arrival_loading_return_date",
        arrival_destination_return_date: "arrival_destination_return_date",
        loading_return_start_date: "loading_return_start_date",
        loading_return_end_date: "loading_return_end_date",
        return_empty_container_date: "return_empty_container_date",
        pods_confirmed_date: "pods_confirmed_date",
      };
      for (const [formKey, payloadKey] of Object.entries(dateFieldMap)) {
        if (values[formKey]) {
          (payload as any)[payloadKey] = values[formKey].format("YYYY-MM-DD");
        }
      }

      if (selectedStatus === "Breakdown" && values.breakdown_reason) {
        const timestamp = dayjs().format("YYYY-MM-DD HH:mm");
        const entry = `[Breakdown ${timestamp}]: ${values.breakdown_reason}`;
        const existing = tripData?.remarks || "";
        payload.remarks = existing ? `${existing}\n${entry}` : entry;
      } else if (values.remarks !== undefined) {
        payload.remarks = values.remarks || null;
      }
      if (values.return_remarks !== undefined) {
        payload.return_remarks = values.return_remarks || null;
      }
      payload.is_delayed = values.is_delayed ?? false;

      const response = await fetch(`/api/v1/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        message.success("Trip status updated successfully!");
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update trip");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  // Open effect
  useEffect(() => {
    if (open) {
      fetchResources();
      fetchTripData();
      form.resetFields();
      setNextBorder(null);
      setExistingCrossing(null);
      dirtyFields.current.clear();
      prevStatus.current = null;
      if (initialValues) {
        const location = initialValues.current_location || "";
        const parts = location.split(",").map((s) => s.trim());
        form.setFieldsValue({
          status: initialValues.status,
          city: parts[0] || "",
          country: parts.length > 1 ? parts.slice(1).join(", ") : "",
          is_delayed: initialValues.is_delayed ?? false,
        });
        setSelectedStatus(initialValues.status as TripStatus);
        if (initialValues.status === "At Border" || initialValues.status === "At Border (Return)") {
          fetchBorderData(initialValues.status as TripStatus);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues, form]);

  // Date pre-fill effect
  useEffect(() => {
    if (selectedStatus && tripData) {
      const statusChanged = prevStatus.current !== null && prevStatus.current !== selectedStatus;
      if (statusChanged) {
        dirtyFields.current.clear();
      }
      prevStatus.current = selectedStatus;

      const fields: any = {};
      const set = (key: string, value: any) => {
        if (!dirtyFields.current.has(key) && value) fields[key] = value;
      };

      const datePreFillMap: Record<string, string[]> = {
        "Dispatched": ["dispatch_date"],
        "Arrived at Loading Point": ["arrival_loading_date"],
        "Loading": ["loading_start_date", "loading_end_date"],
        "Arrived at Destination": ["arrival_offloading_date"],
        "Offloading": ["offloading_date"],
        "Dispatched (Return)": ["dispatch_return_date"],
        "Returning Empty": ["arrival_return_date"],
        "Arrived at Yard": ["arrival_return_date"],
        "Offloading (Return)": ["offloading_return_date"],
        "Arrived at Destination (Return)": ["arrival_destination_return_date"],
        "Arrived at Loading Point (Return)": ["arrival_loading_return_date"],
        "Loading (Return)": ["loading_return_start_date", "loading_return_end_date"],
        "In Transit (Return)": ["loading_return_end_date"],
      };

      for (const [status, keys] of Object.entries(datePreFillMap)) {
        if (selectedStatus === status) {
          for (const key of keys) {
            const val = (tripData as any)[key];
            set(key, val ? dayjs(val) : null);
          }
        }
      }
      set("return_empty_container_date", (tripData as any).return_empty_container_date ? dayjs((tripData as any).return_empty_container_date) : null);
      set("pods_confirmed_date", (tripData as any).pods_confirmed_date ? dayjs((tripData as any).pods_confirmed_date) : null);
      set("remarks", (tripData as any).remarks);
      set("return_remarks", (tripData as any).return_remarks);
      if (!dirtyFields.current.has("is_delayed")) {
        fields.is_delayed = (tripData as any).is_delayed ?? false;
      }

      form.setFieldsValue(fields);
    }
  }, [selectedStatus, tripData, form]);

  return {
    form,
    submitting,
    countries,
    loadingResources,
    selectedStatus,
    tripData,
    loadingTrip,
    nextBorder,
    existingCrossing,
    loadingBorder,
    currentStatus,
    hasReturnWaybill,
    isTripClosed,
    isReopening,
    canReopen,
    nextStepStatuses,
    specialStatuses,
    handleStatusChange,
    handleSubmit,
    onValuesChange: useCallback((changed: any) => {
      Object.keys(changed).forEach((k) => dirtyFields.current.add(k));
    }, []),
  };
}
