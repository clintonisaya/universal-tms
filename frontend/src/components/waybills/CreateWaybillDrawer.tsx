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
import { SaveOutlined } from "@ant-design/icons";
import type { WaybillCreate } from "@/types/waybill";

const { Title } = Typography;
const { Option } = Select;

interface CreateWaybillDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateWaybillDrawer({
  open,
  onClose,
  onSuccess,
}: CreateWaybillDrawerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<WaybillCreate>();
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [cargoTypes, setCargoTypes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      fetchResources();
    }
  }, [open, form]);

  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const [cityRes, cargoRes, clientRes] = await Promise.all([
        fetch("/api/v1/cities", { credentials: "include" }),
        fetch("/api/v1/cargo-types", { credentials: "include" }),
        fetch("/api/v1/clients", { credentials: "include" }),
      ]);

      if (cityRes.ok && cargoRes.ok && clientRes.ok) {
        const cityData = await cityRes.json();
        const cargoData = await cargoRes.json();
        const clientData = await clientRes.json();
        setLocations(cityData.data);
        setCargoTypes(cargoData.data);
        setClients(clientData.data);
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
      const response = await fetch("/api/v1/waybills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ ...values }),
      });

      if (response.ok) {
        message.success("Waybill created successfully");
        form.resetFields();
        onSuccess();
        onClose();
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
    <Drawer
      title="Create New Waybill"
      open={open}
      onClose={onClose}
      styles={{ wrapper: { width: 1200 } }}
      destroyOnHidden={false}
      extra={
        <Space>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={submitting}
            onClick={() => form.submit()}
          >
            Create Waybill
          </Button>
        </Space>
      }
    >
      {loadingResources ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="large"
          initialValues={{ currency: "USD", risk_level: "Low" }}
        >
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
        </Form>
      )}
    </Drawer>
  );
}
