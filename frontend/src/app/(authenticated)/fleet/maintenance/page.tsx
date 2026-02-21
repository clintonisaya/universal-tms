"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  Button,
  Card,
  Flex,
  Typography,
} from "antd";
import {
  ReloadOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { MaintenanceEvent } from "@/types/maintenance";
import { useAuth } from "@/contexts/AuthContext";
import { useMaintenance, useInvalidateQueries } from "@/hooks/useApi";
import { CreateMaintenanceDrawer } from "@/components/maintenance/CreateMaintenanceDrawer";
import {
  getColumnSearchProps,
  getStandardRowSelection,
  useResizableColumns,
} from "@/components/ui/tableUtils";
import { ExpenseStatusBadge } from "@/components/expenses/ExpenseStatusBadge";

const { Title } = Typography;

export default function MaintenancePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // TanStack Query for maintenance data
  const { data, isLoading: loading, refetch } = useMaintenance();
  const { invalidateMaintenance } = useInvalidateQueries();

  const events = (data?.data || []) as MaintenanceEvent[];
  const totalCount = data?.count || 0;

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const columns: ColumnsType<MaintenanceEvent> = [
    {
      title: "Garage",
      dataIndex: "garage_name",
      key: "garage_name",
      width: 180,
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
      ...getColumnSearchProps("garage_name"),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      width: 200,
      ellipsis: true,
      ...getColumnSearchProps("description"),
    },
    {
      title: "Start Date",
      dataIndex: "start_date",
      key: "start_date",
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => a.start_date.localeCompare(b.start_date),
    },
    {
      title: "End Date",
      dataIndex: "end_date",
      key: "end_date",
      width: 120,
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "Cost",
      key: "cost",
      width: 140,
      align: "right",
      render: (_, record) => {
        const amount = record.expense?.amount;
        if (amount == null) return "-";
        return `TZS ${Number(amount).toLocaleString("en-US")}`;
      },
      sorter: (a, b) => (a.expense?.amount || 0) - (b.expense?.amount || 0),
    },
    {
      title: "Status",
      key: "status",
      width: 130,
      render: (_, record) => {
        const status = record.expense?.status;
        if (!status) return "-";
        return <ExpenseStatusBadge status={status as any} compact />;
      },
    },
  ];

  // Make columns resizable
  const { resizableColumns, components } = useResizableColumns(columns);

  return (
    <div style={{ padding: "24px", minHeight: "100vh", background: "#f0f2f5" }}>
      <Card>
        <Flex vertical gap="middle" style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Flex gap="small">
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/fleet")}>
                Back
              </Button>
              <Title level={2} style={{ margin: 0 }}>Maintenance Log</Title>
            </Flex>
            <Flex gap="small">
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateDrawerOpen(true)}>
                New Record
              </Button>
            </Flex>
          </div>
          <Table<MaintenanceEvent>
            columns={resizableColumns}
            components={components}
            dataSource={events}
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
              showTotal: (total) => `Total ${total} records`,
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

      <CreateMaintenanceDrawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onSuccess={() => invalidateMaintenance()}
      />
    </div>
  );
}
