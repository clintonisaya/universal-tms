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
  Modal,
} from "antd";
import { SaveOutlined, PlusOutlined } from "@ant-design/icons";

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

const SESSION_FORM_KEY = "form_state_create_trip";

export function CreateTripDrawer({
  open,
  onClose,
  onSuccess,
  waybillId,
  routeName,
}: CreateTripDrawerProps) {
  const [form] = Form.useForm();
  const [addTruckForm] = Form.useForm();
  const [addDriverForm] = Form.useForm();

  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);

  // Inline creation state (AC-3, AC-4)
  const [addTruckOpen, setAddTruckOpen] = useState(false);
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [addTruckSubmitting, setAddTruckSubmitting] = useState(false);
  const [addDriverSubmitting, setAddDriverSubmitting] = useState(false);

  // AC-1: Serialize form state to sessionStorage when session expires
  useEffect(() => {
    const handleSessionExpired = () => {
      const currentValues = form.getFieldsValue();
      const hasData = Object.values(currentValues).some(
        (v) => v !== undefined && v !== null && v !== ""
      );
      if (open && hasData) {
        sessionStorage.setItem(SESSION_FORM_KEY, JSON.stringify(currentValues));
      }
    };
    window.addEventListener("session-expired", handleSessionExpired);
    return () => window.removeEventListener("session-expired", handleSessionExpired);
  }, [form, open]);

  useEffect(() => {
    if (open) {
      fetchResources();
      form.resetFields();
      setSelectedWaybill(null);

      // AC-1 & AC-2: Restore form data after session re-login
      const savedStateStr = sessionStorage.getItem(SESSION_FORM_KEY);
      if (savedStateStr) {
        try {
          const savedState = JSON.parse(savedStateStr);
          sessionStorage.removeItem(SESSION_FORM_KEY);
          form.setFieldsValue(savedState);
          // AC-2: Show restoration notification
          setTimeout(() => message.info("Your form data was restored after re-login."), 0);
          return; // Skip normal pre-fill when restoring — savedState already has it
        } catch {
          sessionStorage.removeItem(SESSION_FORM_KEY);
        }
      }

      // Normal init: pre-fill waybill/route if provided by parent
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
        sessionStorage.removeItem(SESSION_FORM_KEY); // Clear any saved state on success
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

  // AC-3, AC-4: Inline truck creation handler
  const handleAddTruck = async (values: { plate_number: string; make: string; model: string }) => {
    setAddTruckSubmitting(true);
    try {
      const response = await fetch("/api/v1/trucks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...values, status: "Idle" }),
      });
      if (response.ok) {
        const newTruck: Truck = await response.json();
        message.success("Truck registered successfully");
        // Add to local options and auto-select (AC-4)
        setTrucks((prev) => [...prev, newTruck]);
        form.setFieldValue("truck_id", newTruck.id);
        addTruckForm.resetFields();
        setAddTruckOpen(false);
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create truck");
      }
    } catch {
      message.error("Network error");
    } finally {
      setAddTruckSubmitting(false);
    }
  };

  // AC-3, AC-4: Inline driver creation handler
  const handleAddDriver = async (values: { full_name: string; license_number: string }) => {
    setAddDriverSubmitting(true);
    try {
      const response = await fetch("/api/v1/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...values, status: "Active" }),
      });
      if (response.ok) {
        const newDriver: Driver = await response.json();
        message.success("Driver registered successfully");
        // Add to local options and auto-select (AC-4)
        setDrivers((prev) => [...prev, newDriver]);
        form.setFieldValue("driver_id", newDriver.id);
        addDriverForm.resetFields();
        setAddDriverOpen(false);
      } else {
        const error = await response.json();
        message.error(error.detail || "Failed to create driver");
      }
    } catch {
      message.error("Network error");
    } finally {
      setAddDriverSubmitting(false);
    }
  };

  return (
    <>
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
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
              <Spin size="large" />
            </div>
          ) : (
            <>
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

              {/* AC-3: Truck Select with inline "+ Add New Truck" */}
              <Form.Item
                name="truck_id"
                label="Select Truck"
                rules={[{ required: true, message: "Please select a truck" }]}
                help="Only 'Idle' or 'Offloaded' trucks are listed"
              >
                <Select
                  placeholder="Select a truck"
                  showSearch
                  optionFilterProp="children"
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: "8px 0" }} />
                      <Button
                        type="link"
                        icon={<PlusOutlined />}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAddTruckOpen(true);
                        }}
                        style={{ width: "100%", textAlign: "left", paddingLeft: 12 }}
                      >
                        Add New Truck
                      </Button>
                    </>
                  )}
                >
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

              {/* AC-3: Driver Select with inline "+ Add New Driver" */}
              <Form.Item
                name="driver_id"
                label="Select Driver"
                rules={[{ required: true, message: "Please select a driver" }]}
                help="Only 'Active' drivers are listed"
              >
                <Select
                  placeholder="Select a driver"
                  showSearch
                  optionFilterProp="children"
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: "8px 0" }} />
                      <Button
                        type="link"
                        icon={<PlusOutlined />}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setAddDriverOpen(true);
                        }}
                        style={{ width: "100%", textAlign: "left", paddingLeft: 12 }}
                      >
                        Add New Driver
                      </Button>
                    </>
                  )}
                >
                  {drivers.map((driver) => (
                    <Option key={driver.id} value={driver.id}>
                      {driver.full_name} ({driver.license_number})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}
        </Form>
      </Drawer>

      {/* AC-3, AC-4: Inline Truck Creation Modal */}
      <Modal
        title="Register New Truck"
        open={addTruckOpen}
        onCancel={() => {
          addTruckForm.resetFields();
          setAddTruckOpen(false);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={addTruckForm}
          layout="vertical"
          onFinish={handleAddTruck}
        >
          <Form.Item
            name="plate_number"
            label="Plate Number"
            rules={[
              { required: true, message: "Please enter plate number" },
              { max: 20, message: "Plate number too long" },
            ]}
          >
            <Input placeholder="e.g., T998 EMQ" />
          </Form.Item>
          <Form.Item
            name="make"
            label="Make"
            rules={[{ required: true, message: "Please enter make" }]}
          >
            <Input placeholder="e.g., XCMG" />
          </Form.Item>
          <Form.Item
            name="model"
            label="Model"
            rules={[{ required: true, message: "Please enter model" }]}
          >
            <Input placeholder="e.g., HANVAN G7" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  addTruckForm.resetFields();
                  setAddTruckOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={addTruckSubmitting}>
                Register Truck
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* AC-3, AC-4: Inline Driver Creation Modal */}
      <Modal
        title="Register New Driver"
        open={addDriverOpen}
        onCancel={() => {
          addDriverForm.resetFields();
          setAddDriverOpen(false);
        }}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={addDriverForm}
          layout="vertical"
          onFinish={handleAddDriver}
        >
          <Form.Item
            name="full_name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter driver name" }]}
          >
            <Input placeholder="e.g., John Mwangi" />
          </Form.Item>
          <Form.Item
            name="license_number"
            label="License Number"
            rules={[{ required: true, message: "Please enter license number" }]}
          >
            <Input placeholder="e.g., DL-1234567" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button
                onClick={() => {
                  addDriverForm.resetFields();
                  setAddDriverOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={addDriverSubmitting}>
                Register Driver
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
