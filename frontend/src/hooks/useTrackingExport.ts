"use client";

import { message } from "antd";
import ExcelJS from "exceljs";
import { apiFetch } from "@/hooks/useApi";
import type { ColorKey } from "@/components/ui/StatusBadge";

// --- Types for Flattened Report Data (Trip-centric: one row per trip) ---
export interface TrackingRow {
  row_id: string;
  waybill_status: string | null;
  trip_status: string;
  waybill_id: string | null;
  waybill_number: string | null;
  trip_id: string | null;
  trip_number: string | null;
  client_name: string | null;
  cargo_type: string | null;
  cargo_weight: number;
  cargo_description: string;
  return_waybill_id: string | null;
  return_waybill_number: string | null;
  return_waybill_status: string | null;
  return_client_name: string | null;
  return_cargo_type: string | null;
  return_cargo_weight: number | null;
  origin: string;
  destination: string;
  current_location: string | null;
  border_location: string | null;
  truck_plate: string | null;
  truck_make: string | null;
  truck_model: string | null;
  driver_name: string | null;
  driver_license: string | null;
  driver_passport: string | null;
  driver_phone: string | null;
  trailer_plate: string | null;
  trailer_type: string | null;
  risk_level: string;
  start_date: string | null;
  duration_days: number;
  return_duration_days: number;
  dispatch_date: string | null;
  arrival_loading_date: string | null;
  loading_start_date: string | null;
  loading_end_date: string | null;
  arrival_offloading_date: string | null;
  offloading_date: string | null;
  dispatch_return_date: string | null;
  arrival_loading_return_date: string | null;
  loading_return_start_date: string | null;
  loading_return_end_date: string | null;
  offloading_return_date: string | null;
  arrival_return_date: string | null;
  border_crossings: Array<{
    border_display_name: string;
    side_a_name: string;
    side_b_name: string;
    direction: string;
    arrived_side_a_at: string | null;
    documents_submitted_side_a_at: string | null;
    documents_cleared_side_a_at: string | null;
    arrived_side_b_at: string | null;
    departed_border_at: string | null;
  }>;
  return_origin: string | null;
  return_destination: string | null;
  return_cargo_description: string | null;
  return_empty_container_date: string | null;
  remarks: string | null;
  return_remarks: string | null;
  is_delayed: boolean;
}

export const STATUS_COLORS: Record<string, ColorKey> = {
  Open: "gray", "In Progress": "blue", Completed: "green", Invoiced: "blue",
  Waiting: "gray", Dispatched: "blue", "Arrived at Loading Point": "green",
  Loading: "orange", Loaded: "orange", "In Transit": "blue", "At Border": "blue",
  "Arrived at Destination": "blue", Offloading: "cyan", Offloaded: "cyan",
  "Returning Empty": "blue", Breakdown: "red", "Waiting (Return)": "green",
  "Dispatched (Return)": "blue", "Arrived at Loading Point (Return)": "green",
  "Loading (Return)": "orange", "Loaded (Return)": "orange",
  "In Transit (Return)": "blue", "At Border (Return)": "blue",
  "Arrived at Destination (Return)": "blue", "Offloading (Return)": "cyan",
  "Offloaded (Return)": "cyan", "Arrived at Yard": "blue", "Waiting for PODs": "orange",
  Cancelled: "red", "Not Dispatched": "gray",
};

export const RISK_COLORS: Record<string, ColorKey> = {
  Low: "green", Medium: "orange", High: "red",
};

export const RETURN_STATUSES = new Set([
  "Waiting (Return)", "Dispatched (Return)", "Arrived at Loading Point (Return)", "Loading (Return)",
  "Loaded (Return)", "In Transit (Return)", "At Border (Return)",
  "Arrived at Destination (Return)", "Offloading (Return)", "Offloaded (Return)",
  "Arrived at Yard", "Waiting for PODs",
]);

const STATUS_ROW_COLORS: Record<string, string> = {
  "Waiting": "F5F5F5", "Not Dispatched": "FAFAFA",
  "Dispatched": "D3ADF7", "At Border": "B37FEB",
  "Dispatched (Return)": "F9F0FF", "At Border (Return)": "EFDBFF",
  "Arrived at Loading Point": "FFE58F", "Arrived at Loading Point (Return)": "FFF7CC",
  "Waiting (Return)": "FFFBE6", "Waiting for PODs": "FFD666",
  "Loading": "87E8DE", "Loaded": "B5F5EC", "Arrived at Destination": "BAE7FF",
  "Offloading": "B5F5EC", "Offloaded": "BAE7FF",
  "Loading (Return)": "D2F5F0", "Loaded (Return)": "C6F0EB",
  "Arrived at Destination (Return)": "BAE7FF", "Offloading (Return)": "E6FFFB",
  "Offloaded (Return)": "BAE7FF",
  "In Transit": "91CAFF", "In Transit (Return)": "D6E4FF", "Returning Empty": "ADC6FF",
  "Arrived at Yard": "D9F7BE", "Completed": "95DE64", "Cancelled": "FF7875",
};

export function useTrackingExport() {
  const fetchAllForExport = async (serverSearch: string): Promise<TrackingRow[]> => {
    const qs = new URLSearchParams();
    qs.set("export", "true");
    if (serverSearch) qs.set("search", serverSearch);
    const res = await apiFetch<{ data: TrackingRow[]; count: number }>(
      `/api/v1/reports/waybill-tracking?${qs.toString()}`
    );
    return res.data;
  };

  const handleExport = async (serverSearch: string) => {
    const exportData = await fetchAllForExport(serverSearch);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Control Tower");

    type ColDef = Partial<ExcelJS.Column>;

    const maxGoBorders = exportData.reduce(
      (max, row) => Math.max(max, (row.border_crossings || []).filter((bc: any) => bc.direction === "go").length), 0
    );
    const maxReturnBorders = exportData.reduce(
      (max, row) => Math.max(max, (row.border_crossings || []).filter((bc: any) => bc.direction === "return").length), 0
    );

    const calcDays = (start: string | null | undefined, end: string | null | undefined): number | string => {
      if (!start) return "-";
      const s = new Date(start);
      const e = end ? new Date(end) : new Date();
      const diff = e.getTime() - s.getTime();
      if (isNaN(diff) || diff < 0) return "-";
      return Math.round(diff / (1000 * 60 * 60 * 24));
    };

    const fmtDate = (d: string | null | undefined) =>
      d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

    const goBorderCols: ColDef[] = [];
    for (let i = 0; i < maxGoBorders; i++) {
      const n = i + 1;
      goBorderCols.push(
        { header: `Border ${n} Name`, key: `bcG${n}_name`, width: 22 },
        { header: `Border ${n} Arrived`, key: `bcG${n}_arr_a`, width: 20 },
        { header: `Border ${n} Docs Submitted`, key: `bcG${n}_sub_a`, width: 20 },
        { header: `Border ${n} Docs Cleared`, key: `bcG${n}_clr_a`, width: 20 },
        { header: `Border ${n} Crossed`, key: `bcG${n}_arr_b`, width: 22 },
        { header: `Border ${n} Departed Zone`, key: `bcG${n}_dep`, width: 20 }
      );
    }

    const returnBorderCols: ColDef[] = [];
    for (let i = 0; i < maxReturnBorders; i++) {
      const n = i + 1;
      returnBorderCols.push(
        { header: `Ret Border ${n} Name`, key: `bcR${n}_name`, width: 22 },
        { header: `Ret Border ${n} Arrived Side A`, key: `bcR${n}_arr_a`, width: 20 },
        { header: `Ret Border ${n} Docs Submitted`, key: `bcR${n}_sub_a`, width: 20 },
        { header: `Ret Border ${n} Docs Cleared`, key: `bcR${n}_clr_a`, width: 20 },
        { header: `Ret Border ${n} Crossed`, key: `bcR${n}_arr_b`, width: 22 },
        { header: `Ret Border ${n} Departed Zone`, key: `bcR${n}_dep`, width: 20 }
      );
    }

    const daysBorderGoCols: ColDef[] = [];
    for (let i = 0; i < maxGoBorders; i++) {
      daysBorderGoCols.push({ header: `Days at Border ${i + 1}`, key: `days_bcG${i + 1}`, width: 16 });
    }
    const daysBorderReturnCols: ColDef[] = [];
    for (let i = 0; i < maxReturnBorders; i++) {
      daysBorderReturnCols.push({ header: `Days at Ret Border ${i + 1}`, key: `days_bcR${i + 1}`, width: 18 });
    }

    worksheet.columns = [
      { header: "No.", key: "index", width: 8 },
      { header: "Leg", key: "leg", width: 10 },
      { header: "Trip #", key: "trip_number", width: 20 },
      { header: "Trip Status", key: "trip_status", width: 22 },
      { header: "Waybill #", key: "waybill_number", width: 20 },
      { header: "WB Status", key: "waybill_status", width: 15 },
      { header: "Client", key: "client_name", width: 25 },
      { header: "Origin", key: "origin", width: 25 },
      { header: "Destination", key: "destination", width: 25 },
      { header: "Cargo Description", key: "cargo_description", width: 30 },
      { header: "Risk", key: "risk_level", width: 10 },
      { header: "Driver Name", key: "driver_name", width: 22 },
      { header: "Driver Licence", key: "driver_license", width: 18 },
      { header: "Driver Passport", key: "driver_passport", width: 18 },
      { header: "Driver Phone", key: "driver_phone", width: 16 },
      { header: "Truck Plate", key: "truck_plate", width: 14 },
      { header: "Trailer Plate", key: "trailer_plate", width: 14 },
      { header: "Dispatch Date", key: "dispatch_date", width: 20 },
      { header: "Arrival at Loading", key: "arrival_loading_date", width: 20 },
      { header: "Loading Start", key: "loading_start_date", width: 20 },
      { header: "Loading End", key: "loading_end_date", width: 20 },
      { header: "Current Location", key: "current_location", width: 28 },
      ...goBorderCols,
      { header: "Arrival at Offloading", key: "arrival_offloading_date", width: 22 },
      { header: "Offloading Date", key: "offloading_date", width: 20 },
      ...returnBorderCols,
      { header: "Return Offloading Date", key: "offloading_return_date", width: 26 },
      { header: "Arrival at Yard", key: "arrival_return_date", width: 22 },
      { header: "Ret Empty Container", key: "return_empty_container_date", width: 22 },
      { header: "Total Days", key: "duration_days", width: 14 },
      { header: "Days at Loading", key: "days_loading", width: 16 },
      ...daysBorderGoCols,
      ...daysBorderReturnCols,
      { header: "Remark (Go)", key: "remarks", width: 30 },
      { header: "Remark (Return)", key: "return_remarks", width: 30 },
    ] as Partial<ExcelJS.Column>[];

    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    let rowNum = 0;
    exportData.forEach((row) => {
      const goCrossings = (row.border_crossings || []).filter((bc: any) => bc.direction === "go");
      const returnCrossings = (row.border_crossings || []).filter((bc: any) => bc.direction === "return");

      const goBorderData: Record<string, string | number> = {};
      goCrossings.forEach((bc: any, i: number) => {
        const n = i + 1;
        goBorderData[`bcG${n}_name`] = bc.border_display_name || "-";
        goBorderData[`bcG${n}_arr_a`] = fmtDate(bc.arrived_side_a_at);
        goBorderData[`bcG${n}_sub_a`] = fmtDate(bc.documents_submitted_side_a_at);
        goBorderData[`bcG${n}_clr_a`] = fmtDate(bc.documents_cleared_side_a_at);
        goBorderData[`bcG${n}_arr_b`] = fmtDate(bc.arrived_side_b_at);
        goBorderData[`bcG${n}_dep`] = fmtDate(bc.departed_border_at);
        goBorderData[`days_bcG${n}`] = calcDays(bc.arrived_side_a_at, bc.departed_border_at);
      });

      const returnBorderData: Record<string, string | number> = {};
      returnCrossings.forEach((bc: any, i: number) => {
        const n = i + 1;
        returnBorderData[`bcR${n}_name`] = bc.border_display_name || "-";
        returnBorderData[`bcR${n}_arr_a`] = fmtDate(bc.arrived_side_a_at);
        returnBorderData[`bcR${n}_sub_a`] = fmtDate(bc.documents_submitted_side_a_at);
        returnBorderData[`bcR${n}_clr_a`] = fmtDate(bc.documents_cleared_side_a_at);
        returnBorderData[`bcR${n}_arr_b`] = fmtDate(bc.arrived_side_b_at);
        returnBorderData[`bcR${n}_dep`] = fmtDate(bc.departed_border_at);
        returnBorderData[`days_bcR${n}`] = calcDays(bc.arrived_side_a_at, bc.departed_border_at);
      });

      const sharedFields = {
        trip_number: row.trip_number || "-",
        trip_status: row.trip_status,
        risk_level: row.risk_level,
        driver_name: row.driver_name || "-",
        driver_license: row.driver_license || "-",
        driver_passport: row.driver_passport || "-",
        driver_phone: row.driver_phone || "-",
        truck_plate: row.truck_plate || "-",
        trailer_plate: row.trailer_plate || "-",
        current_location: row.current_location || "-",
        remarks: row.remarks || "-",
        return_remarks: row.return_remarks || "-",
      };

      const statusColor = STATUS_ROW_COLORS[row.trip_status] ?? "FFFFFF";

      const goRow = worksheet.addRow({
        ...sharedFields,
        index: ++rowNum,
        leg: "Go",
        waybill_number: row.waybill_number || "-",
        waybill_status: row.waybill_status || "-",
        client_name: row.client_name || "-",
        origin: row.origin || "-",
        destination: row.destination || "-",
        cargo_description: row.cargo_description || "-",
        dispatch_date: fmtDate(row.dispatch_date),
        arrival_loading_date: fmtDate(row.arrival_loading_date),
        loading_start_date: fmtDate(row.loading_start_date),
        loading_end_date: fmtDate(row.loading_end_date),
        arrival_offloading_date: fmtDate(row.arrival_offloading_date),
        offloading_date: fmtDate(row.offloading_date),
        offloading_return_date: "-",
        arrival_return_date: "-",
        return_empty_container_date: fmtDate(row.return_empty_container_date),
        duration_days: calcDays(row.dispatch_date, row.arrival_return_date),
        days_loading: calcDays(row.arrival_loading_date, row.loading_end_date),
        ...goBorderData,
      });
      goRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${statusColor}` } };
      });

      if (row.return_waybill_id) {
        const retRow = worksheet.addRow({
          ...sharedFields,
          index: ++rowNum,
          leg: "Return",
          waybill_number: row.return_waybill_number || "-",
          waybill_status: row.return_waybill_status || "-",
          client_name: row.return_client_name || "-",
          origin: row.return_origin || "-",
          destination: row.return_destination || "-",
          cargo_description: row.return_cargo_description || "-",
          dispatch_date: fmtDate(row.dispatch_return_date),
          arrival_loading_date: fmtDate(row.arrival_loading_return_date),
          loading_start_date: fmtDate(row.loading_return_start_date),
          loading_end_date: fmtDate(row.loading_return_end_date),
          arrival_offloading_date: "-",
          offloading_date: "-",
          offloading_return_date: fmtDate(row.offloading_return_date),
          arrival_return_date: fmtDate(row.arrival_return_date),
          return_empty_container_date: fmtDate(row.return_empty_container_date),
          duration_days: calcDays(row.dispatch_date, row.arrival_return_date),
          days_loading: calcDays(row.arrival_loading_return_date, row.loading_return_end_date),
          ...returnBorderData,
        });
        retRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF7FF" } };
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Nablafleet_Control_Tower_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleClientExport = async (selectedRows: TrackingRow[]) => {
    if (selectedRows.length === 0) {
      message.warning("Please select trips to export first");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Trucks Report");

    const fmtDate = (d: string | null | undefined) =>
      d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

    const calcDays = (start: string | null | undefined, end: string | null | undefined): number | string => {
      if (!start) return "";
      const s = new Date(start);
      const e = end ? new Date(end) : new Date();
      const diff = e.getTime() - s.getTime();
      if (isNaN(diff) || diff < 0) return "";
      return Math.round(diff / (1000 * 60 * 60 * 24));
    };

    const maxBorders = selectedRows.reduce(
      (max, row) => Math.max(
        max,
        (row.border_crossings || []).filter((bc: any) => bc.direction === "go").length,
        (row.border_crossings || []).filter((bc: any) => bc.direction === "return").length,
      ), 0
    );

    const borderCols: Partial<ExcelJS.Column>[] = [];
    for (let i = 0; i < maxBorders; i++) {
      const n = i + 1;
      const suffix = maxBorders > 1 ? ` ${n}` : "";
      borderCols.push(
        { header: `Border Entry${suffix}`, key: `bc${i}_name`, width: 22 },
        { header: `Border Arrived${suffix}`, key: `bc${i}_arr_a`, width: 18 },
        { header: `Docs Submitted${suffix}`, key: `bc${i}_sub_a`, width: 18 },
        { header: `Docs Received${suffix}`, key: `bc${i}_clr_a`, width: 18 },
        { header: `Border Crossing${suffix}`, key: `bc${i}_arr_b`, width: 18 },
        { header: `Border Dispatch${suffix}`, key: `bc${i}_dep`, width: 18 },
        { header: `Border Days${suffix}`, key: `bc${i}_days`, width: 14 },
      );
    }

    const reportDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

    worksheet.columns = [
      { header: "Truck", key: "truck", width: 16 },
      { header: "Trailer", key: "trailer", width: 16 },
      { header: "Type of Business", key: "type_of_business", width: 18 },
      { header: "Client", key: "client", width: 25 },
      { header: "Cargo Details", key: "cargo_details", width: 30 },
      { header: "Origin", key: "origin", width: 22 },
      { header: "Destination", key: "destination", width: 22 },
      { header: "Report Date", key: "report_date", width: 16 },
      { header: "Current Position", key: "current_position", width: 22 },
      { header: "Status", key: "status", width: 22 },
      { header: "Loading Date", key: "loading_date", width: 16 },
      ...borderCols,
      { header: "Arrvl at Offloading place", key: "arrvl_offloading", width: 24 },
      { header: "Offloading Date", key: "offloading_date", width: 16 },
      { header: "Total Days", key: "total_days", width: 12 },
      { header: "Transit Days", key: "transit_days", width: 14 },
      { header: "Remark", key: "remarks", width: 30 },
    ] as Partial<ExcelJS.Column>[];

    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const buildBorderData = (crossings: any[], direction: "go" | "return" = "go"): Record<string, string | number> => {
      const data: Record<string, string | number> = {};
      for (let i = 0; i < maxBorders; i++) {
        const bc = crossings[i];
        const borderName = bc
          ? direction === "return"
            ? `${bc.side_b_name || ""} / ${bc.side_a_name || ""}`.trim().replace(/^\/ | \/$/, "")
            : bc.border_display_name || ""
          : "";
        data[`bc${i}_name`] = borderName;
        data[`bc${i}_arr_a`] = bc ? fmtDate(bc.arrived_side_a_at) : "";
        data[`bc${i}_sub_a`] = bc ? fmtDate(bc.documents_submitted_side_a_at) : "";
        data[`bc${i}_clr_a`] = bc ? fmtDate(bc.documents_cleared_side_a_at) : "";
        data[`bc${i}_arr_b`] = bc ? fmtDate(bc.arrived_side_b_at) : "";
        data[`bc${i}_dep`] = bc ? fmtDate(bc.departed_border_at) : "";
        data[`bc${i}_days`] = bc ? calcDays(bc.arrived_side_a_at, bc.departed_border_at) : "";
      }
      return data;
    };

    const applyRowColor = (excelRow: ExcelJS.Row, resolvedStatus: string) => {
      const colorKey =
        resolvedStatus === "Invoiced" ? "Completed" :
        resolvedStatus === "Offloaded | Waiting for PODs" ? "Waiting for PODs" :
        resolvedStatus;
      const color = STATUS_ROW_COLORS[colorKey] ?? "FFFFFF";
      excelRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${color}` } };
      });
    };

    selectedRows.forEach((row) => {
      const goCrossings = (row.border_crossings || []).filter((bc: any) => bc.direction === "go");
      const returnCrossings = (row.border_crossings || []).filter((bc: any) => bc.direction === "return");

      const goStatus: string =
        row.trip_status === "Completed" || row.trip_status === "Cancelled" ? row.trip_status :
        row.waybill_status === "Invoiced" ? "Invoiced" :
        row.waybill_status === "Completed" ? "Offloaded | Waiting for PODs" :
        row.trip_status;
      const retStatus: string = row.trip_status;

      const goRow = worksheet.addRow({
        truck: row.truck_plate || "", trailer: row.trailer_plate || "",
        type_of_business: "Going", client: row.client_name || "",
        cargo_details: row.cargo_description || "", origin: row.origin || "",
        destination: row.destination || "", reportDate,
        current_position: row.current_location || "", status: goStatus,
        loading_date: fmtDate(row.loading_start_date),
        ...buildBorderData(goCrossings, "go"),
        arrvl_offloading: fmtDate(row.arrival_offloading_date),
        offloading_date: fmtDate(row.offloading_date),
        total_days: calcDays(row.dispatch_date, row.arrival_return_date),
        transit_days: calcDays(row.loading_end_date, row.offloading_date),
        remarks: row.remarks || "",
      });
      applyRowColor(goRow, goStatus);

      if (row.return_waybill_id) {
        const retRow = worksheet.addRow({
          truck: row.truck_plate || "", trailer: row.trailer_plate || "",
          type_of_business: "Return", client: row.return_client_name || "",
          cargo_details: row.return_cargo_description || "", origin: row.return_origin || "",
          destination: row.return_destination || "", reportDate,
          current_position: row.current_location || "", status: retStatus,
          loading_date: fmtDate(row.loading_return_start_date),
          ...buildBorderData(returnCrossings, "return"),
          arrvl_offloading: fmtDate(row.offloading_return_date),
          offloading_date: "",
          total_days: calcDays(row.dispatch_date, row.arrival_return_date),
          transit_days: calcDays(row.loading_return_end_date, row.offloading_return_date),
          remarks: row.return_remarks || "",
        });
        applyRowColor(retRow, retStatus);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Nablafleet_Trucks_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return { handleExport, handleClientExport };
}
