"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Typography,
  Divider,
  Spin,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";

const { Title } = Typography;
const { Option } = Select;

interface Truck {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  status: string;
}

interface Trailer {
  id: string;
  plate_number: string;
  type: string;
  status: string;
}

interface Driver {
  id: string;
  full_name: string;
  license_number: string;
  status: string;
}

interface Waybill {
  id: string;
  waybill_number: string;
  client_name: string;
  origin: string;
  destination: string;
  status: string;
}

interface CreateTripDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  waybillId?: string | null;
  routeName?: string | null;
}

export function CreateTripDrawer({
  open,
  onClose,
  onSuccess,
  waybillId,
  routeName,
}: CreateTripDrawerProps) {
  const [form] = Form.useForm();

  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);

  useEffect(() => {
    if (open) {
      fetchResources();
      form.resetFields();
      setSelectedWaybill(null);
      if (waybillId || routeName) {
        form.setFieldsValue({
          waybill_id: waybillId,
          route_name: routeName,
        });
      }
    }
  }, [open, waybillId, routeName, form]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const [trucksRes, trailersRes, driversRes, waybillsRes] = await Promise.all([
        fetch("/api/v1/trips/available-trucks", { credentials: "include" }),
        fetch("/api/v1/trips/available-trailers", { credentials: "include" }),
        fetch("/api/v1/trips/available-drivers", { credentials: "include" }),
        fetch("/api/v1/waybills?status=Open&limit=100", { credentials: "include" }),
      ]);

      if (trucksRes.ok && trailersRes.ok && driversRes.ok) {
        const trucksData = await trucksRes.json();
        const trailersData = await trailersRes.json();
        const driversData = await driversRes.json();

        setTrucks(trucksData.data);
        setTrailers(trailersData.data);
        setDrivers(driversData.data);
      } else {
        message.error("Failed to fetch available resources");
      }

      if (waybillsRes.ok) {
        const waybillsData = await waybillsRes.json();
        setWaybills(waybillsData.data);
      }
    } catch {
      message.error("Network error fetching resources");
    } finally {
      setLoading(false);
    }
  };

  const handleWaybillChange = (waybillId: string) => {
    const waybill = waybills.find((w) => w.id === waybillId);
    setSelectedWaybill(waybill || null);
    if (waybill) {
      // Auto-populate route from waybill origin and destination
      form.setFieldsValue({
        route_name: `${waybill.origin} - ${waybill.destination}`,
      });
    } else {
      form.setFieldsValue({ route_name: "" });
    }
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success("Trip created successfully");
        form.resetFields();
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        if (response.status === 422 && Array.isArray(error.detail)) {
          // Map FastAPI validation errors to form fields
          const fieldErrors = (error.detail as { loc: string[]; msg: string }[]).map((e) => ({
            name: e.loc[e.loc.length - 1],
            errors: [e.msg],
          }));
          form.setFields(fieldErrors);
        } else {
          message.error(typeof error.detail === "string" ? error.detail : "Failed to create trip");
        }
      }
    } catch {
      message.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title="Create New Trip"
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
            Dispatch Trip
          </Button>
        </Space>
      }
    >
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          <Title level={5}>Waybill & Route</Title>
          <Form.Item
            name="waybill_id"
            label="Select Waybill"
            rules={[{ required: true, message: "Please select a waybill" }]}
            help="Only 'Open' waybills are listed"
          >
            <Select
              placeholder="Select a waybill"
              showSearch
              optionFilterProp="children"
              onChange={handleWaybillChange}
              allowClear
              onClear={() => {
                setSelectedWaybill(null);
                form.setFieldsValue({ route_name: "" });
              }}
            >
              {waybills.map((waybill) => (
                <Option key={waybill.id} value={waybill.id}>
                  {waybill.waybill_number} - {waybill.client_name} ({waybill.origin} → {waybill.destination})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="route_name"
            label="Route"
            rules={[{ required: true, message: "Route is required" }]}
          >
            <Input
              placeholder="Auto-filled from waybill"
              readOnly={!!selectedWaybill}
              style={selectedWaybill ? { backgroundColor: "#f5f5f5" } : undefined}
            />
          </Form.Item>

          <Divider />

          <Title level={5}>Resource Assignment</Title>

          <Form.Item
            name="truck_id"
            label="Select Truck"
            rules={[{ required: true, message: "Please select a truck" }]}
            help="Only 'Idle' or 'Offloaded' trucks are listed"
          >
            <Select placeholder="Select a truck" showSearch optionFilterProp="children">
              {trucks.map((truck) => (
                <Option key={truck.id} value={truck.id}>
                  {truck.plate_number} ({truck.make} {truck.model})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="trailer_id"
            label="Select Trailer"
            rules={[{ required: true, message: "Please select a trailer" }]}
            help="Only 'Idle' or 'Offloaded' trailers are listed"
          >
            <Select placeholder="Select a trailer" showSearch optionFilterProp="children">
              {trailers.map((trailer) => (
                <Option key={trailer.id} value={trailer.id}>
                  {trailer.plate_number} ({trailer.type})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="driver_id"
            label="Select Driver"
            rules={[{ required: true, message: "Please select a driver" }]}
            help="Only 'Active' drivers are listed"
          >
            <Select placeholder="Select a driver" showSearch optionFilterProp="children">
              {drivers.map((driver) => (
                <Option key={driver.id} value={driver.id}>
                  {driver.full_name} ({driver.license_number})
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
}
