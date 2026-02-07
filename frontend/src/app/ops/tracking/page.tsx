"use client";

import { useState, useEffect, useCallback } from "react";
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
  Tooltip,
  Segmented,
  Form,
  Row,
  Col,
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
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import ExcelJS from "exceljs";
import { useAuth } from "@/contexts/AuthContext";
import { UpdateTripStatusModal } from "@/components/trips/UpdateTripStatusModal";
import { getStandardRowSelection } from "@/components/ui/tableUtils";

const { Title, Text } = Typography;

// --- Types for Flattened Report Data (Updated for Rich View) ---
interface TrackingRow {
  // 1. Status Plls
  waybill_status: string;
  trip_status: string;
  
  // 2. IDs
  waybill_id: string;
  waybill_number: string;
  trip_id: string | null;
  trip_number: string | null;
  
  // 3. Entity Info
  client_name: string;
  cargo_type: string | null;
  cargo_weight: number;
  cargo_description: string;
  
  // 4. Route Info
  origin: string;
  destination: string;
  current_location: string | null;
  border_location: string | null;
  
  // 5. Asset Info
  truck_plate: string | null;
  driver_name: string | null;
  trailer_plate: string | null;
  
  // 6. Metrics
  mileage_km: number;
  fuel_consumption_liters: number;
  
  // 7. Risk
  risk_level: string;
  
  // Meta
  start_date: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  // Waybill Statuses
  Open: "blue",
  "In Progress": "processing",
  Completed: "green",
  Invoiced: "purple",
  // Trip Statuses
  Loading: "gold",
  "In Transit": "cyan",
  "At Border": "orange",
  Offloaded: "lime",
  Returned: "geekblue",
  "Waiting for PODs": "volcano",
  Cancelled: "red",
  "Not Dispatched": "default",
};

const RISK_COLORS: Record<string, string> = {
    Low: "success",
    Medium: "warning",
    High: "error",
};

export default function TrackingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [data, setData] = useState<TrackingRow[]>([]);
  const [filteredData, setFilteredData] = useState<TrackingRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [activeTab, setActiveTab] = useState<string>("All");
  const [searchForm] = Form.useForm();
  
  // Status Update Modal State
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [initialStatusValues, setInitialStatusValues] = useState<any>(null);

  // Standard Table States
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/reports/waybill-tracking", {
        credentials: "include",
      });
      if (response.ok) {
        const result = await response.json();
        setData(result);
        applyFilters(result, activeTab, searchForm.getFieldsValue());
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        message.error("Failed to fetch tracking report");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [router, activeTab, searchForm]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchReport();
    }
  }, [authLoading, user, fetchReport]);

  // Combined Filter Logic
  const applyFilters = (
    rawData: TrackingRow[], 
    tab: string, 
    searchValues: any
  ) => {
    let results = [...rawData];

    // 1. Tab Filter (Trip Status)
    if (tab !== "All") {
        results = results.filter(item => {
            if (tab === "Loading") return item.trip_status === "Loading";
            if (tab === "Tracking") return ["In Transit", "At Border", "En Route"].includes(item.trip_status);
            if (tab === "Received") return ["Offloaded", "Completed"].includes(item.trip_status);
            if (tab === "POD Collected") return item.trip_status === "Waiting for PODs";
            return true;
        });
    }

    // 2. Search Bar Filter
    if (searchValues) {
        const { waybill, trip, truck, trailer, client, driver } = searchValues;
        if (waybill) results = results.filter(r => r.waybill_number.toLowerCase().includes(waybill.toLowerCase()));
        if (trip) results = results.filter(r => r.trip_number?.toLowerCase().includes(trip.toLowerCase()));
        if (truck) results = results.filter(r => r.truck_plate?.toLowerCase().includes(truck.toLowerCase()));
        if (trailer) results = results.filter(r => r.trailer_plate?.toLowerCase().includes(trailer.toLowerCase()));
        if (client) results = results.filter(r => r.client_name.toLowerCase().includes(client.toLowerCase()));
        if (driver) results = results.filter(r => r.driver_name?.toLowerCase().includes(driver.toLowerCase()));
    }

    setFilteredData(results);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    applyFilters(data, value, searchForm.getFieldsValue());
  };

  const handleSearch = (values: any) => {
    applyFilters(data, activeTab, values);
  };

  const handleReset = () => {
      searchForm.resetFields();
      applyFilters(data, activeTab, {});
  };

  // Excel Export
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Control Tower");

    worksheet.columns = [
      { header: "Waybill #", key: "waybill_number", width: 20 },
      { header: "Trip #", key: "trip_number", width: 20 },
      { header: "Waybill Status", key: "waybill_status", width: 15 },
      { header: "Trip Status", key: "trip_status", width: 15 },
      { header: "Client", key: "client_name", width: 25 },
      { header: "Cargo", key: "cargo", width: 30 },
      { header: "Route", key: "route", width: 30 },
      { header: "Current Location", key: "current_location", width: 25 },
      { header: "Truck/Trailer", key: "truck_trailer", width: 25 },
      { header: "Driver", key: "driver_name", width: 20 },
      { header: "Mileage", key: "mileage_km", width: 15 },
      { header: "Risk", key: "risk_level", width: 15 },
    ];

    filteredData.forEach((row) => {
      worksheet.addRow({
        waybill_number: row.waybill_number,
        trip_number: row.trip_number || "-",
        waybill_status: row.waybill_status,
        trip_status: row.trip_status,
        client_name: row.client_name,
        cargo: `${row.cargo_description} (${row.cargo_weight}kg)`,
        route: `${row.origin} -> ${row.destination}`,
        current_location: row.current_location || "-",
        truck_trailer: `${row.truck_plate || '-'} / ${row.trailer_plate || '-'}`,
        driver_name: row.driver_name || "-",
        mileage_km: row.mileage_km,
        risk_level: row.risk_level,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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
    });
    setIsStatusModalOpen(true);
  };

  const columns: ColumnsType<TrackingRow> = [
    {
      title: "Status Plls",
      key: "status",
      width: 140,
      fixed: "left",
      render: (_, r) => (
        <Flex vertical gap={2}>
            <Tag color={STATUS_COLORS[r.waybill_status]}>WB: {r.waybill_status}</Tag>
            <Tag color={STATUS_COLORS[r.trip_status]}>Trip: {r.trip_status}</Tag>
        </Flex>
      )
    },
    {
      title: "IDs",
      key: "ids",
      width: 140,
      fixed: "left",
      render: (_, r) => (
        <Flex vertical gap={0}>
           <Text strong style={{ color: '#1890ff', cursor: 'pointer' }}>{r.waybill_number}</Text>
           {r.trip_number ? (
             <Text style={{ fontSize: 12, color: '#1890ff' }}>{r.trip_number}</Text>
           ) : <Text type="secondary" style={{ fontSize: 12 }}>No Trip</Text>}
        </Flex>
      )
    },
    {
      title: "Entity Info",
      key: "entity",
      width: 180,
      render: (_, r) => (
        <Flex vertical gap={0}>
            <Text strong>{r.client_name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
                {r.cargo_type} • {r.cargo_weight.toLocaleString()}kg
            </Text>
        </Flex>
      )
    },
    {
      title: "Route Info",
      key: "route",
      width: 250,
      render: (_, r) => (
        <Flex vertical gap={0}>
             <Space separator={<Text type="secondary">→</Text>}>
                <Text>{r.origin}</Text>
                <Text>{r.destination}</Text>
             </Space>
             <div onClick={() => openStatusModal(r)} style={{ cursor: 'pointer' }}>
                <EnvironmentOutlined style={{ marginRight: 4, color: '#fa8c16' }} />
                <Text type="secondary" underline>
                    {r.current_location || "Update Loc"}
                </Text>
             </div>
        </Flex>
      )
    },
    {
      title: "Asset Info",
      key: "assets",
      width: 180,
      render: (_, r) => (
        <Flex vertical gap={0}>
             <Text><CarOutlined /> {r.truck_plate || "-"}</Text>
             <Text type="secondary" style={{ fontSize: 12 }}>TL: {r.trailer_plate || "-"}</Text>
             <Text type="secondary" style={{ fontSize: 12 }}><UserOutlined /> {r.driver_name || "-"}</Text>
        </Flex>
      )
    },
    {
      title: "Metrics",
      key: "metrics",
      width: 120,
      render: (_, r) => (
        <Flex vertical gap={0}>
             <Text>{r.mileage_km} km</Text>
             <Text type="secondary" style={{ fontSize: 12 }}>{r.fuel_consumption_liters} L</Text>
        </Flex>
      )
    },
    {
      title: "Risk",
      key: "risk",
      width: 100,
      render: (_, r) => <Tag color={RISK_COLORS[r.risk_level]}>{r.risk_level}</Tag>
    }
  ];

  if (authLoading) return null; // Or spinner

  return (
    <div>
      <Card styles={{ body: { padding: '12px 24px' } }}>
          <Flex vertical gap="middle" style={{ width: "100%" }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/dashboard")}>
                        Back
                    </Button>
                    <Title level={3} style={{ margin: 0 }}>Control Tower</Title>
                </Space>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchReport}>Refresh</Button>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                        Export Excel
                    </Button>
                </Space>
            </div>

            {/* Top Tabs */}
            <Segmented
                options={['All', 'Loading', 'Tracking', 'Received', 'POD Collected']}
                value={activeTab}
                onChange={handleTabChange}
                block
                size="large"
            />

            {/* Custom Search Bar */}
            <Card size="small" style={{ background: '#f5f7fa' }}>
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
                        <Col span={4} style={{ textAlign: 'right' }}>
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

            {/* Rich Grid Table */}
            <Table<TrackingRow>
                columns={columns}
                dataSource={filteredData}
                rowKey="waybill_id"
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
                    pageSizeOptions: ['50', '100', '200'],
                    onChange: (page, size) => {
                      setCurrentPage(page);
                      setPageSize(size);
                    },
                }}
            />
          </Flex>
      </Card>

      {/* Re-use Status Update Modal */}
      {selectedTripId && (
        <UpdateTripStatusModal
            open={isStatusModalOpen}
            onClose={() => {
                setIsStatusModalOpen(false);
                setSelectedTripId(null);
            }}
            onSuccess={fetchReport}
            tripId={selectedTripId}
            initialValues={initialStatusValues}
        />
      )}
    </div>
  );
}
