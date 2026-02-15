"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Flex,
  Space,
  Tag,
  message,
  Typography,
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
import type { Waybill, WaybillStatus } from "@/types/waybill";
import { useAuth } from "@/contexts/AuthContext";
import { useWaybills, useInvalidateQueries } from "@/hooks/useApi";
import { CreateWaybillDrawer } from "@/components/waybills/CreateWaybillDrawer";
import { WaybillDetailDrawer } from "@/components/waybills/WaybillDetailDrawer";
import { CreateTripDrawer } from "@/components/trips/CreateTripDrawer";
import {
  getColumnSearchProps,
  getColumnFilterProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";

const { Title } = Typography;

const STATUS_COLORS: Record<WaybillStatus, string> = {
  Open: "green",
  "In Progress": "blue",
  Completed: "purple",
  Invoiced: "gold",
};

const STATUS_FILTERS = Object.keys(STATUS_COLORS).map((status) => ({
  text: status,
  value: status,
}));

export default function WaybillsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { invalidateWaybills } = useInvalidateQueries();

  // Only fetch when user is authenticated
  const isAuthenticated = !!user;

  // TanStack Query for waybills data
  const { data, isLoading: loading, refetch } = useWaybills(isAuthenticated);
  const waybills = data?.data || [];
  const totalCount = data?.count || 0;

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailWaybillId, setDetailWaybillId] = useState<string | null>(null);
  const [tripDrawerOpen, setTripDrawerOpen] = useState(false);
  const [tripDrawerWaybillId, setTripDrawerWaybillId] = useState<string | null>(null);
  const [tripDrawerRouteName, setTripDrawerRouteName] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const handleDelete = async (waybill: Waybill) => {
    try {
      const response = await fetch(`/api/v1/waybills/${waybill.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        message.success("Waybill deleted successfully");
        invalidateWaybills();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to delete waybill");
      }
    } catch {
      message.error("Network error");
    }
  };

  const handleCreateTrip = (waybill: Waybill) => {
    setTripDrawerWaybillId(waybill.id);
    setTripDrawerRouteName(`${waybill.origin} - ${waybill.destination}`);
    setTripDrawerOpen(true);
  };

  const openDetailDrawer = (id: string) => {
    setDetailWaybillId(id);
    setDetailDrawerOpen(true);
  };

  const columns: ColumnsType<Waybill> = [
    {
      title: "Waybill #",
      dataIndex: "waybill_number",
      key: "waybill_number",
      width: 140,
      sorter: (a, b) => a.waybill_number.localeCompare(b.waybill_number),
      render: (text: string, record: Waybill) => (
        <Button
          type="link"
          onClick={() => openDetailDrawer(record.id)}
          style={{ padding: 0, height: "auto", fontWeight: 600 }}
        >
          {text}
        </Button>
      ),
      ...getColumnSearchProps<Waybill>("waybill_number"),
    },
    {
      title: "Client",
      dataIndex: "client_name",
      key: "client_name",
      width: 160,
      render: (text: string) => text || "-",
      ...getColumnSearchProps<Waybill>("client_name"),
    },
    {
      title: "Origin",
      dataIndex: "origin",
      key: "origin",
      width: 140,
      render: (text: string) => text || "-",
      ...getColumnSearchProps<Waybill>("origin"),
    },
    {
      title: "Destination",
      dataIndex: "destination",
      key: "destination",
      width: 140,
      render: (text: string) => text || "-",
      ...getColumnSearchProps<Waybill>("destination"),
    },
    {
      title: "Loading Date",
      dataIndex: "expected_loading_date",
      key: "expected_loading_date",
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : "-",
      sorter: (a, b) => (a.expected_loading_date || "").localeCompare(b.expected_loading_date || ""),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: WaybillStatus) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
      ...getColumnFilterProps("status", STATUS_FILTERS),
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      fixed: "right",
      render: (_, record) => (
        <div className="row-actions">
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
        </div>
      ),
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

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
            <Flex gap="small">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/dashboard")}
              >
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Waybills
              </Title>
            </Flex>
            <Flex gap="small">
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateDrawerOpen(true)}
              >
                New Waybill
              </Button>
            </Flex>
          </div>

          <Table<Waybill>
            columns={resizableColumns}
            components={components}
            dataSource={waybills}
            rowKey="id"
            loading={loading}
            sticky={{ offsetHeader: 64 }}
            rowSelection={getStandardRowSelection(
              currentPage,
              pageSize,
              selectedRowKeys,
              setSelectedRowKeys
            )}
            pagination={{
              current: currentPage,
              pageSize,
              total: totalCount,
              showTotal: (total) => `Total ${total} waybills`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
              },
            }}
          />
        </Flex>
      </Card>

      <CreateWaybillDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onSuccess={() => invalidateWaybills()}
      />

      <WaybillDetailDrawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setDetailWaybillId(null);
        }}
        waybillId={detailWaybillId}
      />

      <CreateTripDrawer
        open={tripDrawerOpen}
        onClose={() => {
          setTripDrawerOpen(false);
          setTripDrawerWaybillId(null);
          setTripDrawerRouteName(null);
        }}
        onSuccess={() => invalidateWaybills()}
        waybillId={tripDrawerWaybillId}
        routeName={tripDrawerRouteName}
      />
    </div>
  );
}
