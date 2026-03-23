"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  Form,
  Input,
  Button,
  Space,
  App,
  Typography,
  Divider,
  DatePicker,
  InputNumber,
  Select,
  AutoComplete,
  Spin,
} from "antd";
import { SaveOutlined, ArrowUpOutlined, ArrowDownOutlined, CloseOutlined } from "@ant-design/icons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import dayjs from "dayjs";
import { amountInputProps } from "@/lib/utils";

const { Title } = Typography;
const { Option } = Select;

interface EditWaybillDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  waybillId: string | null;
}

export function EditWaybillDrawer({
  open,
  onClose,
  onSuccess,
  waybillId,
}: EditWaybillDrawerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [cargoTypes, setCargoTypes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [borderPosts, setBorderPosts] = useState<any[]>([]);
  const [selectedBorderIds, setSelectedBorderIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && waybillId) {
      setLoading(true);
      Promise.all([
        fetch(`/api/v1/waybills/${waybillId}`, { credentials: "include" }),
        fetch(`/api/v1/waybills/${waybillId}/borders`, { credentials: "include" }),
        fetch("/api/v1/cities", { credentials: "include" }),
        fetch("/api/v1/cargo-types", { credentials: "include" }),
        fetch("/api/v1/clients", { credentials: "include" }),
        fetch("/api/v1/border-posts?active_only=true&limit=500", { credentials: "include" }),
      ])
        .then(async ([wbRes, bordersRes, cityRes, cargoRes, clientRes, borderRes]) => {
          if (wbRes.ok) {
            const wb = await wbRes.json();
            form.setFieldsValue({
              client_name: wb.client_name,
              cargo_type: wb.cargo_type,
              weight_kg: wb.weight_kg,
              risk_level: wb.risk_level,
              description: wb.description,
              expected_loading_date: wb.expected_loading_date ? dayjs(wb.expected_loading_date) : null,
              origin: wb.origin,
              destination: wb.destination,
              agreed_rate: wb.agreed_rate,
              currency: wb.currency,
            });
          }
          if (bordersRes.ok) {
            const borders = await bordersRes.json();
            setSelectedBorderIds(borders.map((b: any) => b.border_post_id));
          }
          if (cityRes.ok) setLocations((await cityRes.json()).data);
          if (cargoRes.ok) setCargoTypes((await cargoRes.json()).data);
          if (clientRes.ok) setClients((await clientRes.json()).data);
          if (borderRes.ok) setBorderPosts((await borderRes.json()).data);
        })
        .catch(() => message.error("Failed to load waybill data"))
        .finally(() => setLoading(false));
    }
  }, [open, waybillId, form, message]);

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
    if (!waybillId) return;
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        expected_loading_date: values.expected_loading_date
          ? values.expected_loading_date.toISOString()
          : undefined,
        border_ids: selectedBorderIds.length > 0 ? selectedBorderIds : [],
      };
      const response = await fetch(`/api/v1/waybills/${waybillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        message.success("Waybill updated successfully");
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to update waybill");
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title="Edit Waybill"
      open={open}
      onClose={onClose}
      styles={{ wrapper: { width: 1200 } }}
      forceRender
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={submitting}
            onClick={() => form.submit()}
          >
            Save Changes
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish} size="large">
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Title level={5}>Client & Cargo</Title>

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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Form.Item
              name="cargo_type"
              label="Cargo Type"
              rules={[{ required: true, message: "Please select cargo type" }]}
            >
              <Select placeholder="Select cargo type">
                {cargoTypes.map((ct: any) => (
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
          </div>

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

          <Form.Item
            name="description"
            label="Cargo Description / Details"
            rules={[{ required: true, message: "Please enter cargo details" }]}
          >
            <Input.TextArea rows={3} placeholder="e.g. Loose Cargo, 30 Tons" />
          </Form.Item>

          <Form.Item
            name="expected_loading_date"
            label="Expected Loading Date"
            rules={[{ required: true, message: "Please select date" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Divider />

          <Title level={5}>Route & Financials</Title>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Form.Item
              name="origin"
              label="Origin (Loading Point)"
              rules={[{ required: true, message: "Please enter origin" }]}
            >
              <AutoComplete
                placeholder="e.g. Dar es Salaam Port"
                options={locations.map((l: any) => ({ value: `${l.name}, ${l.country?.name || ""}` }))}
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
                options={locations.map((l: any) => ({ value: `${l.name}, ${l.country?.name || ""}` }))}
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

          <Title level={5}>Border Crossings (optional)</Title>

          <Form.Item
            label="Select borders this trip will cross (in order)"
            extra="Select borders then use the arrows below to set the crossing sequence."
          >
            <Select
              mode="multiple"
              placeholder="Select border posts..."
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
        </>
      )}
      </Form>
    </Drawer>
  );
}
