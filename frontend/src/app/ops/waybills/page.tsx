"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  Tag,
  message,
  Typography,
  Spin,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Waybill, WaybillStatus, WaybillsResponse } from "@/types/waybill";
import { useAuth } from "@/contexts/AuthContext";

const { Title } = Typography;

const STATUS_COLORS: Record<WaybillStatus, string> = {
  Open: "green",
  "In Progress": "blue",
  Completed: "purple",
  Invoiced: "gold",
};

export default function WaybillsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchWaybills = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/waybills/", {
        credentials: "include",
      });
      if (response.ok) {
        const data: WaybillsResponse = await response.json();
        setWaybills(data.data);
        setTotalCount(data.count);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        message.error("Failed to fetch waybills");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchWaybills();
    }
  }, [authLoading, user, fetchWaybills]);

  const handleDelete = async (waybill: Waybill) => {
    try {
      const response = await fetch(`/api/v1/waybills/${waybill.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        message.success("Waybill deleted successfully");
        fetchWaybills();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete waybill");
      }
    } catch {
      message.error("Network error");
    }
  };

  const handleCreateTrip = (waybill: Waybill) => {
    // Navigate to Trip creation with waybill details
    // We can pass data via URL search params
    const params = new URLSearchParams({
      waybill_id: waybill.id,
      route_name: `${waybill.origin} - ${waybill.destination}`,
    });
    router.push(`/ops/trips/new?${params.toString()}`);
  };

  const columns: ColumnsType<Waybill> = [
    {
      title: "Waybill #",
      dataIndex: "waybill_number",
      key: "waybill_number",
      sorter: (a, b) => a.waybill_number.localeCompare(b.waybill_number),
    },
    {
      title: "Client",
      dataIndex: "client_name",
      key: "client_name",
    },
    {
      title: "Origin",
      dataIndex: "origin",
      key: "origin",
    },
    {
      title: "Destination",
      dataIndex: "destination",
      key: "destination",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: WaybillStatus) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
      filters: Object.keys(STATUS_COLORS).map((status) => ({
        text: status,
        value: status,
      })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Loading Date",
      dataIndex: "expected_loading_date",
      key: "expected_loading_date",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          {record.status === "Open" && (
            <Button
              type="primary"
              size="small"
              icon={<RocketOutlined />}
              onClick={() => handleCreateTrip(record)}
            >
              Dispatch
            </Button>
          )}
          <Popconfirm
            title="Delete waybill"
            description="Are you sure you want to delete this waybill?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (authLoading) {
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "24px",
      }}
    >
      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
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
                onClick={() => router.push("/dashboard")}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Waybills
              </Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchWaybills}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push("/ops/waybills/new")}
              >
                New Waybill
              </Button>
            </Space>
          </div>

          <Table<Waybill>
            columns={columns}
            dataSource={waybills}
            rowKey="id"
            loading={loading}
            pagination={{
              total: totalCount,
              showTotal: (total) => `Total ${total} waybills`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
          />
        </Space>
      </Card>
    </div>
  );
}
