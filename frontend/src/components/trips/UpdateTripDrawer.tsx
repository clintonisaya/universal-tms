"use client";

import { useState, useEffect, useRef } from "react";
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
import { SaveOutlined, WarningOutlined } from "@ant-design/icons";
import type { TripDetailed } from "@/types/trip";

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

interface Waybill {
    id: string;
    waybill_number: string;
    client_name: string;
    origin: string;
    destination: string;
    status: string;
}

interface UpdateTripDrawerProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tripId: string | null;
}

export function UpdateTripDrawer({
    open,
    onClose,
    onSuccess,
    tripId,
}: UpdateTripDrawerProps) {
    const [form] = Form.useForm();

    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [trailers, setTrailers] = useState<Trailer[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [waybills, setWaybills] = useState<Waybill[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);
    const originalTruckId = useRef<string | null>(null);
    const currentTripNumber = useRef<string | null>(null);

    useEffect(() => {
        if (open && tripId) {
            fetchTripAndResources();
        } else if (!open) {
            form.resetFields();
            setSelectedWaybill(null);
            originalTruckId.current = null;
            currentTripNumber.current = null;
        }
    }, [open, tripId, form]);

    const fetchTripAndResources = async () => {
        setLoading(true);
        try {
            // Fetch trip details
            const tripRes = await fetch(`/api/v1/trips/${tripId}`, { credentials: "include" });
            if (!tripRes.ok) throw new Error("Failed to fetch trip details");
            const tripData: TripDetailed = await tripRes.json();

            originalTruckId.current = tripData.truck_id;
            currentTripNumber.current = tripData.trip_number;

            const [trucksRes, trailersRes, driversRes, waybillsRes] = await Promise.all([
                fetch("/api/v1/trips/available-trucks", { credentials: "include" }),
                fetch("/api/v1/trips/available-trailers", { credentials: "include" }),
                fetch("/api/v1/trips/available-drivers", { credentials: "include" }),
                fetch("/api/v1/waybills?status=Open&limit=100", { credentials: "include" }),
            ]);

            let loadedTrucks: Truck[] = [];
            let loadedTrailers: Trailer[] = [];
            let loadedDrivers: Driver[] = [];
            let loadedWaybills: Waybill[] = [];

            if (trucksRes.ok) loadedTrucks = (await trucksRes.json()).data;
            if (trailersRes.ok) loadedTrailers = (await trailersRes.json()).data;
            if (driversRes.ok) loadedDrivers = (await driversRes.json()).data;
            if (waybillsRes.ok) loadedWaybills = (await waybillsRes.json()).data;

            // Ensure the trip's current resources are included in the lists so the dropdowns show them properly
            if (tripData.truck && !loadedTrucks.some(t => t.id === tripData.truck_id)) {
                loadedTrucks.push(tripData.truck as Truck);
            }
            if (tripData.trailer && !loadedTrailers.some(t => t.id === tripData.trailer_id)) {
                loadedTrailers.push(tripData.trailer as Trailer);
            }
            if (tripData.driver && !loadedDrivers.some(d => d.id === tripData.driver_id)) {
                loadedDrivers.push(tripData.driver as Driver);
            }

            // If the trip already has a waybill and it's not "Open", it won't be in loadedWaybills
            if (tripData.waybill_id) {
                if (!loadedWaybills.some(w => w.id === tripData.waybill_id)) {
                    // Fetch the current waybill separately
                    const wbRes = await fetch(`/api/v1/waybills/${tripData.waybill_id}`, { credentials: "include" });
                    if (wbRes.ok) {
                        const currentWb: Waybill = await wbRes.json();
                        loadedWaybills.push(currentWb);
                        setSelectedWaybill(currentWb);
                    }
                } else {
                    setSelectedWaybill(loadedWaybills.find(w => w.id === tripData.waybill_id) || null);
                }
            }

            setTrucks(loadedTrucks);
            setTrailers(loadedTrailers);
            setDrivers(loadedDrivers);
            setWaybills(loadedWaybills);

            form.setFieldsValue({
                waybill_id: tripData.waybill_id,
                route_name: tripData.route_name,
                truck_id: tripData.truck_id,
                trailer_id: tripData.trailer_id,
                driver_id: tripData.driver_id,
            });

        } catch {
            message.error("Failed to load trip and resources");
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
        }
    };

    const submitUpdate = async (values: any) => {
        if (!tripId) return;
        setSubmitting(true);
        try {
            const response = await fetch(`/api/v1/trips/${tripId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(values),
            });

            if (response.ok) {
                message.success("Trip updated successfully");
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
                    message.error(typeof error.detail === "string" ? error.detail : "Failed to update trip");
                }
            }
        } catch {
            message.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    const onFinish = async (values: any) => {
        if (!tripId) return;

        const truckChanged = originalTruckId.current && values.truck_id !== originalTruckId.current;

        if (truckChanged) {
            // Fetch preview data to show in confirmation
            try {
                const previewRes = await fetch(
                    `/api/v1/trips/${tripId}/swap-truck-preview?truck_id=${values.truck_id}`,
                    { credentials: "include" }
                );

                if (!previewRes.ok) {
                    const err = await previewRes.json();
                    message.error(typeof err.detail === "string" ? err.detail : "Failed to preview truck change");
                    return;
                }

                const preview = await previewRes.json();
                const newTruck = trucks.find(t => t.id === values.truck_id);
                const newPlate = newTruck?.plate_number || preview.new_truck_plate;

                Modal.confirm({
                    title: "Confirm Vehicle Change",
                    icon: <WarningOutlined style={{ color: "#faad14" }} />,
                    content: (
                        <div>
                            <p>
                                Changing the truck will <Text strong>regenerate the trip number</Text> based
                                on the new vehicle.
                            </p>
                            <div style={{ background: "#fafafa", padding: 12, borderRadius: 6, margin: "12px 0" }}>
                                <div>
                                    <Text type="secondary">Current trip: </Text>
                                    <Text strong>{preview.current_trip_number}</Text>
                                </div>
                                <div>
                                    <Text type="secondary">New truck: </Text>
                                    <Text strong>{newPlate}</Text>
                                </div>
                                {preview.expenses_to_renumber > 0 && (
                                    <div style={{ marginTop: 8 }}>
                                        <Text type="warning">
                                            {preview.expenses_to_renumber} expense{preview.expenses_to_renumber > 1 ? "s" : ""} will
                                            be renumbered to match the new trip number.
                                        </Text>
                                    </div>
                                )}
                            </div>
                            <Text type="secondary">Previous numbers will be kept in the system logs.</Text>
                        </div>
                    ),
                    okText: "Confirm Change",
                    cancelText: "Cancel",
                    onOk: () => submitUpdate(values),
                });
            } catch {
                message.error("Network error while previewing truck change");
            }
        } else {
            submitUpdate(values);
        }
    };

    return (
        <Drawer
            title="Edit Trip"
            open={open}
            onClose={onClose}
            styles={{ wrapper: { width: 1200 } }}
            destroyOnHidden={false}
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
                        Update Trip
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
                        help="Attach a missed waybill or update it if incorrect"
                    >
                        <Select
                            placeholder="Select a waybill"
                            showSearch
                            optionFilterProp="children"
                            onChange={handleWaybillChange}
                            allowClear
                            onClear={() => {
                                setSelectedWaybill(null);
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
                        <Input placeholder="Enter route (e.g., Mombasa - Nairobi)" />
                    </Form.Item>

                    <Divider />

                    <Title level={5}>Resource Assignment</Title>

                    <Form.Item
                        name="truck_id"
                        label="Select Truck"
                        rules={[{ required: true, message: "Please select a truck" }]}
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
                    >
                        <Select placeholder="Select a driver" showSearch optionFilterProp="children">
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
    );
}
