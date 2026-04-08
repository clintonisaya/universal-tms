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
import {
  ArrowLeftOutlined,
  SaveOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { amountInputProps } from "@/lib/utils";
import type { WaybillCreate } from "@/types/waybill";

const { Title } = Typography;
const { Option } = Select;

export default function NewWaybillPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form] = Form.useForm<WaybillCreate>();
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [cargoTypes, setCargoTypes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [borderPosts, setBorderPosts] = useState<any[]>([]);
  const [selectedBorderIds, setSelectedBorderIds] = useState<string[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    if (user) {
      fetchResources();
    }
  }, [user]);

  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const [cityRes, cargoRes, clientRes, borderRes] = await Promise.all([
        fetch("/api/v1/cities", { credentials: "include" }),
        fetch("/api/v1/cargo-types", { credentials: "include" }),
        fetch("/api/v1/clients", { credentials: "include" }),
        fetch("/api/v1/border-posts?active_only=true&limit=500", { credentials: "include" }),
      ]);

      if (cityRes.ok) {
        const d = await cityRes.json();
        setLocations(d.data);
      }
      if (cargoRes.ok) {
        const d = await cargoRes.json();
        setCargoTypes(d.data);
      }
      if (clientRes.ok) {
        const d = await clientRes.json();
        setClients(d.data);
      }
      if (borderRes.ok) {
        const d = await borderRes.json();
        setBorderPosts(d.data);
      }
    } catch {
      // master data fetch failed — UI will show empty dropdowns
    } finally {
      setLoadingResources(false);
    }
  };

  // Border reordering helpers
  const moveBorderUp = (index: number) => {
    if (index === 0) return;
    const next = [...selectedBorderIds];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setSelectedBorderIds(next);
  };

  const moveBorderDown = (index: number) => {
    if (index === selectedBorderIds.length - 1) return;
    const next = [...selectedBorderIds];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setSelectedBorderIds(next);
  };

  const removeBorder = (id: string) => {
    setSelectedBorderIds((prev) => prev.filter((b) => b !== id));
  };

  const borderPostMap = Object.fromEntries(borderPosts.map((b) => [b.id, b]));

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        border_ids: selectedBorderIds.length > 0 ? selectedBorderIds : null,
      };
      const response = await fetch("/api/v1/waybills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        padding: "var(--space-xl)",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
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
              initialValues={{ currency: "USD", risk_level: "Low" }}
            >
              <Title level={4}>Client & Cargo</Title>
              <Form.Item
                name="client_name"
                label="Client"
                rules={[{ required: true, message: "Please select a client" }]}
              >
                <Select
                  showSearch
                  placeholder="Select or search client..."
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {clients.map((client) => (
                    <Option key={client.id} value={client.name}>
                      {client.name} ({client.system_id})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
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
                    {...amountInputProps}
                  />
                </Form.Item>
                <Form.Item
                  name="risk_level"
                  label="Risk Level"
                  rules={[{ required: true, message: "Please select risk level" }]}
                >
                  <Select>
                    <Option value="Low">Low</Option>
                    <Option value="Medium">Medium</Option>
                    <Option value="High">High</Option>
                  </Select>
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
                    options={locations.map((l) => ({ value: `${l.name}, ${l.country?.name || ""}` }))}
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
                    options={locations.map((l) => ({ value: `${l.name}, ${l.country?.name || ""}` }))}
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
                    {...amountInputProps}
                  />
                </Form.Item>
                <Form.Item
                  name="currency"
                  label="Currency"
                  rules={[{ required: true, message: "Please select currency" }]}
                >
                  <Select>
                    <Option value="USD">USD</Option>
                    <Option value="TZS">TZS</Option>
                  </Select>
                </Form.Item>
              </div>

              <Divider />

              <Title level={4}>Border Crossings (optional)</Title>

              <Form.Item
                label="Select borders this trip will cross (in order)"
                extra="Select borders then use the arrows to set the crossing sequence."
              >
                <Select
                  mode="multiple"
                  placeholder={borderPosts.length > 0 ? "Select border posts..." : "No border posts configured yet — add them in Settings > Border Posts"}
                  value={selectedBorderIds}
                  onChange={(ids: string[]) => {
                    const existing = selectedBorderIds.filter((id) => ids.includes(id));
                    const added = ids.filter((id) => !selectedBorderIds.includes(id));
                    setSelectedBorderIds([...existing, ...added]);
                  }}
                  optionFilterProp="label"
                  options={borderPosts.map((bp) => ({
                    value: bp.id,
                    label: bp.display_name,
                  }))}
                  style={{ width: "100%" }}
                  disabled={borderPosts.length === 0}
                />
              </Form.Item>

              {selectedBorderIds.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {selectedBorderIds.map((id, index) => {
                    const bp = borderPostMap[id];
                    if (!bp) return null;
                    return (
                      <div
                        key={id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 8px",
                          marginBottom: 4,
                          background: "var(--color-surface)",
                          borderRadius: 6,
                        }}
                      >
                        <StatusBadge status={String(index + 1)} colorKey="gray" />
                        <span style={{ flex: 1, fontSize: "var(--font-sm)" }}>
                          <strong>{bp.display_name}</strong>{" "}
                          <span style={{ color: "var(--color-text-muted)" }}>
                            ({bp.side_a_name} → {bp.side_b_name})
                          </span>
                        </span>
                        <Space size={2}>
                          <Button
                            type="text"
                            size="small"
                            icon={<ArrowUpOutlined />}
                            disabled={index === 0}
                            onClick={() => moveBorderUp(index)}
                          />
                          <Button
                            type="text"
                            size="small"
                            icon={<ArrowDownOutlined />}
                            disabled={index === selectedBorderIds.length - 1}
                            onClick={() => moveBorderDown(index)}
                          />
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<CloseOutlined />}
                            onClick={() => removeBorder(id)}
                          />
                        </Space>
                      </div>
                    );
                  })}
                </div>
              )}

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
