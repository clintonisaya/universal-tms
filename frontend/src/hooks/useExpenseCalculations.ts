"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { App } from "antd";
import type { ExpenseRequestDetailed, ExpenseCategory } from "@/types/expense";
import type { TripExpenseType } from "@/types/trip-expense-type";
import type { OfficeExpenseType } from "@/types/office-expense-type";
import { CATEGORY_MAPPING } from "@/constants/expenseConstants";

export interface EditableItem {
  expense_type_id?: string;
  amount: number;
  currency: string;
  invoice_state: string;
  details: string;
  exchange_rate: number;
  category: ExpenseCategory;
}

export interface EditableHeader {
  payment_method: string;
  remarks: string;
  bank_name: string;
  account_name: string;
  account_no: string;
}

export interface AttachmentInfo {
  key: string;
  filename: string;
  url: string | null;
}

interface UseExpenseCalculationsOptions {
  expense: ExpenseRequestDetailed | null;
  open: boolean;
  actions: string[];
}

export function useExpenseCalculations({ expense, open, actions }: UseExpenseCalculationsOptions) {
  const { message } = App.useApp();

  const isReturned = expense?.status === "Returned";
  const editable = isReturned && actions.includes("submit");
  const isTripExpense = !!expense?.trip_id;

  // Editable state for returned expenses
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [editCount, setEditCount] = useState(1);
  const [editHeader, setEditHeader] = useState<EditableHeader | null>(null);
  const [tripExpenseTypes, setTripExpenseTypes] = useState<TripExpenseType[]>([]);
  const [officeExpenseTypes, setOfficeExpenseTypes] = useState<OfficeExpenseType[]>([]);
  const [expenseTypesLoading, setExpenseTypesLoading] = useState(false);
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number | null>(null);

  // Initialize editable state from expense data
  useEffect(() => {
    if (open && expense && editable) {
      const meta = expense.expense_metadata || {};
      const savedItems = (meta as any).items as any[] | undefined;
      if (savedItems && savedItems.length > 0) {
        setEditItems(savedItems.map((it: any) => ({
          expense_type_id: it.expense_type_id,
          amount: Number(it.amount) || 0,
          currency: it.currency || "TZS",
          invoice_state: it.invoice_state || "With Invoice",
          details: it.item_details || "",
          exchange_rate: Number(it.exchange_rate) || 1,
          category: it.category,
        })));
        setEditCount(savedItems.length);
      } else {
        setEditItems([{
          expense_type_id: undefined,
          amount: Number(expense.amount) || 0,
          currency: expense.currency || "TZS",
          invoice_state: meta.invoice_state || "With Invoice",
          details: meta.item_details || expense.description || "",
          exchange_rate: Number(expense.exchange_rate) || 1,
          category: expense.category,
        }]);
        setEditCount(1);
      }
      setEditHeader({
        payment_method: meta.payment_method || "Cash",
        remarks: meta.remarks || expense.description || "",
        bank_name: meta.bank_details?.bank_name || "",
        account_name: meta.bank_details?.account_name || "",
        account_no: meta.bank_details?.account_no || "",
      });
    }
  }, [open, expense?.id, editable]);

  // Fetch expense types for edit mode
  useEffect(() => {
    if (open && editable) {
      const fetchTypes = async () => {
        setExpenseTypesLoading(true);
        try {
          const url = isTripExpense
            ? "/api/v1/trip-expense-types?active_only=true&limit=200"
            : "/api/v1/office-expense-types?active_only=true&limit=200";
          const response = await fetch(url, { credentials: "include" });
          if (response.ok) {
            const data = await response.json();
            if (isTripExpense) setTripExpenseTypes(data.data);
            else setOfficeExpenseTypes(data.data);
          }
        } catch {
          message.error("Failed to load expense types");
        } finally {
          setExpenseTypesLoading(false);
        }
      };
      const fetchRate = async () => {
        const now = new Date();
        try {
          const response = await fetch(
            `/api/v1/finance/exchange-rates/current?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
            { credentials: "include" }
          );
          if (response.ok) {
            const data = await response.json();
            setCurrentExchangeRate(data?.rate || null);
          }
        } catch {
          message.error("Failed to load exchange rate");
        }
      };
      fetchTypes();
      fetchRate();
    }
  }, [open, editable, isTripExpense]);

  // Match expense type by ID first, fall back to name for legacy data
  useEffect(() => {
    if (!expense || editItems.length === 0 || editItems[0].expense_type_id) return;
    const meta = expense.expense_metadata || {};
    const types = isTripExpense ? tripExpenseTypes : officeExpenseTypes;
    if (types.length === 0) return;

    const savedItems = (meta as any).items as any[] | undefined;
    const firstSavedId = savedItems?.[0]?.expense_type_id;
    if (firstSavedId) {
      const idMatch = types.find((t) => t.id === firstSavedId);
      if (idMatch) {
        setEditItems((prev) => [{ ...prev[0], expense_type_id: idMatch.id }, ...prev.slice(1)]);
        return;
      }
    }

    const itemName = meta.item_name || meta.item_details || expense.description;
    if (!itemName) return;
    const match = types.find(
      (t) => t.name.toLowerCase() === itemName.toLowerCase()
    );
    if (match) {
      setEditItems((prev) => [{ ...prev[0], expense_type_id: match.id }, ...prev.slice(1)]);
    }
  }, [tripExpenseTypes, officeExpenseTypes, expense, editItems[0]?.expense_type_id, isTripExpense]);

  // Grouped options for expense type dropdowns
  const groupedExpenseOptions = useMemo(() => {
    const types = isTripExpense ? tripExpenseTypes : officeExpenseTypes;
    const grouped: Record<string, { name: string; id: string }[]> = {};
    types.forEach((t: any) => {
      const cat = t.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => ({
        label: category,
        options: items.map((t) => ({ label: t.name, value: t.id })),
      }));
  }, [tripExpenseTypes, officeExpenseTypes, isTripExpense]);

  // Edit helpers
  const handleItemFieldAt = useCallback((index: number, field: keyof EditableItem, value: any) => {
    setEditItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: value };

      if (field === "expense_type_id") {
        const types = isTripExpense ? tripExpenseTypes : officeExpenseTypes;
        const selected = types.find((t) => t.id === value);
        if (selected) {
          updated.details = selected.name;
          updated.category = isTripExpense
            ? CATEGORY_MAPPING[(selected as TripExpenseType).category] || "Other"
            : "Office";
        }
      }

      if (field === "currency") {
        if (value === "USD" && currentExchangeRate) {
          updated.exchange_rate = currentExchangeRate;
        } else if (value === "TZS") {
          updated.exchange_rate = 1;
        }
      }

      next[index] = updated;
      return next;
    });
  }, [isTripExpense, tripExpenseTypes, officeExpenseTypes, currentExchangeRate]);

  const handleAddRow = useCallback(() => {
    const first = editItems[0];
    setEditItems((prev) => [
      ...prev,
      {
        expense_type_id: undefined,
        amount: 0,
        currency: first?.currency || "TZS",
        invoice_state: "With Invoice",
        details: "",
        exchange_rate: first?.currency === "USD" ? (first?.exchange_rate || 1) : 1,
        category: first?.category || "Other",
      },
    ]);
    setEditCount((c) => c + 1);
  }, [editItems]);

  const handleDeleteRow = useCallback((index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Computed values
  const editTotal = editItems.reduce((sum, it) => sum + (it.amount || 0), 0);
  const displayAmount = editable && editItems.length > 0 ? editTotal : (expense?.amount ?? 0);
  const displayCurrency = editable && editItems.length > 0 ? (editItems[0]?.currency ?? "TZS") : (expense?.currency ?? "TZS");

  // Expense type name helper
  const getItemName = useCallback((item: EditableItem) => {
    if (!item.expense_type_id) return undefined;
    const types = isTripExpense ? tripExpenseTypes : officeExpenseTypes;
    return types.find((t) => t.id === item.expense_type_id)?.name;
  }, [isTripExpense, tripExpenseTypes, officeExpenseTypes]);

  return {
    // State
    editItems,
    editCount,
    editHeader,
    expenseTypesLoading,
    currentExchangeRate,
    isReturned,
    editable,
    isTripExpense,
    // Computed
    groupedExpenseOptions,
    editTotal,
    displayAmount,
    displayCurrency,
    // Setters
    setEditItems,
    setEditHeader,
    // Handlers
    handleItemFieldAt,
    handleAddRow,
    handleDeleteRow,
    getItemName,
  };
}
