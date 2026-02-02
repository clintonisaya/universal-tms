"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Space,
  message,
  Typography,
  Spin,
} from "antd";
import {
  ReloadOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { MaintenanceEvent } from "@/types/maintenance";
import { useAuth } from "@/contexts/AuthContext";

const { Title } = Typography;

export default function MaintenancePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/maintenance/", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data.data);
        setTotalCount(data.count);
      } else {
        message.error("Failed to fetch maintenance records");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchEvents();
    }
  }, [authLoading, user]);

  const columns: ColumnsType<MaintenanceEvent> = [
    {
      title: "Date",
      dataIndex: "start_date",
      key: "start_date",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Garage",
      dataIndex: "garage_name",
      key: "garage_name",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
  ];

  if (authLoading) return <div style={{ display: "flex", justifyContent: "center", marginTop: 50 }}><Spin size="large" /></div>;

  return (
    <div style={{ padding: "24px", minHeight: "100vh", background: "#f0f2f5" }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/fleet")}>
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>Maintenance Log</Title>
            </Space>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchEvents}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push("/fleet/maintenance/new")}>
                New Record
              </Button>
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={events}
            rowKey="id"
            loading={loading}
            pagination={{ total: totalCount }}
          />
        </Space>
      </Card>
    </div>
  );
}
