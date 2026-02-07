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
  Radio,
  Row,
  Col,
} from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import type { Truck, TrucksResponse } from "@/types/truck";
import type { Trailer, TrailersResponse } from "@/types/trailer";
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
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [assetType, setAssetType] = useState<"truck" | "trailer">("truck");

  useEffect(() => {
    const fetchResources = async () => {
      setResourcesLoading(true);
      try {
        const [trucksRes, trailersRes] = await Promise.all([
          fetch("/api/v1/trucks/?limit=1000", { credentials: "include" }),
          fetch("/api/v1/trailers/?limit=1000", { credentials: "include" }),
        ]);

        if (trucksRes.ok && trailersRes.ok) {
          const trucksData: TrucksResponse = await trucksRes.json();
          const trailersData: TrailersResponse = await trailersRes.json();
          setTrucks(trucksData.data);
          setTrailers(trailersData.data);
        } else {
          message.error("Failed to load resources");
        }
      } catch (error) {
        message.error("Network error loading resources");
      } finally {
        setResourcesLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchResources();
    }
  }, [authLoading, user]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const payload: MaintenanceEventCreate = {
        truck_id: values.asset_type === "truck" ? values.asset_id : null,
        trailer_id: values.asset_type === "trailer" ? values.asset_id : null,
        garage_name: values.garage_name,
        description: values.description,
        cost: values.cost,
        currency: values.currency,
        start_date: values.start_date.toISOString(),
        end_date: values.end_date ? values.end_date.toISOString() : null,
        update_truck_status: values.asset_type === "truck" ? values.update_status : false,
        update_trailer_status: values.asset_type === "trailer" ? values.update_status : false,
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
        message.success("Maintenance record created successfully");
        router.push("/fleet/maintenance");
      } else {
        const errorData = await response.json();
        message.error(errorData.detail || "Failed to create maintenance record");
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
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
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

          <Card loading={resourcesLoading}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{
                start_date: dayjs(),
                update_status: false,
                asset_type: "truck",
                currency: "USD",
              }}
            >
              <div style={{ marginBottom: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="asset_type"
                      label="Maintenance For"
                      rules={[{ required: true }]}
                    >
                      <Radio.Group onChange={(e) => setAssetType(e.target.value)}>
                        <Radio value="truck">Truck</Radio>
                        <Radio value="trailer">Trailer</Radio>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    <Form.Item
                      name="asset_id"
                      label={assetType === "truck" ? "Select Truck" : "Select Trailer"}
                      rules={[{ required: true, message: `Please select a ${assetType}` }]}
                    >
                      <Select
                        placeholder={`Select ${assetType === "truck" ? "Truck" : "Trailer"}`}
                        showSearch
                        optionFilterProp="children"
                      >
                        {assetType === "truck"
                          ? trucks.map((truck) => (
                              <Select.Option key={truck.id} value={truck.id}>
                                {truck.plate_number} - {truck.make} {truck.model} ({truck.status})
                              </Select.Option>
                            ))
                          : trailers.map((trailer) => (
                              <Select.Option key={trailer.id} value={trailer.id}>
                                {trailer.plate_number} - {trailer.make} ({trailer.status})
                              </Select.Option>
                            ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="garage_name"
                    label="Garage / Service Provider"
                    rules={[{ required: true, message: "Please enter garage name" }]}
                  >
                    <Input placeholder="e.g. AutoXpress" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="cost"
                    label="Cost"
                    rules={[{ required: true, message: "Please enter cost" }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      step={0.01}
                      precision={2}
                      placeholder="0.00"
                    />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item
                    name="currency"
                    label="Currency"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Select.Option value="USD">USD</Select.Option>
                      <Select.Option value="TZS">TZS</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="description"
                label="Maintenance Description"
                rules={[{ required: true, message: "Please enter description" }]}
              >
                <TextArea rows={4} placeholder="e.g. Oil Change, Brake Pad Replacement, Trailer Axle Repair" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="start_date"
                    label="Start Date"
                    rules={[{ required: true, message: "Please select start date" }]}
                  >
                    <DatePicker showTime style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="end_date"
                    label="End Date (Optional)"
                  >
                    <DatePicker showTime style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="update_status"
                valuePropName="checked"
              >
                <Checkbox>
                  Set {assetType === "truck" ? "Truck" : "Trailer"} Status to "Maintenance"
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
