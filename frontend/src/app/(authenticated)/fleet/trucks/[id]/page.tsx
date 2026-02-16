"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  Button,
  Flex,
  Space,
  Tabs,
  Tag,
  Descriptions,
  Table,
  Statistic,
  message,
  Typography,
  Spin,
} from "antd";
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Truck } from "@/types/truck";
import type {
  MaintenanceEvent,
  MaintenanceHistoryResponse,
} from "@/types/maintenance";
import { useAuth } from "@/contexts/AuthContext";
import {
  getColumnSearchProps,
  getStandardRowSelection,
} from "@/components/ui/tableUtils";

const { Title, Text } = Typography;

const TRUCK_STATUS_COLORS: Record<string, string> = {
  Idle: "green",
  Loading: "cyan",
  "In Transit": "blue",
  "At Border": "gold",
  Offloaded: "purple",
  Returned: "default",
  "Waiting for PODs": "magenta",
  Maintenance: "orange",
};

export default function TruckDetailPage() {
  const router = useRouter();
  const params = useParams();
  const truckId = params.id as string;
  const { user } = useAuth();

  const [truck, setTruck] = useState<Truck | null>(null);
  const [maintenanceEvents, setMaintenanceEvents] = useState<
    MaintenanceEvent[]
  >([]);
  const [totalCost, setTotalCost] = useState(0);
  const [maintenanceCount, setMaintenanceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchTruck = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/trucks/${truckId}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data: Truck = await response.json();
        setTruck(data);
      } else if (response.status === 401) {
        router.push("/login");
      } else if (response.status === 404) {
        message.error("Truck not found");
        router.push("/fleet/trucks");
      } else {
        message.error("Failed to fetch truck");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [truckId, router]);

  const fetchMaintenanceHistory = useCallback(async () => {
    setMaintenanceLoading(true);
    try {
      const response = await fetch(
        `/api/v1/trucks/${truckId}/maintenance-history`,
        { credentials: "include" }
      );
      if (response.ok) {
        const data: MaintenanceHistoryResponse = await response.json();
        setMaintenanceEvents(data.data);
        setMaintenanceCount(data.count);
        setTotalCost(data.total_maintenance_cost);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        message.error("Failed to fetch maintenance history");
      }
    } catch {
      message.error("Network error");
    } finally {
      setMaintenanceLoading(false);
    }
  }, [truckId, router]);

  useEffect(() => {
    if (user && truckId) {
      fetchTruck();
      fetchMaintenanceHistory();
    }
  }, [user, truckId, fetchTruck, fetchMaintenanceHistory]);

  const maintenanceColumns: ColumnsType<MaintenanceEvent> = [
    {
      title: "Date",
      dataIndex: "start_date",
      key: "start_date",
      render: (date: string) =>
        date ? new Date(date).toLocaleDateString() : "-",
      sorter: (a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    },
    {
      title: "Garage",
      dataIndex: "garage_name",
      key: "garage_name",
      ...getColumnSearchProps("garage_name"),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      ...getColumnSearchProps("description"),
    },
    {
      title: "Cost",
      key: "cost",
      render: (_, record) => {
        const amount = record.expense?.amount;
        return amount != null
          ? `TZS ${Number(amount).toLocaleString("en-US")}`
          : "-";
      },
      align: "right",
      sorter: (a, b) => (a.expense?.amount ?? 0) - (b.expense?.amount ?? 0),
    },
    {
      title: "Status",
      key: "expense_status",
      render: (_, record) => {
        const status = record.expense?.status;
        if (!status) return "-";
        const colors: Record<string, string> = {
          "Pending Manager": "gold",
          "Pending Finance": "blue",
          Paid: "green",
          Rejected: "red",
          Returned: "orange",
        };
        return <Tag color={colors[status] || "default"}>{status}</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!truck) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "24px",
      }}
    >
      <Card>
        <Flex vertical gap="middle" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/fleet/trucks")}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                {truck.plate_number}
              </Title>
              <Tag color={TRUCK_STATUS_COLORS[truck.status]}>
                {truck.status}
              </Tag>
            </Space>
          </div>

          <Tabs
            defaultActiveKey="details"
            items={[
              {
                key: "details",
                label: "Details",
                children: (
                  <Descriptions bordered column={2}>
                    <Descriptions.Item label="Plate Number">
                      {truck.plate_number}
                    </Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={TRUCK_STATUS_COLORS[truck.status]}>
                        {truck.status}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Make">
                      {truck.make}
                    </Descriptions.Item>
                    <Descriptions.Item label="Model">
                      {truck.model}
                    </Descriptions.Item>
                    <Descriptions.Item label="Registered">
                      {truck.created_at
                        ? new Date(truck.created_at).toLocaleDateString()
                        : "-"}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: "maintenance",
                label: "Maintenance History",
                children: (
                  <Flex
                    vertical
                    gap="middle"
                    style={{ width: "100%" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Statistic
                        title="Total Maintenance Cost"
                        value={totalCost}
                        precision={2}
                        prefix={<ToolOutlined />}
                        suffix="TZS"
                        styles={{ content: { color: "#cf1322" } }}
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchMaintenanceHistory}
                      >
                        Refresh
                      </Button>
                    </div>

                    <Table<MaintenanceEvent>
                      columns={maintenanceColumns}
                      dataSource={maintenanceEvents}
                      rowKey="id"
                      loading={maintenanceLoading}
                      sticky
                      rowSelection={getStandardRowSelection(
                        currentPage,
                        pageSize,
                        selectedRowKeys,
                        setSelectedRowKeys
                      )}
                      pagination={{
                        current: currentPage,
                        pageSize,
                        total: maintenanceCount,
                        showTotal: (total) =>
                          `Total ${total} maintenance events`,
                        showSizeChanger: true,
                        pageSizeOptions: ["10", "20", "50"],
                        onChange: (page, size) => {
                          setCurrentPage(page);
                          setPageSize(size);
                        },
                      }}
                    />
                  </Flex>
                ),
              },
            ]}
          />
        </Flex>
      </Card>
    </div>
  );
}
