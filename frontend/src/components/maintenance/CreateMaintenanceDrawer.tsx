"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  InputNumber,
  Checkbox,
  Space,
  message,
  Spin,
  Radio,
  Row,
  Col,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { amountInputProps } from "@/lib/utils";
import { EmptyAwareSelect } from "@/components/ui/EmptyAwareSelect";
import type { Truck, TrucksResponse } from "@/types/truck";
import type { Trailer, TrailersResponse } from "@/types/trailer";
import type { MaintenanceEvent, MaintenanceEventCreate } from "@/types/maintenance";
import dayjs from "dayjs";

const { TextArea } = Input;

interface CreateMaintenanceDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** When provided the drawer operates in edit mode */
  initialValues?: MaintenanceEvent | null;
}

export function CreateMaintenanceDrawer({
  open,
  onClose,
  onSuccess,
  initialValues,
}: CreateMaintenanceDrawerProps) {
  const [form] = Form.useForm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [assetType, setAssetType] = useState<"truck" | "trailer">("truck");

  const isEditMode = !!initialValues;

  useEffect(() => {
    if (open) {
      fetchResources();
      if (initialValues) {
        // Edit mode — pre-fill from existing record
        const type = initialValues.truck_id ? "truck" : "trailer";
        setAssetType(type);
        form.setFieldsValue({
          asset_type: type,
          asset_id: initialValues.truck_id || initialValues.trailer_id,
          garage_name: initialValues.garage_name,
          description: initialValues.description,
          cost: initialValues.expense?.amount ?? undefined,
          currency: initialValues.currency,
          start_date: dayjs(initialValues.start_date),
          end_date: initialValues.end_date ? dayjs(initialValues.end_date) : null,
        });
      } else {
        // Create mode — reset to defaults
        form.resetFields();
        form.setFieldsValue({
          start_date: dayjs(),
          update_truck_status: false,
          update_trailer_status: false,
          asset_type: "truck",
          currency: "USD",
        });
        setAssetType("truck");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues]);

  const fetchResources = async () => {
    setResourcesLoading(true);
    try {
      const [trucksRes, trailersRes] = await Promise.all([
        fetch("/api/v1/trucks?limit=1000", { credentials: "include" }),
        fetch("/api/v1/trailers?limit=1000", { credentials: "include" }),
      ]);

      if (trucksRes.ok && trailersRes.ok) {
        const trucksData: TrucksResponse = await trucksRes.json();
        const trailersData: TrailersResponse = await trailersRes.json();
        setTrucks(trucksData.data);
        setTrailers(trailersData.data);
      } else {
        message.error("Failed to load resources");
      }
    } catch {
      message.error("Network error loading resources");
    } finally {
      setResourcesLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (isEditMode && initialValues) {
        // PATCH — update existing record
        const payload: Record<string, unknown> = {
          garage_name: values.garage_name,
          description: values.description,
          cost: values.cost,
          currency: values.currency,
          start_date: values.start_date.toISOString(),
          end_date: values.end_date ? values.end_date.toISOString() : null,
        };
        const response = await fetch(`/api/v1/maintenance/${initialValues.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        if (response.ok) {
          message.success("Maintenance record updated successfully");
          onSuccess();
          onClose();
        } else {
          const errorData = await response.json();
          message.error(errorData.detail || "Failed to update maintenance record");
        }
      } else {
        // POST — create new record
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
        const response = await fetch("/api/v1/maintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
        if (response.ok) {
          message.success("Maintenance record created successfully");
          form.resetFields();
          onSuccess();
          onClose();
        } else {
          const errorData = await response.json();
          message.error(errorData.detail || "Failed to create maintenance record");
        }
      }
    } catch {
      message.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title={isEditMode ? "Edit Maintenance Record" : "New Maintenance Record"}
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
            loading={loading}
            onClick={() => form.submit()}
          >
            {isEditMode ? "Save Changes" : "Create Record"}
          </Button>
        </Space>
      }
    >
      {resourcesLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <div style={{ marginBottom: 24, padding: 16, background: "var(--color-surface)", borderRadius: 8 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="asset_type"
                  label="Maintenance For"
                  rules={[{ required: true }]}
                >
                  <Radio.Group
                    onChange={(e) => setAssetType(e.target.value)}
                    disabled={isEditMode}
                  >
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
                  <EmptyAwareSelect
                    placeholder={`Select ${assetType === "truck" ? "Truck" : "Trailer"}`}
                    showSearch
                    optionFilterProp="children"
                    disabled={isEditMode}
                    options={
                      assetType === "truck"
                        ? trucks.map((t) => ({
                            value: t.id,
                            label: `${t.plate_number} - ${t.make} ${t.model} (${t.status})`,
                          }))
                        : trailers.map((t) => ({
                            value: t.id,
                            label: `${t.plate_number} - ${t.make} (${t.status})`,
                          }))
                    }
                    emptyMessage={`No ${assetType === "truck" ? "trucks" : "trailers"} available`}
                    emptyDescription={`Register a ${assetType} to create a maintenance record`}
                    createLabel={assetType === "truck" ? "Register Truck" : "Register Trailer"}
                    onCreate={() =>
                      router.push(assetType === "truck" ? "/fleet/trucks" : "/fleet/trailers")
                    }
                    loading={resourcesLoading}
                  />
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
                  {...amountInputProps}
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
              <Form.Item name="end_date" label="End Date (Optional)">
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          {!isEditMode && (
            <Form.Item name="update_status" valuePropName="checked">
              <Checkbox>
                Set {assetType === "truck" ? "Truck" : "Trailer"} Status to "Maintenance"
              </Checkbox>
            </Form.Item>
          )}
        </Form>
      )}
    </Drawer>
  );
}
