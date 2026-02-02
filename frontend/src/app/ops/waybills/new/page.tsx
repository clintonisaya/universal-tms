"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  message,
  Typography,
  Divider,
  DatePicker,
  InputNumber,
  Select,
  AutoComplete,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import type { WaybillCreate } from "@/types/waybill";

const { Title, Text } = Typography;
const { Option } = Select;

export default function NewWaybillPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [form] = Form.useForm<WaybillCreate>();
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [cargoTypes, setCargoTypes] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      fetchResources();
    }
  }, [authLoading, user]);

  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const [locRes, cargoRes] = await Promise.all([
        fetch("/api/v1/locations/", { credentials: "include" }),
        fetch("/api/v1/cargo-types/", { credentials: "include" }),
      ]);

      if (locRes.ok && cargoRes.ok) {
        const locData = await locRes.json();
        const cargoData = await cargoRes.json();
        setLocations(locData.data);
        setCargoTypes(cargoData.data);
      }
    } catch (err) {
      console.error("Failed to fetch master data", err);
    } finally {
      setLoadingResources(false);
    }
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/waybills/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...values,
        }),
      });

      if (response.ok) {
        message.success("Waybill created successfully");
        router.push("/ops/waybills");
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create waybill");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}
              style={{ marginRight: 16 }}
            >
              Back
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              Create New Waybill
            </Title>
          </div>

          <Card loading={loadingResources}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              size="large"
              initialValues={{ currency: "USD" }}
            >
              <Title level={4}>Client & Cargo</Title>
              <Form.Item
                name="client_name"
                label="Client Name"
                rules={[{ required: true, message: "Please enter client name" }]}
              >
                <Input placeholder="e.g. Africa Walk..." />
              </Form.Item>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Form.Item
                  name="cargo_type"
                  label="Cargo Type"
                  rules={[{ required: true, message: "Please select cargo type" }]}
                >
                  <Select placeholder="Select cargo type">
                    {cargoTypes.map((ct) => (
                      <Option key={ct.id} value={ct.name}>
                        {ct.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item
                  name="weight_kg"
                  label="Weight (KG)"
                  rules={[{ required: true, message: "Please enter weight" }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    placeholder="e.g. 30000"
                  />
                </Form.Item>
              </div>

              <Form.Item
                name="description"
                label="Cargo Description / Details"
                rules={[{ required: true, message: "Please enter cargo details" }]}
              >
                <Input.TextArea rows={3} placeholder="e.g. Loose Cargo, 30 Tons" />
              </Form.Item>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Form.Item
                  name="expected_loading_date"
                  label="Expected Loading Date"
                  rules={[{ required: true, message: "Please select date" }]}
                >
                  <DatePicker style={{ width: "100%" }} />
                </Form.Item>
              </div>

              <Divider />

              <Title level={4}>Route & Financials</Title>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Form.Item
                  name="origin"
                  label="Origin (Loading Point)"
                  rules={[{ required: true, message: "Please enter origin" }]}
                >
                  <AutoComplete
                    placeholder="e.g. Dar es Salaam Port"
                    options={locations.map((l) => ({ value: `${l.name}, ${l.country}` }))}
                    filterOption={(inputValue, option) =>
                      option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                    }
                  />
                </Form.Item>
                <Form.Item
                  name="destination"
                  label="Destination"
                  rules={[{ required: true, message: "Please enter destination" }]}
                >
                  <AutoComplete
                    placeholder="e.g. Lusaka, Zambia"
                    options={locations.map((l) => ({ value: `${l.name}, ${l.country}` }))}
                    filterOption={(inputValue, option) =>
                      option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                    }
                  />
                </Form.Item>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Form.Item
                  name="agreed_rate"
                  label="Agreed Rate"
                  rules={[{ required: true, message: "Please enter rate" }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    placeholder="e.g. 3500.00"
                  />
                </Form.Item>
                <Form.Item
                  name="currency"
                  label="Currency"
                  rules={[{ required: true, message: "Please select currency" }]}
                >
                  <Select>
                    <Option value="USD">USD</Option>
                    <Option value="KES">KES</Option>
                    <Option value="TZS">TZS</Option>
                  </Select>
                </Form.Item>
              </div>

              <Divider />

              <Form.Item>
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button onClick={() => router.back()}>Cancel</Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    loading={submitting}
                  >
                    Create Waybill
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Space>
      </div>
    </div>
  );
}
