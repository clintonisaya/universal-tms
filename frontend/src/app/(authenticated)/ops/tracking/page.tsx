"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Flex,
  Space,
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
import { useAuth } from "@/contexts/AuthContext";
import { useTracking, useInvalidateQueries } from "@/hooks/useApi";
import { useTrackingExport, STATUS_COLORS, RISK_COLORS, RETURN_STATUSES, type TrackingRow } from "@/hooks/useTrackingExport";
import { UpdateTripStatusModal } from "@/components/trips/UpdateTripStatusModal";
import { TripStatusTag } from "@/components/ui/TripStatusTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getStandardRowSelection } from "@/components/ui/tableUtils";

const { Title, Text } = Typography;

function TrackingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { invalidateTracking } = useInvalidateQueries();
  const { handleExport, handleClientExport } = useTrackingExport();

  const isAuthenticated = !!user;

  // Server-side pagination & filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [serverSearch, setServerSearch] = useState<string>("");
  const [searchForm] = Form.useForm();

  // Initialise search form from URL params on mount
  useEffect(() => {
    const fields = ["waybill", "trip", "truck", "trailer", "client", "driver"];
    const values: Record<string, string> = {};
    fields.forEach((f) => { const v = searchParams.get(f); if (v) values[f] = v; });
    if (Object.keys(values).length > 0) {
      searchForm.setFieldsValue(values);
      const combined = Object.values(values).filter(Boolean).join(" ");
      if (combined) setServerSearch(combined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Server-side paginated query
  const { data: apiResponse, isLoading: loading, refetch } = useTracking(
    { skip: (currentPage - 1) * pageSize, limit: pageSize, search: serverSearch || undefined },
    isAuthenticated,
  );
  const trackingData = apiResponse?.data || [];
  const totalCount = apiResponse?.count || 0;

  // Status Update Modal State
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [initialStatusValues, setInitialStatusValues] = useState<any>(null);

  // Standard Table States
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleSearch = (values: any) => {
    const terms = Object.values(values).filter(Boolean) as string[];
    setServerSearch(terms.join(" "));
    setCurrentPage(1);
    const params = new URLSearchParams();
    Object.entries(values).forEach(([k, v]) => { if (v) params.set(k, v as string); });
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleReset = () => {
    searchForm.resetFields();
    setServerSearch("");
    setCurrentPage(1);
    router.replace("?", { scroll: false });
  };

  // Only "Invoiced" locks the record
  const isWaybillFinalised = (record: TrackingRow): boolean => {
    const goLocked = record.waybill_status === "Invoiced";
    const retLocked = !record.return_waybill_id || record.return_waybill_status === "Invoiced";
    return goLocked && retLocked;
  };

  const openStatusModal = (record: TrackingRow) => {
    if (!record.trip_id) { message.info("No trip assigned to this waybill yet."); return; }
    if (record.trip_status === "Completed" || record.trip_status === "Cancelled") { message.info("Trip is already completed — status cannot be changed."); return; }
    if (isWaybillFinalised(record)) { message.info("All waybills on this trip are Invoiced — status cannot be changed."); return; }
    setSelectedTripId(record.trip_id);
    setInitialStatusValues({
      status: record.trip_status,
      current_location: record.current_location,
      return_waybill_id: record.return_waybill_id,
      is_delayed: record.is_delayed,
    });
    setIsStatusModalOpen(true);
  };

  // Truncated text with tooltip
  const truncatedCell = (text: string | null, maxWidth = 150) => (
    <Tooltip title={text}>
      <div style={{ maxWidth, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {text || "—"}
      </div>
    </Tooltip>
  );

  const fmtDateCol = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  const columns: ColumnsType<TrackingRow> = [
    {
      title: "Tracking No.", key: "ids", width: 180, align: "left",
      render: (_, r) => (
        <Flex vertical gap={2}>
          {r.waybill_number && (
            <Text strong style={{ color: "var(--color-primary)", fontSize: "var(--font-sm)" }}>{r.waybill_number}</Text>
          )}
          {r.return_waybill_number && (
            <Tooltip title="Return Waybill">
              <Text style={{ color: "var(--color-green)", fontSize: "var(--font-sm)" }}>
                <SwapOutlined style={{ marginRight: 3 }} />{r.return_waybill_number}
              </Text>
            </Tooltip>
          )}
          {r.trip_number ? (
            <Text style={{ fontSize: "var(--font-sm)", color: "var(--color-text-secondary)" }}>{r.trip_number}</Text>
          ) : (
            <Text type="secondary">No Trip</Text>
          )}
        </Flex>
      ),
    },
    {
      title: "Status", key: "status", width: 170,
      render: (_, r) => (
        <Flex vertical gap={2} align="start">
          {r.waybill_status && <StatusBadge status={`Go: ${r.waybill_status}`} colorKey={STATUS_COLORS[r.waybill_status]} />}
          {r.return_waybill_status && <StatusBadge status={`Ret: ${r.return_waybill_status}`} colorKey={STATUS_COLORS[r.return_waybill_status]} />}
          <TripStatusTag status={r.trip_status as any} isDelayed={r.is_delayed} />
        </Flex>
      ),
    },
    {
      title: "Client / Cargo", key: "entity", width: 210,
      render: (_, r) => (
        <Flex vertical gap={0}>
          {truncatedCell(r.client_name, 190)}
          {r.return_client_name && r.return_client_name !== r.client_name && (
            <Text style={{ fontSize: "var(--font-sm)", color: "var(--color-green)" }}>
              <SwapOutlined style={{ marginRight: 3 }} />{r.return_client_name}
            </Text>
          )}
          <Tooltip title={r.cargo_description}>
            <Text type="secondary" style={{ maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
              {r.cargo_type} • {r.cargo_weight?.toLocaleString("en-US") || 0}kg{r.cargo_description ? ` — ${r.cargo_description}` : ""}
            </Text>
          </Tooltip>
          {r.return_cargo_weight && (
            <Text type="secondary">Ret: {r.return_cargo_type} • {r.return_cargo_weight?.toLocaleString("en-US")}kg</Text>
          )}
        </Flex>
      ),
    },
    {
      title: "Route / Location", key: "route", width: 250,
      render: (_, r) => {
        const isReturn = RETURN_STATUSES.has(r.trip_status);
        const from = isReturn && r.return_origin ? r.return_origin : r.origin;
        const to = isReturn && r.return_destination ? r.return_destination : r.destination;
        const finalised = isWaybillFinalised(r);
        return (
          <Flex vertical gap={0}>
            <Space separator={<Text type="secondary">→</Text>}>
              <Tooltip title={from}><Text style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>{from}</Text></Tooltip>
              <Tooltip title={to}><Text style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>{to}</Text></Tooltip>
            </Space>
            {finalised ? (
              <Tooltip title={r.current_location}>
                <div>
                  <EnvironmentOutlined style={{ marginRight: 4, color: "var(--color-text-muted)" }} />
                  <Text type="secondary">{r.current_location || "-"}</Text>
                </div>
              </Tooltip>
            ) : (
              <Tooltip title={r.current_location}>
                <div onClick={() => openStatusModal(r)} style={{ cursor: "pointer" }}>
                  <EnvironmentOutlined style={{ marginRight: 4, color: "var(--color-orange)" }} />
                  <Text type="secondary" underline>{r.current_location || "Update Loc"}</Text>
                </div>
              </Tooltip>
            )}
          </Flex>
        );
      },
    },
    {
      title: "Days", key: "days", width: 90, align: "center",
      render: (_, r) => (
        <Flex vertical gap={2} align="center">
          <Tooltip title="Overall trip duration">
            <StatusBadge status={`${r.duration_days}d`} colorKey={r.duration_days > 15 ? "red" : r.duration_days > 7 ? "orange" : "green"} />
          </Tooltip>
          {r.return_duration_days > 0 && (
            <Tooltip title="Return leg duration">
              <StatusBadge status={`Ret: ${r.return_duration_days}d`} colorKey="gray" />
            </Tooltip>
          )}
        </Flex>
      ),
    },
    {
      title: "Assets", key: "assets", width: 180,
      render: (_, r) => (
        <Flex vertical gap={0}>
          <Text><CarOutlined /> {r.truck_plate || "-"}</Text>
          <Text type="secondary">TL: {r.trailer_plate || "-"}</Text>
          <Text type="secondary"><UserOutlined /> {r.driver_name || "-"}</Text>
        </Flex>
      ),
    },
    { title: "Risk", key: "risk", width: 80, render: (_, r) => <StatusBadge status={r.risk_level} colorKey={RISK_COLORS[r.risk_level]} /> },
    { title: "Arrival Offloading", key: "arrival_offloading_date", width: 130, render: (_, r) => <Text type="secondary">{fmtDateCol(r.arrival_offloading_date)}</Text> },
    { title: "Ret Empty Container", key: "return_empty_container_date", width: 140, render: (_, r) => <Text type="secondary">{fmtDateCol(r.return_empty_container_date)}</Text> },
  ];

  return (
    <div>
      <Card styles={{ body: { padding: "12px 24px" } }}>
        <Flex vertical gap="middle" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/dashboard")}>Back</Button>
              <Title level={3} style={{ margin: 0 }}>Tracking</Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
              <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleExport(serverSearch)}>Export Excel</Button>
              <Button icon={<DownloadOutlined />} onClick={() => {
                const keySet = new Set(selectedRowKeys.map(String));
                const rows = trackingData.filter((r) => keySet.has(String(r.row_id)));
                handleClientExport(rows);
              }} disabled={selectedRowKeys.length === 0}>
                Client Export{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ""}
              </Button>
            </Space>
          </div>

          {/* Custom Search Bar */}
          <Card size="small" style={{ background: "var(--color-surface)" }}>
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
                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>Query</Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* Tracking Table */}
          <Table<TrackingRow>
            columns={columns}
            dataSource={trackingData}
            rowKey="row_id"
            loading={loading}
            scroll={{ x: 1300 }}
            sticky={{ offsetHeader: 64 }}
            size="small"
            rowSelection={getStandardRowSelection(currentPage, pageSize, selectedRowKeys, setSelectedRowKeys)}
            pagination={{
              current: currentPage, pageSize, total: totalCount,
              showTotal: (total) => `Total ${total} loads`,
              showSizeChanger: true, pageSizeOptions: ["50", "100", "200"],
              onChange: (page, size) => { setCurrentPage(page); setPageSize(size); },
            }}
          />
        </Flex>
      </Card>

      {/* Status Update Modal */}
      {selectedTripId && (
        <UpdateTripStatusModal
          open={isStatusModalOpen}
          onClose={() => { setIsStatusModalOpen(false); setSelectedTripId(null); }}
          onSuccess={() => invalidateTracking()}
          tripId={selectedTripId}
          initialValues={initialStatusValues}
        />
      )}
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense>
      <TrackingPageContent />
    </Suspense>
  );
}
