"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchResources();
      form.resetFields();
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
      const [trucksRes, trailersRes, driversRes] = await Promise.all([
        fetch("/api/v1/trips/available-trucks", { credentials: "include" }),
        fetch("/api/v1/trips/available-trailers", { credentials: "include" }),
        fetch("/api/v1/trips/available-drivers", { credentials: "include" }),
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
    } catch {
      message.error("Network error fetching resources");
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/trips/", {
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
        message.error(error.detail || "Failed to create trip");
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
          <Form.Item name="waybill_id" hidden>
            <Input />
          </Form.Item>

          <Title level={5}>Route Information</Title>
          <Form.Item
            name="route_name"
            label="Route Name"
            rules={[{ required: true, message: "Please enter the route" }]}
          >
            <Input placeholder="e.g. Mombasa - Nairobi" />
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
