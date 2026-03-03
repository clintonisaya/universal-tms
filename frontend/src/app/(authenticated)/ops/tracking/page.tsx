"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Flex,
  Space,
  Tag,
  Input,
  message,
  Typography,
  Form,
  Row,
  Col,
  Tooltip,
} from "antd";
import {
  ReloadOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  SearchOutlined,
  CarOutlined,
  UserOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import ExcelJS from "exceljs";
import { uniqBy } from "lodash";
import { useAuth } from "@/contexts/AuthContext";
import { useTracking, useInvalidateQueries } from "@/hooks/useApi";
import { UpdateTripStatusModal } from "@/components/trips/UpdateTripStatusModal";
import { TripStatusTag } from "@/components/ui/TripStatusTag";
import { getStandardRowSelection } from "@/components/ui/tableUtils";

const { Title, Text } = Typography;

// --- Types for Flattened Report Data (Trip-centric: one row per trip) ---
interface TrackingRow {
  // Unique row key
  row_id: string;

  // 1. Status
  waybill_status: string | null;
  trip_status: string;

  // 2. IDs
  waybill_id: string | null;
  waybill_number: string | null;
  trip_id: string | null;
  trip_number: string | null;

  // 3. Go Waybill Info
  client_name: string | null;
  cargo_type: string | null;
  cargo_weight: number;
  cargo_description: string;

  // 4. Return Waybill Info
  return_waybill_id: string | null;
  return_waybill_number: string | null;
  return_waybill_status: string | null;
  return_client_name: string | null;
  return_cargo_type: string | null;
  return_cargo_weight: number | null;

  // 5. Route Info
  origin: string;
  destination: string;
  current_location: string | null;
  border_location: string | null;

  // 6. Asset Info — extended (Story 2.26)
  truck_plate: string | null;
  truck_make: string | null;
  truck_model: string | null;
  driver_name: string | null;
  driver_license: string | null;
  driver_passport: string | null;
  driver_phone: string | null;
  trailer_plate: string | null;
  trailer_type: string | null;

  // 7. Risk
  risk_level: string;

  // Meta
  start_date: string | null;
  duration_days: number;
  return_duration_days: number;

  // Tracking dates (Story 2.26)
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

  // Border crossings (Story 2.26)
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

  // Return waybill extended (Story 2.26)
  return_origin: string | null;
  return_destination: string | null;
  return_cargo_description: string | null;

  // Trip extra fields
  return_empty_container_date: string | null;
  remarks: string | null;
  return_remarks: string | null;
  is_delayed: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  // Waybill Statuses
  Open: "default",
  "In Progress": "processing",
  Completed: "success",
  Invoiced: "geekblue",
  // Trip Statuses
  Waiting: "default",
  Dispatched: "purple",
  "Arrived at Loading Point": "lime",
  Loading: "gold",
  Loaded: "gold",
  "In Transit": "processing",
  "At Border": "purple",
  "Arrived at Destination": "processing",
  Offloading: "cyan",
  Offloaded: "cyan",
  "Returning Empty": "processing",
  Breakdown: "error",
  "Waiting (Return)": "lime",
  // Return leg statuses
  "Dispatched (Return)": "purple",
  "Arrived at Loading Point (Return)": "lime",
  "Loading (Return)": "gold",
  "Loaded (Return)": "gold",
  "In Transit (Return)": "processing",
  "At Border (Return)": "purple",
  "Arrived at Destination (Return)": "processing",
  "Offloading (Return)": "cyan",
  "Offloaded (Return)": "cyan",
  "Arrived at Yard": "geekblue",
  "Waiting for PODs": "warning",
  Cancelled: "error",
  "Not Dispatched": "default",
};

const RISK_COLORS: Record<string, string> = {
  Low: "success",
  Medium: "warning",
  High: "error",
};

const RETURN_STATUSES = new Set([
  "Waiting (Return)", "Dispatched (Return)", "Arrived at Loading Point (Return)", "Loading (Return)",
  "Loaded (Return)", "In Transit (Return)", "At Border (Return)",
  "Arrived at Destination (Return)", "Offloading (Return)", "Offloaded (Return)",
  "Arrived at Yard", "Waiting for PODs",
]);

// Excel row background colors — semantic color system:
//   🔵 Blue   = Truck is moving       🟡 Yellow = Someone waiting
//   🟢 Green  = Trip done             🔴 Red    = Problem / stop
//   🟣 Purple = Border / regulatory   🩵 Cyan   = Physical cargo handling
const STATUS_ROW_COLORS: Record<string, string> = {
  // Neutral — pre-dispatch
  "Waiting":                "F5F5F5",
  "Not Dispatched":         "FAFAFA",
  // 🟣 Purple — Border / regulatory
  "Dispatched":                          "D3ADF7",  // Soft Purple
  "At Border":                           "B37FEB",  // Medium Purple
  "Dispatched (Return)":                 "F9F0FF",  // Lightest purple (return = lighter)
  "At Border (Return)":                  "EFDBFF",  // Light purple
  // 🟡 Yellow — Waiting / standby
  "Arrived at Loading Point":            "FFE58F",  // Strong Yellow
  "Arrived at Loading Point (Return)":   "FFF7CC",  // Soft Yellow
  "Waiting (Return)":                    "FFFBE6",  // Lightest Yellow
  "Waiting for PODs":                    "FFD666",  // Amber
  // 🩵 Cyan — Physical cargo handling
  "Loading":                "87E8DE",  // Medium Cyan
  "Loaded":                 "B5F5EC",  // Light Cyan (loaded, ready to go)
  "Arrived at Destination": "BAE7FF",  // Light Blue-Cyan (at destination)
  "Offloading":             "B5F5EC",  // Light Cyan
  "Offloaded":              "BAE7FF",  // Light Blue-Cyan (done offloading, about to move)
  "Loading (Return)":       "D2F5F0",  // Lighter cyan
  "Loaded (Return)":        "C6F0EB",  // Slightly lighter cyan
  "Arrived at Destination (Return)": "BAE7FF",  // Light Blue-Cyan
  "Offloading (Return)":    "E6FFFB",  // Lightest cyan
  "Offloaded (Return)":     "BAE7FF",  // Light Blue-Cyan
  // 🔵 Blue — Truck is moving
  "In Transit":             "91CAFF",  // Medium Blue
  "In Transit (Return)":    "D6E4FF",  // Light Blue
  "Returning Empty":        "ADC6FF",  // Periwinkle Blue (heading back)
  // 🟢 Green — Trip done
  "Arrived at Yard":        "D9F7BE",  // Light Green
  "Completed":              "95DE64",  // Fresh Green
  // 🔴 Red — Problem / stop
  "Cancelled":              "FF7875",  // Soft Red
};

export default function TrackingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { invalidateTracking } = useInvalidateQueries();

  const isAuthenticated = !!user;

  const { data: rawData, isLoading: loading, refetch } = useTracking(isAuthenticated);
  const data = rawData || [];

  const [filteredData, setFilteredData] = useState<TrackingRow[]>([]);
  const [searchForm] = Form.useForm();

  // Status Update Modal State
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [initialStatusValues, setInitialStatusValues] = useState<any>(null);

  // Standard Table States
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  // Apply filters when data changes
  useEffect(() => {
    if (data.length > 0) {
      applySearch(data, searchForm.getFieldsValue());
    }
  }, [data]);

  // Combined Search Logic
  const applySearch = (rawData: TrackingRow[], searchValues: any) => {
    // Ensure uniqueness based on row_id to prevent key errors
    let results = uniqBy(rawData, "row_id");

    if (searchValues) {
      const { waybill, trip, truck, trailer, client, driver } = searchValues;
      if (waybill)
        results = results.filter(
          (r) =>
            r.waybill_number?.toLowerCase().includes(waybill.toLowerCase()) ||
            r.return_waybill_number?.toLowerCase().includes(waybill.toLowerCase())
        );
      if (trip)
        results = results.filter((r) =>
          r.trip_number?.toLowerCase().includes(trip.toLowerCase())
        );
      if (truck)
        results = results.filter((r) =>
          r.truck_plate?.toLowerCase().includes(truck.toLowerCase())
        );
      if (trailer)
        results = results.filter((r) =>
          r.trailer_plate?.toLowerCase().includes(trailer.toLowerCase())
        );
      if (client)
        results = results.filter(
          (r) =>
            r.client_name?.toLowerCase().includes(client.toLowerCase()) ||
            r.return_client_name?.toLowerCase().includes(client.toLowerCase())
        );
      if (driver)
        results = results.filter((r) =>
          r.driver_name?.toLowerCase().includes(driver.toLowerCase())
        );
    }

    setFilteredData(results);
  };

  const handleSearch = (values: any) => {
    applySearch(data, values);
  };

  const handleReset = () => {
    searchForm.resetFields();
    applySearch(data, {});
  };

  // Excel Export
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Control Tower");

    type ColDef = Partial<ExcelJS.Column>;

    const maxGoBorders = filteredData.reduce(
      (max, row) => Math.max(max, (row.border_crossings || []).filter((bc: any) => bc.direction === "go").length),
      0
    );
    const maxReturnBorders = filteredData.reduce(
      (max, row) => Math.max(max, (row.border_crossings || []).filter((bc: any) => bc.direction === "return").length),
      0
    );

    const calcDays = (start: string | null | undefined, end: string | null | undefined): number | string => {
      if (!start) return "-";
      const s = new Date(start);
      const e = end ? new Date(end) : new Date(); // live count until end date is set
      const diff = e.getTime() - s.getTime();
      if (isNaN(diff) || diff < 0) return "-";
      return Math.round(diff / (1000 * 60 * 60 * 24));
    };

    const goBorderCols: ColDef[] = [];
    for (let i = 0; i < maxGoBorders; i++) {
      const n = i + 1;
      goBorderCols.push(
        { header: `Border ${n} Name`,           key: `bcG${n}_name`,  width: 22 },
        { header: `Border ${n} Arrived`,         key: `bcG${n}_arr_a`, width: 20 },
        { header: `Border ${n} Docs Submitted`, key: `bcG${n}_sub_a`, width: 20 },
        { header: `Border ${n} Docs Cleared`,   key: `bcG${n}_clr_a`, width: 20 },
        { header: `Border ${n} Crossed`,        key: `bcG${n}_arr_b`, width: 22 },
        { header: `Border ${n} Departed Zone`,  key: `bcG${n}_dep`,   width: 20 }
      );
    }

    const returnBorderCols: ColDef[] = [];
    for (let i = 0; i < maxReturnBorders; i++) {
      const n = i + 1;
      returnBorderCols.push(
        { header: `Ret Border ${n} Name`,           key: `bcR${n}_name`,  width: 22 },
        { header: `Ret Border ${n} Arrived Side A`, key: `bcR${n}_arr_a`, width: 20 },
        { header: `Ret Border ${n} Docs Submitted`, key: `bcR${n}_sub_a`, width: 20 },
        { header: `Ret Border ${n} Docs Cleared`,   key: `bcR${n}_clr_a`, width: 20 },
        { header: `Ret Border ${n} Crossed`,        key: `bcR${n}_arr_b`, width: 22 },
        { header: `Ret Border ${n} Departed Zone`,  key: `bcR${n}_dep`,   width: 20 }
      );
    }

    const daysBorderGoCols: ColDef[] = [];
    for (let i = 0; i < maxGoBorders; i++) {
      const n = i + 1;
      daysBorderGoCols.push({ header: `Days at Border ${n}`,     key: `days_bcG${n}`, width: 16 });
    }
    const daysBorderReturnCols: ColDef[] = [];
    for (let i = 0; i < maxReturnBorders; i++) {
      const n = i + 1;
      daysBorderReturnCols.push({ header: `Days at Ret Border ${n}`, key: `days_bcR${n}`, width: 18 });
    }

    worksheet.columns = [
      { header: "No.",               key: "index",             width: 8  },
      { header: "Leg",               key: "leg",               width: 10 },
      { header: "Trip #",            key: "trip_number",       width: 20 },
      { header: "Trip Status",       key: "trip_status",       width: 22 },
      { header: "Waybill #",         key: "waybill_number",    width: 20 },
      { header: "WB Status",         key: "waybill_status",    width: 15 },
      { header: "Client",            key: "client_name",       width: 25 },
      { header: "Origin",            key: "origin",            width: 25 },
      { header: "Destination",       key: "destination",       width: 25 },
      { header: "Cargo Description", key: "cargo_description", width: 30 },
      { header: "Risk",              key: "risk_level",        width: 10 },
      { header: "Driver Name",       key: "driver_name",       width: 22 },
      { header: "Driver Licence",    key: "driver_license",    width: 18 },
      { header: "Driver Passport",   key: "driver_passport",   width: 18 },
      { header: "Driver Phone",      key: "driver_phone",      width: 16 },
      { header: "Truck Plate",       key: "truck_plate",       width: 14 },
      { header: "Trailer Plate",     key: "trailer_plate",     width: 14 },
      { header: "Dispatch Date",            key: "dispatch_date",           width: 20 },
      { header: "Arrival at Loading",       key: "arrival_loading_date",    width: 20 },
      { header: "Loading Start",            key: "loading_start_date",      width: 20 },
      { header: "Loading End",                   key: "loading_end_date",        width: 20 },
      { header: "Current Location",              key: "current_location",        width: 28 },
      ...goBorderCols,
      { header: "Arrival at Offloading",    key: "arrival_offloading_date", width: 22 },
      { header: "Offloading Date",          key: "offloading_date",         width: 20 },
      ...returnBorderCols,
      { header: "Return Offloading Date",   key: "offloading_return_date",  width: 26 },
      { header: "Arrival at Yard",          key: "arrival_return_date",     width: 22 },
      { header: "Total Days",               key: "duration_days",           width: 14 },
      { header: "Days at Loading",          key: "days_loading",            width: 16 },
      ...daysBorderGoCols,
      ...daysBorderReturnCols,
      { header: "Remark (Go)",              key: "remarks",                 width: 30 },
      { header: "Remark (Return)",          key: "return_remarks",          width: 30 },
    ] as Partial<ExcelJS.Column>[];

    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const fmtDate = (d: string | null | undefined) =>
      d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

    let rowNum = 0;
    filteredData.forEach((row) => {
      const goCrossings     = (row.border_crossings || []).filter((bc: any) => bc.direction === "go");
      const returnCrossings = (row.border_crossings || []).filter((bc: any) => bc.direction === "return");

      const goBorderData: Record<string, string | number> = {};
      goCrossings.forEach((bc: any, i: number) => {
        const n = i + 1;
        goBorderData[`bcG${n}_name`]  = bc.border_display_name || "-";
        goBorderData[`bcG${n}_arr_a`] = fmtDate(bc.arrived_side_a_at);
        goBorderData[`bcG${n}_sub_a`] = fmtDate(bc.documents_submitted_side_a_at);
        goBorderData[`bcG${n}_clr_a`] = fmtDate(bc.documents_cleared_side_a_at);
        goBorderData[`bcG${n}_arr_b`] = fmtDate(bc.arrived_side_b_at);
        goBorderData[`bcG${n}_dep`]   = fmtDate(bc.departed_border_at);
        goBorderData[`days_bcG${n}`]  = calcDays(bc.arrived_side_a_at, bc.departed_border_at);
      });

      const returnBorderData: Record<string, string | number> = {};
      returnCrossings.forEach((bc: any, i: number) => {
        const n = i + 1;
        returnBorderData[`bcR${n}_name`]  = bc.border_display_name || "-";
        returnBorderData[`bcR${n}_arr_a`] = fmtDate(bc.arrived_side_a_at);
        returnBorderData[`bcR${n}_sub_a`] = fmtDate(bc.documents_submitted_side_a_at);
        returnBorderData[`bcR${n}_clr_a`] = fmtDate(bc.documents_cleared_side_a_at);
        returnBorderData[`bcR${n}_arr_b`] = fmtDate(bc.arrived_side_b_at);
        returnBorderData[`bcR${n}_dep`]   = fmtDate(bc.departed_border_at);
        returnBorderData[`days_bcR${n}`]  = calcDays(bc.arrived_side_a_at, bc.departed_border_at);
      });

      const sharedFields = {
        trip_number:      row.trip_number || "-",
        trip_status:      row.trip_status,
        risk_level:       row.risk_level,
        driver_name:      row.driver_name || "-",
        driver_license:   row.driver_license || "-",
        driver_passport:  row.driver_passport || "-",
        driver_phone:     row.driver_phone || "-",
        truck_plate:      row.truck_plate || "-",
        trailer_plate:    row.trailer_plate || "-",
        current_location: row.current_location || "-",
        remarks:          row.remarks || "-",
        return_remarks:   row.return_remarks || "-",
      };

      const statusColor = STATUS_ROW_COLORS[row.trip_status] ?? "FFFFFF";

      // --- GO ROW ---
      const goRow = worksheet.addRow({
        ...sharedFields,
        index:                   ++rowNum,
        leg:                     "Go",
        waybill_number:          row.waybill_number || "-",
        waybill_status:          row.waybill_status || "-",
        client_name:             row.client_name || "-",
        origin:                  row.origin || "-",
        destination:             row.destination || "-",
        cargo_description:       row.cargo_description || "-",
        dispatch_date:           fmtDate(row.dispatch_date),
        arrival_loading_date:    fmtDate(row.arrival_loading_date),
        loading_start_date:      fmtDate(row.loading_start_date),
        loading_end_date:        fmtDate(row.loading_end_date),
        arrival_offloading_date: fmtDate(row.arrival_offloading_date),
        offloading_date:         fmtDate(row.offloading_date),
        offloading_return_date:  "-",
        arrival_return_date:     "-",
        duration_days:           calcDays(row.dispatch_date, row.arrival_return_date),
        days_loading:            calcDays(row.arrival_loading_date, row.loading_end_date),
        ...goBorderData,
      });
      goRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${statusColor}` } };
      });

      // --- RETURN ROW (only if return waybill exists) ---
      if (row.return_waybill_id) {
        const retRow = worksheet.addRow({
          ...sharedFields,
          index:                   ++rowNum,
          leg:                     "Return",
          waybill_number:          row.return_waybill_number || "-",
          waybill_status:          row.return_waybill_status || "-",
          client_name:             row.return_client_name || "-",
          origin:                  row.return_origin || "-",
          destination:             row.return_destination || "-",
          cargo_description:       row.return_cargo_description || "-",
          // dispatch_date reused for return dispatch — "Leg Dispatch Date" applies to both legs
          dispatch_date:           fmtDate(row.dispatch_return_date),
          arrival_loading_date:    fmtDate(row.arrival_loading_return_date),
          loading_start_date:      fmtDate(row.loading_return_start_date),
          loading_end_date:        fmtDate(row.loading_return_end_date),
          arrival_offloading_date: "-",
          offloading_date:         "-",
          offloading_return_date:  fmtDate(row.offloading_return_date),
          arrival_return_date:     fmtDate(row.arrival_return_date),
          duration_days:           calcDays(row.dispatch_date, row.arrival_return_date),
          days_loading:            calcDays(row.arrival_loading_return_date, row.loading_return_end_date),
          ...returnBorderData,
        });
        retRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF7FF" } };
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Edupo_Control_Tower_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Client Excel Export — selected trips only, dynamic border columns across all selected rows
  const handleClientExport = async () => {
    const keySet = new Set(selectedRowKeys.map(String));
    const selectedRows = filteredData.filter((r) => keySet.has(String(r.row_id)));
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
      const e = end ? new Date(end) : new Date(); // live count until end date is set
      const diff = e.getTime() - s.getTime();
      if (isNaN(diff) || diff < 0) return "";
      return Math.round(diff / (1000 * 60 * 60 * 24));
    };

    // Max border count across ALL selected rows, both go and return directions
    const maxBorders = selectedRows.reduce(
      (max, row) => Math.max(
        max,
        (row.border_crossings || []).filter((bc: any) => bc.direction === "go").length,
        (row.border_crossings || []).filter((bc: any) => bc.direction === "return").length,
      ),
      0
    );

    // Dynamically generate 7 columns per border: Entry, Arrived, Docs Submitted, Docs Received, Crossing, Dispatch, Days
    const borderCols: Partial<ExcelJS.Column>[] = [];
    for (let i = 0; i < maxBorders; i++) {
      const n = i + 1;
      const suffix = maxBorders > 1 ? ` ${n}` : "";
      borderCols.push(
        { header: `Border Entry${suffix}`,     key: `bc${i}_name`,  width: 22 },
        { header: `Border Arrived${suffix}`,   key: `bc${i}_arr_a`, width: 18 },
        { header: `Docs Submitted${suffix}`,   key: `bc${i}_sub_a`, width: 18 },
        { header: `Docs Received${suffix}`,    key: `bc${i}_clr_a`, width: 18 },
        { header: `Border Crossing${suffix}`,  key: `bc${i}_arr_b`, width: 18 },
        { header: `Border Dispatch${suffix}`,  key: `bc${i}_dep`,   width: 18 },
        { header: `Border Days${suffix}`,      key: `bc${i}_days`,  width: 14 },
      );
    }

    const reportDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

    worksheet.columns = [
      { header: "Truck",             key: "truck",            width: 16 },
      { header: "Trailer",           key: "trailer",          width: 16 },
      { header: "Type of Business",  key: "type_of_business", width: 18 },
      { header: "Client",            key: "client",           width: 25 },
      { header: "Cargo Details",     key: "cargo_details",    width: 30 },
      { header: "Origin",            key: "origin",           width: 22 },
      { header: "Destination",       key: "destination",      width: 22 },
      { header: "Report Date",       key: "report_date",      width: 16 },
      { header: "Current Position",  key: "current_position", width: 22 },
      { header: "Status",            key: "status",           width: 22 },
      { header: "Loading Date",      key: "loading_date",     width: 16 },
      ...borderCols,
      { header: "Arrvl at Offloading place", key: "arrvl_offloading", width: 24 },
      { header: "Offloading Date",           key: "offloading_date",  width: 16 },
      { header: "Total Days",                 key: "total_days",       width: 12 },
      { header: "Transit Days",              key: "transit_days",     width: 14 },
      { header: "Remark",                    key: "remarks",          width: 30 },
    ] as Partial<ExcelJS.Column>[];

    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const buildBorderData = (crossings: any[], direction: "go" | "return" = "go"): Record<string, string | number> => {
      const data: Record<string, string | number> = {};
      for (let i = 0; i < maxBorders; i++) {
        const bc = crossings[i];
        // For return leg the truck crosses in the opposite direction: Side B → Side A
        const borderName = bc
          ? direction === "return"
            ? `${bc.side_b_name || ""} / ${bc.side_a_name || ""}`.trim().replace(/^\/ | \/$/, "")
            : bc.border_display_name || ""
          : "";
        data[`bc${i}_name`]  = borderName;
        data[`bc${i}_arr_a`] = bc ? fmtDate(bc.arrived_side_a_at) : "";
        data[`bc${i}_sub_a`] = bc ? fmtDate(bc.documents_submitted_side_a_at) : "";
        data[`bc${i}_clr_a`] = bc ? fmtDate(bc.documents_cleared_side_a_at) : "";
        data[`bc${i}_arr_b`] = bc ? fmtDate(bc.arrived_side_b_at) : "";
        data[`bc${i}_dep`]   = bc ? fmtDate(bc.departed_border_at) : "";
        data[`bc${i}_days`]  = bc ? calcDays(bc.arrived_side_a_at, bc.departed_border_at) : "";
      }
      return data;
    };

    const applyRowColor = (excelRow: ExcelJS.Row, resolvedStatus: string) => {
      // "Invoiced" shares the same cell color as "Completed" — financially closed
      // "Offloaded | Waiting for PODs" uses the "Waiting for PODs" amber color
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
      const goCrossings     = (row.border_crossings || []).filter((bc: any) => bc.direction === "go");
      const returnCrossings = (row.border_crossings || []).filter((bc: any) => bc.direction === "return");

      // Resolve single status per leg — no double "WB | Trip" format
      // Go: waybill Completed (cargo delivered) → show "Offloaded | Waiting for PODs"; Invoiced → show "Invoiced"
      const goStatus: string =
        row.waybill_status === "Invoiced"  ? "Invoiced" :
        row.waybill_status === "Completed" ? "Offloaded | Waiting for PODs" :
        row.trip_status;
      // Return: always the current trip status (e.g. "Loading (Return)")
      const retStatus: string = row.trip_status;

      // --- GO ROW ---
      const goRow = worksheet.addRow({
        truck:            row.truck_plate || "",
        trailer:          row.trailer_plate || "",
        type_of_business: "Going",
        client:           row.client_name || "",
        cargo_details:    row.cargo_description || "",
        origin:           row.origin || "",
        destination:      row.destination || "",
        report_date:      reportDate,
        current_position: row.current_location || "",
        status:           goStatus,
        loading_date:     fmtDate(row.loading_start_date),
        ...buildBorderData(goCrossings, "go"),
        arrvl_offloading: fmtDate(row.arrival_offloading_date),
        offloading_date:  fmtDate(row.offloading_date),
        total_days:       calcDays(row.dispatch_date, row.arrival_return_date),
        transit_days:     calcDays(row.loading_end_date, row.offloading_date),
        remarks:          row.remarks || "",       // go-leg remark (frozen at offloading)
      });
      applyRowColor(goRow, goStatus);

      // --- RETURN ROW (only if return waybill exists) ---
      if (row.return_waybill_id) {
        const retRow = worksheet.addRow({
          truck:            row.truck_plate || "",
          trailer:          row.trailer_plate || "",
          type_of_business: "Return",
          client:           row.return_client_name || "",
          cargo_details:    row.return_cargo_description || "",
          origin:           row.return_origin || "",
          destination:      row.return_destination || "",
          report_date:      reportDate,
          current_position: row.current_location || "",
          status:           retStatus,
          loading_date:     fmtDate(row.loading_return_start_date),
          ...buildBorderData(returnCrossings, "return"),
          arrvl_offloading: fmtDate(row.offloading_return_date),
          offloading_date:  "",
          total_days:       calcDays(row.dispatch_date, row.arrival_return_date),
          transit_days:     calcDays(row.loading_return_end_date, row.offloading_return_date),
          remarks:          row.return_remarks || "", // return-leg remark (independent)
        });
        applyRowColor(retRow, retStatus);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Edupo_Trucks_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Only "Invoiced" locks the record — "Completed" is a normal mid-trip waybill state
  // (go waybill becomes Completed at offloading, trip can still continue to return leg)
  const isWaybillFinalised = (record: TrackingRow): boolean => {
    const goLocked = record.waybill_status === "Invoiced";
    const retLocked =
      !record.return_waybill_id ||
      record.return_waybill_status === "Invoiced";
    return goLocked && retLocked;
  };

  const openStatusModal = (record: TrackingRow) => {
    if (!record.trip_id) {
      message.info("No trip assigned to this waybill yet.");
      return;
    }
    if (record.trip_status === "Completed" || record.trip_status === "Cancelled") {
      message.info("Trip is already completed — status cannot be changed.");
      return;
    }
    if (isWaybillFinalised(record)) {
      message.info("All waybills on this trip are Invoiced — status cannot be changed.");
      return;
    }
    setSelectedTripId(record.trip_id);
    setInitialStatusValues({
      status: record.trip_status,
      current_location: record.current_location,
      return_waybill_id: record.return_waybill_id,
      is_delayed: record.is_delayed,
    });
    setIsStatusModalOpen(true);
  };

  const columns: ColumnsType<TrackingRow> = [
    {
      title: "Tracking No.",
      key: "ids",
      width: 180,
      align: "left",
      render: (_, r) => (
        <Flex vertical gap={2}>
          {/* Go waybill */}
          {r.waybill_number ? (
            <Text strong style={{ color: "#1890ff", fontSize: 13 }}>
              {r.waybill_number}
            </Text>
          ) : null}
          {/* Return waybill (green, with icon) */}
          {r.return_waybill_number && (
            <Tooltip title="Return Waybill">
              <Text style={{ color: "#52c41a", fontSize: 12 }}>
                <SwapOutlined style={{ marginRight: 3 }} />
                {r.return_waybill_number}
              </Text>
            </Tooltip>
          )}
          {/* Trip number */}
          {r.trip_number ? (
            <Text style={{ fontSize: 12, color: "#595959" }}>{r.trip_number}</Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              No Trip
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 170,
      render: (_, r) => (
        <Flex vertical gap={2} align="start">
          {r.waybill_status && (
            <Tag color={STATUS_COLORS[r.waybill_status]} style={{ fontSize: 12 }}>
              Go: {r.waybill_status}
            </Tag>
          )}
          {r.return_waybill_status && (
            <Tag color={STATUS_COLORS[r.return_waybill_status]} style={{ fontSize: 12 }}>
              Ret: {r.return_waybill_status}
            </Tag>
          )}
          <TripStatusTag status={r.trip_status as any} isDelayed={r.is_delayed} />
        </Flex>
      ),
    },
    {
      title: "Client / Cargo",
      key: "entity",
      width: 210,
      render: (_, r) => (
        <Flex vertical gap={0}>
          <Text strong style={{ fontSize: 13 }}>
            {r.client_name || "-"}
          </Text>
          {/* Return client if different */}
          {r.return_client_name && r.return_client_name !== r.client_name && (
            <Text style={{ fontSize: 12, color: "#52c41a" }}>
              <SwapOutlined style={{ marginRight: 3 }} />
              {r.return_client_name}
            </Text>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.cargo_type} • {r.cargo_weight?.toLocaleString("en-US") || 0}kg
          </Text>
          {r.return_cargo_weight && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Ret: {r.return_cargo_type} • {r.return_cargo_weight?.toLocaleString("en-US")}kg
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: "Route / Location",
      key: "route",
      width: 250,
      render: (_, r) => {
        const isReturn = RETURN_STATUSES.has(r.trip_status);
        const from = isReturn && r.return_origin ? r.return_origin : r.origin;
        const to   = isReturn && r.return_destination ? r.return_destination : r.destination;
        const finalised = isWaybillFinalised(r);
        return (
        <Flex vertical gap={0}>
          <Space separator={<Text type="secondary">→</Text>}>
            <Text>{from}</Text>
            <Text>{to}</Text>
          </Space>
          {finalised ? (
            <div>
              <EnvironmentOutlined style={{ marginRight: 4, color: "#8c8c8c" }} />
              <Text type="secondary">{r.current_location || "-"}</Text>
            </div>
          ) : (
            <div onClick={() => openStatusModal(r)} style={{ cursor: "pointer" }}>
              <EnvironmentOutlined style={{ marginRight: 4, color: "#fa8c16" }} />
              <Text type="secondary" underline>
                {r.current_location || "Update Loc"}
              </Text>
            </div>
          )}
        </Flex>
        );
      },
    },
    {
      title: "Days",
      key: "days",
      width: 90,
      align: "center",
      render: (_, r) => (
        <Flex vertical gap={2} align="center">
          <Tooltip title="Overall trip duration">
            <Tag color={r.duration_days > 15 ? "error" : r.duration_days > 7 ? "warning" : "success"}>
              {r.duration_days}d
            </Tag>
          </Tooltip>
          {r.return_duration_days > 0 && (
            <Tooltip title="Return leg duration">
              <Tag color="default" style={{ fontSize: 12 }}>
                Ret: {r.return_duration_days}d
              </Tag>
            </Tooltip>
          )}
        </Flex>
      ),
    },
    {
      title: "Assets",
      key: "assets",
      width: 180,
      render: (_, r) => (
        <Flex vertical gap={0}>
          <Text>
            <CarOutlined /> {r.truck_plate || "-"}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            TL: {r.trailer_plate || "-"}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <UserOutlined /> {r.driver_name || "-"}
          </Text>
        </Flex>
      ),
    },
    {
      title: "Risk",
      key: "risk",
      width: 80,
      render: (_, r) => <Tag color={RISK_COLORS[r.risk_level]}>{r.risk_level}</Tag>,
    },
  ];

  return (
    <div>
      <Card styles={{ body: { padding: "12px 24px" } }}>
        <Flex vertical gap="middle" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/dashboard")}>
                Back
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                Tracking
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                Export Excel
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleClientExport}
                disabled={selectedRowKeys.length === 0}
              >
                Client Export{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ""}
              </Button>
            </Space>
          </div>

          {/* Custom Search Bar */}
          <Card size="small" style={{ background: "#f5f7fa" }}>
            <Form form={searchForm} onFinish={handleSearch} layout="vertical">
              <Row gutter={16}>
                <Col span={4}>
                  <Form.Item name="waybill" style={{ marginBottom: 0 }}>
                    <Input prefix={<FileTextOutlined />} placeholder="Search Waybill #" />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="trip" style={{ marginBottom: 0 }}>
                    <Input prefix={<CarOutlined />} placeholder="Search Trip #" />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="truck" style={{ marginBottom: 0 }}>
                    <Input prefix={<CarOutlined />} placeholder="Truck Plate" />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="client" style={{ marginBottom: 0 }}>
                    <Input prefix={<UserOutlined />} placeholder="Client Name" />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item name="driver" style={{ marginBottom: 0 }}>
                    <Input prefix={<UserOutlined />} placeholder="Driver Name" />
                  </Form.Item>
                </Col>
                <Col span={4} style={{ textAlign: "right" }}>
                  <Space>
                    <Button onClick={handleReset}>Reset</Button>
                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                      Query
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* Trip-centric Tracking Table */}
          <Table<TrackingRow>
            columns={columns}
            dataSource={filteredData}
            rowKey="row_id"
            loading={loading}
            scroll={{ x: 1300 }}
            sticky={{ offsetHeader: 64 }}
            size="small"
            rowSelection={getStandardRowSelection(
              currentPage,
              pageSize,
              selectedRowKeys,
              setSelectedRowKeys
            )}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: filteredData.length,
              showTotal: (total) => `Total ${total} loads`,
              showSizeChanger: true,
              pageSizeOptions: ["50", "100", "200"],
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
          />
        </Flex>
      </Card>

      {/* Status Update Modal */}
      {selectedTripId && (
        <UpdateTripStatusModal
          open={isStatusModalOpen}
          onClose={() => {
            setIsStatusModalOpen(false);
            setSelectedTripId(null);
          }}
          onSuccess={() => invalidateTracking()}
          tripId={selectedTripId}
          initialValues={initialStatusValues}
        />
      )}
    </div>
  );
}
