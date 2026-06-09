"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ProTable,
  ProColumns,
} from "@ant-design/pro-components";
import type { ActionType } from "@ant-design/pro-components";
import {
  Button,
  Flex,
  Space,
  Input,
  Tooltip,
  Card,
  Form,
  Row,
  Col,
  App,
  Typography,
} from "antd";
import {
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
  CarOutlined,
  UserOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useInvalidateQueries, apiFetch } from "@/hooks/application/useApi";
import { useTrackingExport, STATUS_COLORS, RISK_COLORS, RETURN_STATUSES, type TrackingRow } from "@/hooks/application/useTrackingExport";
import { UpdateTripStatusModal } from "@/components/trips/UpdateTripStatusModal";
import { TripStatusTag } from "@/components/ui/TripStatusTag";
import { StatusBadge } from "@/components/ui/StatusBadge";

const { Text } = Typography;

function TrackingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { user } = useAuth();
  const { invalidateTracking } = useInvalidateQueries();
  const { handleExport, handleClientExport } = useTrackingExport();
  const actionRef = useRef<ActionType>();

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

  // Status Update Modal State
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [initialStatusValues, setInitialStatusValues] = useState<any>(null);

  // Row selection state
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [trackingData, setTrackingData] = useState<TrackingRow[]>([]);

  const handleSearch = (values: any) => {
    const terms = Object.values(values).filter(Boolean) as string[];
    setServerSearch(terms.join(" "));
    setCurrentPage(1);
    const params = new URLSearchParams();
    Object.entries(values).forEach(([k, v]) => { if (v) params.set(k, v as string); });
    router.replace(`?${params.toString()}`, { scroll: false });
    actionRef.current?.reload();
  };

  const handleReset = () => {
    searchForm.resetFields();
    setServerSearch("");
    setCurrentPage(1);
    router.replace("?", { scroll: false });
    actionRef.current?.reload();
  };

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

  const truncatedCell = (text: string | null, maxWidth = 150) => (
    <Tooltip title={text}>
      <div style={{ maxWidth, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {text || "—"}
      </div>
    </Tooltip>
  );

  const fmtDateCol = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

  const columns: ProColumns<TrackingRow>[] = [
    {
      title: "Tracking No.",
      key: "ids",
      width: 180,
      align: "left",
      search: false,
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
      title: "Status",
      key: "status",
      width: 170,
      search: false,
      render: (_, r) => (
        <Flex vertical gap={2} align="start">
          {r.waybill_status && <StatusBadge status={`Go: ${r.waybill_status}`} colorKey={STATUS_COLORS[r.waybill_status]} />}
          {r.return_waybill_status && <StatusBadge status={`Ret: ${r.return_waybill_status}`} colorKey={STATUS_COLORS[r.return_waybill_status]} />}
          <TripStatusTag status={r.trip_status as any} isDelayed={r.is_delayed} />
        </Flex>
      ),
    },
    {
      title: "Client / Cargo",
      key: "entity",
      width: 210,
      search: false,
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
      title: "Route / Location",
      key: "route",
      width: 250,
      search: false,
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
      title: "Days",
      key: "days",
      width: 90,
      align: "center",
      search: false,
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
      title: "Assets",
      key: "assets",
      width: 180,
      search: false,
      render: (_, r) => (
        <Flex vertical gap={0}>
          <Text><CarOutlined /> {r.truck_plate || "-"}</Text>
          <Text type="secondary">TL: {r.trailer_plate || "-"}</Text>
          <Text type="secondary"><UserOutlined /> {r.driver_name || "-"}</Text>
        </Flex>
      ),
    },
    {
      title: "Risk",
      key: "risk",
      width: 80,
      search: false,
      render: (_, r) => <StatusBadge status={r.risk_level} colorKey={RISK_COLORS[r.risk_level]} />,
    },
    {
      title: "Arrival Offloading",
      key: "arrival_offloading_date",
      width: 130,
      search: false,
      render: (_, r) => <Text type="secondary">{fmtDateCol(r.arrival_offloading_date)}</Text>,
    },
    {
      title: "Ret Empty Container",
      key: "return_empty_container_date",
      width: 140,
      search: false,
      render: (_, r) => <Text type="secondary">{fmtDateCol(r.return_empty_container_date)}</Text>,
    },
  ];

  return (
    <>
      <Card styles={{ body: { padding: "12px 24px" } }}>
        <Flex vertical gap="middle" style={{ width: "100%" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography.Title level={3} style={{ margin: 0 }}>Tracking</Typography.Title>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => actionRef.current?.reload()}>Refresh</Button>
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
          <ProTable<TrackingRow>
            actionRef={actionRef}
            columns={columns}
            rowKey="row_id"
            search={false}
            request={async (params) => {
              const { current, pageSize: size } = params;
              const pg = current || 1;
              const ps = size || 50;
              setCurrentPage(pg);
              setPageSize(ps);
              const skip = (pg - 1) * ps;
              const data = await apiFetch<{ data: TrackingRow[]; count: number }>(
                `/api/v1/reports/waybill-tracking?skip=${skip}&limit=${ps}${serverSearch ? `&search=${encodeURIComponent(serverSearch)}` : ""}`
              );
              setTrackingData(data.data || []);
              return {
                data: data.data || [],
                total: data.count || 0,
                success: true,
              };
            }}
            params={{ search: serverSearch }}
            scroll={{ x: 1300 }}
            size="small"
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              showTotal: (total) => `Total ${total} loads`,
              showSizeChanger: true,
              pageSizeOptions: ["50", "100", "200"],
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            toolBarRender={false}
          />
        </Flex>
      </Card>

      {/* Status Update Modal */}
      {selectedTripId && (
        <UpdateTripStatusModal
          open={isStatusModalOpen}
          onClose={() => { setIsStatusModalOpen(false); setSelectedTripId(null); }}
          onSuccess={() => {
            actionRef.current?.reload();
          }}
          tripId={selectedTripId}
          initialValues={initialStatusValues}
        />
      )}
    </>
  );
}

export default function TrackingPage() {
  return (
    <App>
      <Suspense>
        <TrackingPageContent />
      </Suspense>
    </App>
  );
}
