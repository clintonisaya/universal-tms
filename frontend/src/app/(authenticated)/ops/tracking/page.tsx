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
}

const STATUS_COLORS: Record<string, string> = {
  // Waybill Statuses
  Open: "default",
  "In Progress": "processing",
  Completed: "success",
  Invoiced: "geekblue",
  // Trip Statuses
  Waiting: "default",
  Dispatch: "purple",
  "Wait to Load": "lime",
  Loading: "gold",
  "In Transit": "processing",
  "At Border": "purple",
  Offloading: "cyan",
  // Return leg statuses (Story 2.25)
  "Dispatch (Return)": "purple",
  "Wait to Load (Return)": "lime",
  "Loading (Return)": "gold",
  "In Transit (Return)": "processing",
  "At Border (Return)": "purple",
  "Offloading (Return)": "cyan",
  Returned: "geekblue",
  "Waiting for PODs": "warning",
  Cancelled: "error",
  "Not Dispatched": "default",
};

const RISK_COLORS: Record<string, string> = {
  Low: "success",
  Medium: "warning",
  High: "error",
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

  // Row colour by trip status (Story 2.26)
  const STATUS_ROW_COLORS: Record<string, string> = {
    "In Transit": "D9F2DC",
    "In Transit (Return)": "D9F2DC",
    "Offloading": "D9F2DC",
    "Offloading (Return)": "D9F2DC",
    "Loading": "FFF3CD",
    "Loading (Return)": "FFF3CD",
    "Wait to Load": "FFF3CD",
    "Wait to Load (Return)": "FFF3CD",
    "Dispatch": "FFF3CD",
    "Dispatch (Return)": "FFF3CD",
    "At Border": "FFE0B2",
    "At Border (Return)": "FFE0B2",
    "Not Dispatched": "DDEEFF",
    "Waiting": "DDEEFF",
    "Returned": "EDE7F6",
    "Waiting for PODs": "EDE7F6",
    "Cancelled": "FFCDD2",
    "Completed": "F5F5F5",
  };

  // Excel Export
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Control Tower");

    // Determine max go and return border crossings separately for dynamic columns
    type ColDef = Partial<ExcelJS.Column>;

    const maxGoBorders = filteredData.reduce(
      (max, row) => Math.max(max, (row.border_crossings || []).filter((bc: any) => bc.direction === "go").length),
      0
    );
    const maxReturnBorders = filteredData.reduce(
      (max, row) => Math.max(max, (row.border_crossings || []).filter((bc: any) => bc.direction === "return").length),
      0
    );

    // Helper: days between two ISO date strings (1 decimal)
    const calcDays = (start: string | null | undefined, end: string | null | undefined): number | string => {
      if (!start || !end) return "-";
      const diff = new Date(end).getTime() - new Date(start).getTime();
      if (isNaN(diff) || diff < 0) return "-";
      return Math.round(diff / (1000 * 60 * 60 * 24 * 10)) / 10;
    };

    const goBorderCols: ColDef[] = [];
    for (let i = 0; i < maxGoBorders; i++) {
      const n = i + 1;
      goBorderCols.push(
        { header: `Border ${n} Name`, key: `bcG${n}_name`, width: 22 },
        { header: `Border ${n} Arrived Side A`, key: `bcG${n}_arr_a`, width: 20 },
        { header: `Border ${n} Docs Submitted A`, key: `bcG${n}_sub_a`, width: 20 },
        { header: `Border ${n} Docs Cleared A`, key: `bcG${n}_clr_a`, width: 20 },
        { header: `Border ${n} Crossed (= Arrive Side B)`, key: `bcG${n}_arr_b`, width: 24 },
        { header: `Border ${n} Departed Zone`, key: `bcG${n}_dep`, width: 20 }
      );
    }

    const returnBorderCols: ColDef[] = [];
    for (let i = 0; i < maxReturnBorders; i++) {
      const n = i + 1;
      returnBorderCols.push(
        { header: `Return Border ${n} Name`, key: `bcR${n}_name`, width: 22 },
        { header: `Return Border ${n} Arrived Side A`, key: `bcR${n}_arr_a`, width: 20 },
        { header: `Return Border ${n} Docs Submitted A`, key: `bcR${n}_sub_a`, width: 20 },
        { header: `Return Border ${n} Docs Cleared A`, key: `bcR${n}_clr_a`, width: 20 },
        { header: `Return Border ${n} Crossed (= Arrive Side B)`, key: `bcR${n}_arr_b`, width: 28 },
        { header: `Return Border ${n} Departed Zone`, key: `bcR${n}_dep`, width: 20 }
      );
    }

    // Dynamic days-per-border columns (placed in the Days section)
    const daysBorderGoCols: ColDef[] = [];
    for (let i = 0; i < maxGoBorders; i++) {
      const n = i + 1;
      daysBorderGoCols.push({ header: `Days at Border ${n}`, key: `days_bcG${n}`, width: 16 });
    }
    const daysBorderReturnCols: ColDef[] = [];
    for (let i = 0; i < maxReturnBorders; i++) {
      const n = i + 1;
      daysBorderReturnCols.push({ header: `Days at Return Border ${n}`, key: `days_bcR${n}`, width: 20 });
    }

    worksheet.columns = [
      { header: "No.", key: "index", width: 8 },
      { header: "Trip #", key: "trip_number", width: 20 },
      { header: "Trip Status", key: "trip_status", width: 22 },
      // Go Waybill block
      { header: "Go Waybill #", key: "waybill_number", width: 20 },
      { header: "Go WB Status", key: "waybill_status", width: 15 },
      { header: "Client (Go)", key: "client_name", width: 25 },
      { header: "Origin", key: "origin", width: 25 },
      { header: "Destination", key: "destination", width: 25 },
      { header: "Cargo Type (Go)", key: "cargo_type", width: 20 },
      { header: "Cargo Weight (Go) kg", key: "cargo_weight", width: 18 },
      { header: "Cargo Description (Go)", key: "cargo_description", width: 30 },
      { header: "Risk", key: "risk_level", width: 10 },
      // Return Waybill block
      { header: "Return Waybill #", key: "return_waybill_number", width: 20 },
      { header: "Return WB Status", key: "return_waybill_status", width: 18 },
      { header: "Client (Return)", key: "return_client_name", width: 25 },
      { header: "Return Origin", key: "return_origin", width: 25 },
      { header: "Return Destination", key: "return_destination", width: 25 },
      { header: "Cargo Type (Return)", key: "return_cargo_type", width: 20 },
      { header: "Cargo Weight (Return) kg", key: "return_cargo_weight", width: 22 },
      // Driver block
      { header: "Driver Name", key: "driver_name", width: 22 },
      { header: "Driver Licence", key: "driver_license", width: 18 },
      { header: "Driver Passport", key: "driver_passport", width: 18 },
      { header: "Driver Phone", key: "driver_phone", width: 16 },
      // Truck block
      { header: "Truck Plate", key: "truck_plate", width: 14 },
      // Trailer block
      { header: "Trailer Plate", key: "trailer_plate", width: 14 },
      { header: "Trailer Type", key: "trailer_type", width: 14 },
      // Tracking dates
      { header: "Dispatch Date", key: "dispatch_date", width: 20 },
      { header: "Arrival at Loading", key: "arrival_loading_date", width: 20 },
      { header: "Loading Start", key: "loading_start_date", width: 20 },
      { header: "Loading End", key: "loading_end_date", width: 20 },
      // Go border crossings (happen between loading and offloading)
      ...goBorderCols,
      { header: "Arrival at Offloading", key: "arrival_offloading_date", width: 22 },
      { header: "Offloading Date", key: "offloading_date", width: 20 },
      { header: "Return Dispatch Date", key: "dispatch_return_date", width: 20 },
      { header: "Return Arrival at Loading", key: "arrival_loading_return_date", width: 24 },
      { header: "Return Loading Start", key: "loading_return_start_date", width: 20 },
      { header: "Return Loading End", key: "loading_return_end_date", width: 20 },
      // Return border crossings (happen between return loading and return offloading)
      ...returnBorderCols,
      { header: "Arrival at Return Destination", key: "arrival_return_date", width: 26 },
      // Duration
      { header: "Days (Overall)", key: "duration_days", width: 14 },
      { header: "Days (Return Leg)", key: "return_duration_days", width: 16 },
      { header: "Days at Loading", key: "days_loading", width: 16 },
      { header: "Days at Loading (Return)", key: "days_loading_return", width: 22 },
      ...daysBorderGoCols,
      ...daysBorderReturnCols,
      // Location
      { header: "Current Location", key: "current_location", width: 25 },
    ] as Partial<ExcelJS.Column>[];

    // Bold header row + freeze
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    const fmtDate = (d: string | null | undefined) =>
      d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

    filteredData.forEach((row, index) => {
      const borderData: Record<string, string> = {};
      const goCrossings = (row.border_crossings || []).filter((bc: any) => bc.direction === "go");
      const returnCrossings = (row.border_crossings || []).filter((bc: any) => bc.direction === "return");

      goCrossings.forEach((bc: any, i: number) => {
        const n = i + 1;
        borderData[`bcG${n}_name`] = bc.border_display_name || "-";
        borderData[`bcG${n}_arr_a`] = fmtDate(bc.arrived_side_a_at);
        borderData[`bcG${n}_sub_a`] = fmtDate(bc.documents_submitted_side_a_at);
        borderData[`bcG${n}_clr_a`] = fmtDate(bc.documents_cleared_side_a_at);
        borderData[`bcG${n}_arr_b`] = fmtDate(bc.arrived_side_b_at);
        borderData[`bcG${n}_dep`] = fmtDate(bc.departed_border_at);
        (borderData as any)[`days_bcG${n}`] = calcDays(bc.arrived_side_a_at, bc.departed_border_at);
      });

      returnCrossings.forEach((bc: any, i: number) => {
        const n = i + 1;
        borderData[`bcR${n}_name`] = bc.border_display_name || "-";
        borderData[`bcR${n}_arr_a`] = fmtDate(bc.arrived_side_a_at);
        borderData[`bcR${n}_sub_a`] = fmtDate(bc.documents_submitted_side_a_at);
        borderData[`bcR${n}_clr_a`] = fmtDate(bc.documents_cleared_side_a_at);
        borderData[`bcR${n}_arr_b`] = fmtDate(bc.arrived_side_b_at);
        borderData[`bcR${n}_dep`] = fmtDate(bc.departed_border_at);
        (borderData as any)[`days_bcR${n}`] = calcDays(bc.arrived_side_a_at, bc.departed_border_at);
      });

      const excelRow = worksheet.addRow({
        index: index + 1,
        trip_number: row.trip_number || "-",
        trip_status: row.trip_status,
        waybill_number: row.waybill_number || "-",
        waybill_status: row.waybill_status || "-",
        client_name: row.client_name || "-",
        origin: (row as any).origin || "-",
        destination: (row as any).destination || "-",
        cargo_type: row.cargo_type || "-",
        cargo_weight: row.cargo_weight || 0,
        cargo_description: (row as any).cargo_description || "-",
        risk_level: row.risk_level,
        return_waybill_number: row.return_waybill_number || "-",
        return_waybill_status: row.return_waybill_status || "-",
        return_client_name: row.return_client_name || "-",
        return_origin: (row as any).return_origin || "-",
        return_destination: (row as any).return_destination || "-",
        return_cargo_type: row.return_cargo_type || "-",
        return_cargo_weight: row.return_cargo_weight ?? "-",
        driver_name: row.driver_name || "-",
        driver_license: (row as any).driver_license || "-",
        driver_passport: (row as any).driver_passport || "-",
        driver_phone: (row as any).driver_phone || "-",
        truck_plate: row.truck_plate || "-",
        trailer_plate: row.trailer_plate || "-",
        trailer_type: (row as any).trailer_type || "-",
        dispatch_date: fmtDate((row as any).dispatch_date),
        arrival_loading_date: fmtDate((row as any).arrival_loading_date),
        loading_start_date: fmtDate((row as any).loading_start_date),
        loading_end_date: fmtDate((row as any).loading_end_date),
        arrival_offloading_date: fmtDate((row as any).arrival_offloading_date),
        offloading_date: fmtDate((row as any).offloading_date),
        dispatch_return_date: fmtDate((row as any).dispatch_return_date),
        arrival_loading_return_date: fmtDate((row as any).arrival_loading_return_date),
        loading_return_start_date: fmtDate((row as any).loading_return_start_date),
        loading_return_end_date: fmtDate((row as any).loading_return_end_date),
        arrival_return_date: fmtDate((row as any).arrival_return_date),
        duration_days: row.duration_days,
        return_duration_days: row.return_duration_days || 0,
        days_loading: calcDays(row.arrival_loading_date, row.loading_end_date),
        days_loading_return: calcDays(row.arrival_loading_return_date, row.loading_return_end_date),
        current_location: row.current_location || "-",
        ...borderData,
      });

      // Apply row colour fill by trip status
      const statusColor = STATUS_ROW_COLORS[row.trip_status] ?? "FFFFFF";
      excelRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${statusColor}` },
        };
      });
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

  const openStatusModal = (record: TrackingRow) => {
    if (!record.trip_id) {
      message.info("No trip assigned to this waybill yet.");
      return;
    }
    setSelectedTripId(record.trip_id);
    setInitialStatusValues({
      status: record.trip_status,
      current_location: record.current_location,
      return_waybill_id: record.return_waybill_id,
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
          <Tag color={STATUS_COLORS[r.trip_status]} style={{ fontSize: 12 }}>
            Trip: {r.trip_status}
          </Tag>
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
      render: (_, r) => (
        <Flex vertical gap={0}>
          <Space separator={<Text type="secondary">→</Text>}>
            <Text>{r.origin}</Text>
            <Text>{r.destination}</Text>
          </Space>
          <div onClick={() => openStatusModal(r)} style={{ cursor: "pointer" }}>
            <EnvironmentOutlined style={{ marginRight: 4, color: "#fa8c16" }} />
            <Text type="secondary" underline>
              {r.current_location || "Update Loc"}
            </Text>
          </div>
        </Flex>
      ),
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
                Control Tower
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                Export Excel
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
