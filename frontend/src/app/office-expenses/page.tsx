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
} from "antd";
import {
  ReloadOutlined,
  PlusOutlined,
  DollarOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { ExpenseRequestDetailed, ExpenseStatus, ExpenseRequestsResponse } from "@/types/expense";
import { useAuth } from "@/contexts/AuthContext";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import { PaymentModal } from "@/components/expenses/PaymentModal";

const { Title } = Typography;

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  "Pending Manager": "orange",
  "Pending Finance": "blue",
  "Paid": "green",
  "Rejected": "red",
  "Returned": "purple",
};

export default function OfficeExpensesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseRequestDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRequestDetailed | null>(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      // Filter for Office category
      const response = await fetch("/api/v1/expenses/?category=Office", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setExpenses(data.data);
        setTotalCount(data.count);
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        message.error("Failed to fetch expenses");
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchExpenses();
    }
  }, [authLoading, user, fetchExpenses]);

  const handlePay = (record: ExpenseRequestDetailed) => {
    setSelectedExpense(record);
    setPaymentModalOpen(true);
  };

  const handlePrint = (id: string) => {
    window.open(`/finance/vouchers/${id}`, '_blank');
  };

  const columns: ColumnsType<ExpenseRequestDetailed> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      render: (id: string) => id?.slice(0, 8).toUpperCase(),
      width: 100,
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string | null) =>
        date ? new Date(date).toLocaleDateString() : "-",
      sorter: (a, b) => {
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number) => `$${Number(amount).toLocaleString()}`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: ExpenseStatus) => (
        <Tag color={STATUS_COLORS[status]}>{status}</Tag>
      ),
      filters: Object.keys(STATUS_COLORS).map((status) => ({
        text: status,
        value: status,
      })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          {/* Pay Button: Only for Finance/Admin when Pending Finance */}
          {(user?.role === "finance" || user?.role === "admin") && 
           record.status === "Pending Finance" && (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => handlePay(record)}
            >
              Pay
            </Button>
          )}

          {/* Print Voucher: Only when Paid */}
          {record.status === "Paid" && (
            <Button
              type="default"
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handlePrint(record.id)}
            >
              Voucher
            </Button>
          )}
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
            <Title level={2} style={{ margin: 0 }}>
              Office Expenses
            </Title>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchExpenses}>
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsModalOpen(true)}
              >
                New Office Expense
              </Button>
            </Space>
          </div>

          <Table<ExpenseRequestDetailed>
            columns={columns}
            dataSource={expenses}
            rowKey="id"
            loading={loading}
            pagination={{
              total: totalCount,
              showTotal: (total) => `Total ${total} expenses`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
            }}
          />
        </Space>
      </Card>
      
      <AddExpenseModal 
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchExpenses}
      />

      <PaymentModal 
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={fetchExpenses}
        expense={selectedExpense}
      />
    </div>
  );
}