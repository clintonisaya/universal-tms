"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Drawer,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  Checkbox,
  Space,
  message,
  Spin,
  Radio,
  Row,
  Col,
  Table,
  Tag,
  Typography,
  Empty,
} from "antd";
import { LinkOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { EmptyAwareSelect } from "@/components/ui";
import { useTrucks, useTrailers, apiFetch } from "@/hooks/useApi";
import type {
  AvailableExpense,
  AvailableExpensesResponse,
  MaintenanceEventLinkExpense,
} from "@/types/maintenance";
import dayjs from "dayjs";

const { TextArea } = Input;
const { Text } = Typography;

interface LinkExpenseDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LinkExpenseDrawer({
  open,
  onClose,
  onSuccess,
}: LinkExpenseDrawerProps) {
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [assetType, setAssetType] = useState<"truck" | "trailer">("truck");

  // Use TanStack Query hooks for trucks and trailers
  const { data: trucksData, isLoading: trucksLoading } = useTrucks();
  const { data: trailersData, isLoading: trailersLoading } = useTrailers();
  const trucks = (trucksData?.data || []) as any[];
  const trailers = (trailersData?.data || []) as any[];
  const resourcesLoading = trucksLoading || trailersLoading;

  // Expense selection state
  const [expenses, setExpenses] = useState<AvailableExpense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] =
    useState<AvailableExpense | null>(null);
  const [expenseSearch, setExpenseSearch] = useState("");

  // Step management: 'select-expense' or 'fill-details'
  const [step, setStep] = useState<"select-expense" | "fill-details">(
    "select-expense"
  );

  useEffect(() => {
    if (open) {
      fetchAvailableExpenses();
      // Reset state
      form.resetFields();
      setSelectedExpense(null);
      setStep("select-expense");
      setAssetType("truck");
      setExpenseSearch("");
    }
  }, [open]);

  const fetchAvailableExpenses = async () => {
    setExpensesLoading(true);
    try {
      const data = await apiFetch<AvailableExpensesResponse>(
        "/api/v1/maintenance/available-expenses?limit=200"
      );
      setExpenses(data.data);
    } catch (err) {
      console.error("Failed to load available expenses:", err);
      message.error("Failed to load available expenses");
    } finally {
      setExpensesLoading(false);
    }
  };

  const handleExpenseSelect = (expense: AvailableExpense) => {
    setSelectedExpense(expense);
    setStep("fill-details");
    // Pre-fill description from expense
    const desc =
      expense.expense_metadata?.item_details ||
      expense.expense_metadata?.remarks ||
      expense.description ||
      "";
    form.setFieldsValue({
      description: desc,
      start_date: dayjs(),
    });
  };

  const handleBack = () => {
    setStep("select-expense");
    setSelectedExpense(null);
    form.resetFields();
  };

  const onFinish = async (values: any) => {
    if (!selectedExpense) return;

    setLoading(true);
    try {
      const payload: MaintenanceEventLinkExpense = {
        expense_id: selectedExpense.id,
        truck_id: values.asset_type === "truck" ? values.asset_id : null,
        trailer_id: values.asset_type === "trailer" ? values.asset_id : null,
        garage_name: values.garage_name,
        description: values.description,
        start_date: values.start_date.toISOString(),
        end_date: values.end_date ? values.end_date.toISOString() : null,
        update_truck_status:
          values.asset_type === "truck" ? values.update_status : false,
        update_trailer_status:
          values.asset_type === "trailer" ? values.update_status : false,
      };

      await apiFetch("/api/v1/maintenance/link-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      message.success("Maintenance record linked to expense successfully");
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.message || "Failed to link expense to maintenance");
    } finally {
      setLoading(false);
    }
  };

  // Filter expenses by search term
  const filteredExpenses = expenses.filter((e) => {
    if (!expenseSearch) return true;
    const search = expenseSearch.toLowerCase();
    return (
      e.expense_number?.toLowerCase().includes(search) ||
      e.description?.toLowerCase().includes(search) ||
      e.expense_metadata?.item_details?.toLowerCase().includes(search) ||
      e.expense_metadata?.remarks?.toLowerCase().includes(search)
    );
  });

  const expenseColumns: ColumnsType<AvailableExpense> = [
    {
      title: "Expense #",
      dataIndex: "expense_number",
      key: "expense_number",
      width: 140,
      render: (num: string | null) => (
        <Text strong>{num || "-"}</Text>
      ),
    },
    {
      title: "Amount",
      key: "amount",
      width: 130,
      align: "right",
      render: (_, record) => (
        <Text strong>
          {record.currency} {Number(record.amount).toLocaleString("en-US")}
        </Text>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string) => {
        const color =
          status === "Paid"
            ? "green"
            : status === "Pending Manager"
            ? "orange"
            : "blue";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Date",
      dataIndex: "created_at",
      key: "created_at",
      width: 110,
      render: (date: string | null) =>
        date ? new Date(date).toLocaleDateString() : "-",
    },
    {
      title: "",
      key: "action",
      width: 80,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          onClick={() => handleExpenseSelect(record)}
        >
          Select
        </Button>
      ),
    },
  ];

  const renderStepContent = () => {
    if (step === "select-expense") {
      return (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              Select an existing maintenance expense to link to a new
              maintenance record.
            </Text>
          </div>
          <Input
            placeholder="Search by expense number or description..."
            prefix={<SearchOutlined />}
            value={expenseSearch}
            onChange={(e) => setExpenseSearch(e.target.value)}
            style={{ marginBottom: 16 }}
            allowClear
          />
          <Table<AvailableExpense>
            columns={expenseColumns}
            dataSource={filteredExpenses}
            rowKey="id"
            loading={expensesLoading}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{
              emptyText: (
                <Empty
                  description="No available maintenance expenses found"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            scroll={{ x: 700 }}
          />
        </div>
      );
    }

    // Step 2: Fill details
    return (
      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* Selected expense summary */}
        {selectedExpense && (
          <div
            style={{
              marginBottom: 24,
              padding: 16,
              background: "var(--color-surface)",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text strong>Selected Expense</Text>
              <Button size="small" onClick={handleBack}>
                Change
              </Button>
            </div>
            <Row gutter={16}>
              <Col span={8}>
                <Text type="secondary">Expense #</Text>
                <br />
                <Text strong>
                  {selectedExpense.expense_number || "-"}
                </Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">Amount</Text>
                <br />
                <Text strong>
                  {selectedExpense.currency}{" "}
                  {Number(selectedExpense.amount).toLocaleString("en-US")}
                </Text>
              </Col>
              <Col span={8}>
                <Text type="secondary">Status</Text>
                <br />
                <Tag
                  color={
                    selectedExpense.status === "Paid" ? "green" : "orange"
                  }
                >
                  {selectedExpense.status}
                </Tag>
              </Col>
            </Row>
          </div>
        )}

        {/* Asset selection */}
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            background: "var(--color-surface)",
            borderRadius: 8,
          }}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="asset_type"
                label="Maintenance For"
                rules={[{ required: true }]}
              >
                <Radio.Group
                  onChange={(e) => setAssetType(e.target.value)}
                >
                  <Radio value="truck">Truck</Radio>
                  <Radio value="trailer">Trailer</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="asset_id"
                label={
                  assetType === "truck" ? "Select Truck" : "Select Trailer"
                }
                rules={[
                  {
                    required: true,
                    message: `Please select a ${assetType}`,
                  },
                ]}
              >
                <EmptyAwareSelect
                  placeholder={`Select ${
                    assetType === "truck" ? "Truck" : "Trailer"
                  }`}
                  showSearch
                  optionFilterProp="children"
                  options={
                    assetType === "truck"
                      ? trucks.map((truck) => ({
                          value: truck.id,
                          label: `${truck.plate_number} - ${truck.make} ${truck.model} (${truck.status})`,
                        }))
                      : trailers.map((trailer) => ({
                          value: trailer.id,
                          label: `${trailer.plate_number} - ${trailer.make} (${trailer.status})`,
                        }))
                  }
                  emptyMessage={`No ${
                    assetType === "truck" ? "trucks" : "trailers"
                  } available`}
                  emptyDescription={`Register a ${assetType} to schedule maintenance`}
                  createLabel={`Register ${
                    assetType === "truck" ? "Truck" : "Trailer"
                  }`}
                  onCreate={() => {
                    onClose();
                    router.push(
                      assetType === "truck"
                        ? "/fleet/trucks"
                        : "/fleet/trailers"
                    );
                  }}
                  loading={resourcesLoading}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* Garage and Description */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="garage_name"
              label="Garage / Service Provider"
              rules={[
                { required: true, message: "Please enter garage name" },
              ]}
            >
              <Input placeholder="e.g. AutoXpress" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Maintenance Description"
          rules={[
            { required: true, message: "Please enter description" },
          ]}
        >
          <TextArea
            rows={4}
            placeholder="e.g. Oil Change, Brake Pad Replacement, Trailer Axle Repair"
          />
        </Form.Item>

        {/* Dates */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="start_date"
              label="Start Date"
              rules={[
                {
                  required: true,
                  message: "Please select start date",
                },
              ]}
            >
              <DatePicker showTime style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="end_date" label="End Date (Optional)">
              <DatePicker showTime style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        {/* Status checkbox */}
        <Form.Item name="update_status" valuePropName="checked">
          <Checkbox>
            Set {assetType === "truck" ? "Truck" : "Trailer"} Status to
            "Maintenance"
          </Checkbox>
        </Form.Item>
      </Form>
    );
  };

  return (
    <Drawer
      title={
        step === "select-expense"
          ? "Link Existing Expense"
          : "Maintenance Details"
      }
      open={open}
      onClose={onClose}
      width={step === "select-expense" ? 900 : 700}
      forceRender
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          {step === "fill-details" && (
            <Button
              type="primary"
              icon={<LinkOutlined />}
              loading={loading}
              onClick={() => form.submit()}
            >
              Link Expense
            </Button>
          )}
        </Space>
      }
    >
      {resourcesLoading && step === "fill-details" ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: 50,
          }}
        >
          <Spin size="large" />
        </div>
      ) : (
        renderStepContent()
      )}
    </Drawer>
  );
}
