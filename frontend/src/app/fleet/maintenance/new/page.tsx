"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  InputNumber,
  Checkbox,
  Card,
  message,
  Typography,
  Space,
  Spin,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import type { Truck, TrucksResponse } from "@/types/truck";
import type { MaintenanceEventCreate } from "@/types/maintenance";
import dayjs from "dayjs";

const { Title } = Typography;
const { TextArea } = Input;

export default function NewMaintenancePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trucksLoading, setTrucksLoading] = useState(false);

  useEffect(() => {
    const fetchTrucks = async () => {
      setTrucksLoading(true);
      try {
        const response = await fetch("/api/v1/trucks/?limit=1000", {
            credentials: "include",
        });
        if (response.ok) {
          const data: TrucksResponse = await response.json();
          setTrucks(data.data);
        } else {
          message.error("Failed to load trucks");
        }
      } catch (error) {
        message.error("Network error loading trucks");
      } finally {
        setTrucksLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchTrucks();
    }
  }, [authLoading, user]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const payload: MaintenanceEventCreate = {
        truck_id: values.truck_id,
        garage_name: values.garage_name,
        description: values.description,
        cost: values.cost,
        start_date: values.start_date.toISOString(),
        end_date: values.end_date ? values.end_date.toISOString() : null,
        update_truck_status: values.update_truck_status,
      };

      const response = await fetch("/api/v1/maintenance/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (response.ok) {
        message.success("Maintenance event created successfully");
        router.push("/fleet/maintenance");
      } else {
        const errorData = await response.json();
        message.error(errorData.detail || "Failed to create maintenance event");
      }
    } catch (error) {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div style={{ display: "flex", justifyContent: "center", marginTop: 50 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ padding: "24px", minHeight: "100vh", background: "#f0f2f5" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.back()}
            >
              Back
            </Button>
            <Title level={2} style={{ margin: 0 }}>
              New Maintenance Record
            </Title>
          </Space>

          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{
                start_date: dayjs(),
                update_truck_status: false,
              }}
            >
              <Form.Item
                name="truck_id"
                label="Truck"
                rules={[{ required: true, message: "Please select a truck" }]}
              >
                <Select
                  placeholder="Select Truck"
                  loading={trucksLoading}
                  showSearch
                  optionFilterProp="children"
                >
                  {trucks.map((truck) => (
                    <Select.Option key={truck.id} value={truck.id}>
                      {truck.plate_number} - {truck.make} {truck.model} ({truck.status})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="garage_name"
                label="Garage / Service Provider"
                rules={[{ required: true, message: "Please enter garage name" }]}
              >
                <Input placeholder="e.g. AutoXpress" />
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
                rules={[{ required: true, message: "Please enter description" }]}
              >
                <TextArea rows={4} placeholder="e.g. Oil Change, Brake Pad Replacement" />
              </Form.Item>

              <Form.Item
                name="cost"
                label="Cost (Currency)"
                rules={[{ required: true, message: "Please enter cost" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                  precision={2}
                  addonBefore="$"
                  placeholder="0.00"
                />
              </Form.Item>

              <Form.Item
                name="start_date"
                label="Start Date"
                rules={[{ required: true, message: "Please select start date" }]}
              >
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                name="end_date"
                label="End Date (Optional)"
              >
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                name="update_truck_status"
                valuePropName="checked"
              >
                <Checkbox>
                  Set Truck Status to "Maintenance"
                </Checkbox>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} block>
                  Create Maintenance Record
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Space>
      </div>
    </div>
  );
}
