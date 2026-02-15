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
import { useTracking, useInvalidateQueries } from "@/hooks/useApi";
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
  
  // 6. Risk
  risk_level: string;
  
  // Meta
  start_date: string | null;
  duration_days: number;
}

const STATUS_COLORS: Record<string, string> = {
  // Waybill Statuses
  Open: "blue",
  "In Progress": "processing",
  Completed: "green",
  Invoiced: "purple",
  // Trip Statuses
  Waiting: "default",
  Dispatch: "purple",
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
  const { user } = useAuth();
  const { invalidateTracking } = useInvalidateQueries();

  // Only fetch when user is authenticated
  const isAuthenticated = !!user;

  // TanStack Query for tracking data
  const { data: rawData, isLoading: loading, refetch } = useTracking(isAuthenticated);
  const data = rawData || [];

  const [filteredData, setFilteredData] = useState<TrackingRow[]>([]);

  // Filter States
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
  const applySearch = (
    rawData: TrackingRow[], 
    searchValues: any
  ) => {
    let results = [...rawData];

    // Search Bar Filter
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

    worksheet.columns = [
      { header: "No.", key: "index", width: 8 },
      { header: "IDs", key: "ids", width: 25 },
      { header: "Status", key: "status", width: 20 },
      { header: "Client / Cargo", key: "client_cargo", width: 30 },
      { header: "Route / Location", key: "route_loc", width: 35 },
      { header: "Days", key: "duration_days", width: 10 },
      { header: "Assets", key: "assets", width: 25 },
      { header: "Risk", key: "risk_level", width: 15 },
    ];

    filteredData.forEach((row, index) => {
      worksheet.addRow({
        index: index + 1,
        ids: `${row.waybill_number}\n${row.trip_number || '-'}`,
        status: `${row.waybill_status} / ${row.trip_status}`,
        client_cargo: `${row.client_name}\n${row.cargo_description} (${row.cargo_weight}kg)`,
        route_loc: `${row.origin} -> ${row.destination}\n${row.current_location || '-'}`,
        duration_days: row.duration_days,
        assets: `${row.truck_plate || '-'} / ${row.trailer_plate || '-'}\n${row.driver_name || '-'}`,
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
      title: "Tracking No.",
      key: "ids",
      width: 160,
      align: "left",
      render: (_, r) => (
        <Flex vertical gap={0}>
           <Text strong style={{ color: '#1890ff', cursor: 'pointer' }}>{r.waybill_number}</Text>
           {r.trip_number ? (
             <Text style={{ fontSize: 12, color: '#595959' }}>{r.trip_number}</Text>
           ) : <Text type="secondary" style={{ fontSize: 12 }}>No Trip</Text>}
        </Flex>
      )
    },
    {
      title: "Status",
      key: "status",
      width: 140,
      render: (_, r) => (
        <Flex vertical gap={2} align="start">
            <Tag color={STATUS_COLORS[r.waybill_status]}>WB: {r.waybill_status}</Tag>
            <Tag color={STATUS_COLORS[r.trip_status]}>Trip: {r.trip_status}</Tag>
        </Flex>
      )
    },
    {
      title: "Client / Cargo",
      key: "entity",
      width: 200,
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
      title: "Route / Location",
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
        title: "Days",
        key: "days",
        width: 80,
        align: "center",
        render: (_, r) => (
            <Tag color={r.duration_days > 15 ? "red" : r.duration_days > 7 ? "orange" : "green"}>
                {r.duration_days}d
            </Tag>
        )
    },
    {
      title: "Assets",
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
      title: "Risk",
      key: "risk",
      width: 100,
      render: (_, r) => <Tag color={RISK_COLORS[r.risk_level]}>{r.risk_level}</Tag>
    }
  ];

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
                    <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                        Export Excel
                    </Button>
                </Space>
            </div>

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
            onSuccess={() => invalidateTracking()}
            tripId={selectedTripId}
            initialValues={initialStatusValues}
        />
      )}
    </div>
  );
}
