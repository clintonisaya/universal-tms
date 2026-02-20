"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
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
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";

const { Title, Text } = Typography;
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

function NewTripForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [form] = Form.useForm();
  
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchResources();
    }
  }, [user]);

  useEffect(() => {
    const waybillId = searchParams.get("waybill_id");
    const routeName = searchParams.get("route_name");
    
    if (waybillId || routeName) {
      form.setFieldsValue({
        waybill_id: waybillId,
        route_name: routeName,
      });
    }
  }, [searchParams, form]);

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
        router.push("/ops/trips");
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
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f2f5",
        padding: "24px",
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
            <Title level={2} style={{ margin: 0 }}>Create New Trip</Title>
          </div>

          <Card loading={loading}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              size="large"
            >
              <Form.Item name="waybill_id" hidden>
                <Input />
              </Form.Item>

              <Title level={4}>Route Information</Title>
              <Form.Item
                name="route_name"
                label="Route Name"
                rules={[{ required: true, message: "Please enter the route" }]}
              >
                <Input placeholder="e.g. Mombasa - Nairobi" />
              </Form.Item>

              <Divider />
              
              <Title level={4}>Resource Assignment</Title>
              
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
                    Dispatch Trip
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

export default function NewTripPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    }>
      <NewTripForm />
    </Suspense>
  );
}