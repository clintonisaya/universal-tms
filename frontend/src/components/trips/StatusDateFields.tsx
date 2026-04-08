"use client";

import { Form, DatePicker, Input, Row, Col, Alert, Skeleton, Divider, Switch } from "antd";
import type { TripStatus } from "@/types/trip";
import { ALL_RETURN_STATUSES } from "@/constants/tripStatuses";

interface StatusDateFieldsProps {
  selectedStatus: TripStatus | null;
  nextBorder: any | null;
  existingCrossing: any | null;
  loadingBorder: boolean;
}

export function StatusDateFields({
  selectedStatus,
  nextBorder,
  existingCrossing,
  loadingBorder,
}: StatusDateFieldsProps) {
  return (
    <>
      {/* Breakdown reason */}
      {selectedStatus === "Breakdown" && (
        <Form.Item
          name="breakdown_reason"
          label="Breakdown Reason"
          rules={[{ required: true, message: "Please describe the breakdown reason." }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Describe what happened and current location of the truck"
            maxLength={500}
            showCount
          />
        </Form.Item>
      )}

      <Form.Item name="is_delayed" label="Mark as Delayed" valuePropName="checked">
        <Switch />
      </Form.Item>

      {/* Border Crossing Sub-Form */}
      {(selectedStatus === "At Border" || selectedStatus === "At Border (Return)") && (
        <div style={{ marginBottom: 12 }}>
          {loadingBorder ? (
            <Skeleton active paragraph={{ rows: 3 }} />
          ) : nextBorder ? (
            <>
              <Alert
                title={
                  <span>
                    <strong>Border Crossing: </strong>{nextBorder.display_name}
                  </span>
                }
                description={
                  selectedStatus === "At Border"
                    ? `Going: ${nextBorder.side_a_name} → ${nextBorder.side_b_name}`
                    : `Returning: ${nextBorder.side_b_name} → ${nextBorder.side_a_name}`
                }
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
              />
              <Divider style={{ margin: "8px 0" }}>
                Border Dates — {selectedStatus === "At Border" ? nextBorder.side_a_name : nextBorder.side_b_name}
              </Divider>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="border_arrived_side_a_at"
                    label={`Arrived at ${selectedStatus === "At Border" ? nextBorder.side_a_name : nextBorder.side_b_name}`}
                  >
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="border_documents_submitted_side_a_at"
                    label={`Documents Submitted at ${selectedStatus === "At Border" ? nextBorder.side_a_name : nextBorder.side_b_name}`}
                  >
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="border_documents_cleared_side_a_at"
                    label={`Documents Cleared at ${selectedStatus === "At Border" ? nextBorder.side_a_name : nextBorder.side_b_name}`}
                  >
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
              <Divider style={{ margin: "8px 0" }}>
                Crossing
              </Divider>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="border_arrived_side_b_at"
                    label={`Crossed ${selectedStatus === "At Border" ? nextBorder.side_a_name : nextBorder.side_b_name} (= Arrive at ${selectedStatus === "At Border" ? nextBorder.side_b_name : nextBorder.side_a_name})`}
                  >
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="border_departed_border_at" label="Departed Border Zone">
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          ) : (
            <Alert
              title="No border crossings declared for this waybill"
              description="Add borders to the waybill to track crossing timestamps."
              type="info"
              showIcon
            />
          )}
        </div>
      )}

      {/* Dispatch Date */}
      {selectedStatus === "Dispatched" && (
        <Form.Item
          name="dispatch_date"
          label="Dispatch Date"
          rules={[{ required: true, message: "Please enter dispatch date" }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Select dispatch date" />
        </Form.Item>
      )}

      {/* Arrived at Loading Point */}
      {selectedStatus === "Arrived at Loading Point" && (
        <Form.Item
          name="arrival_loading_date"
          label="Arrival at Loading Point"
          rules={[{ required: true, message: "Please enter arrival date" }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Date arrived at loading point" />
        </Form.Item>
      )}

      {/* Loading Dates */}
      {selectedStatus === "Loading" && (
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="loading_start_date"
              label="Loading Start Date"
              rules={[{ required: true, message: "Required" }]}
            >
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Loading started" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="loading_end_date"
              label="Loading Complete Date (auto-advances to Loaded)"
            >
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Loading completed" />
            </Form.Item>
          </Col>
        </Row>
      )}

      {/* Arrived at Destination */}
      {selectedStatus === "Arrived at Destination" && (
        <Form.Item
          name="arrival_offloading_date"
          label="Arrival at Destination"
          rules={[{ required: true, message: "Please enter arrival date" }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Date arrived at destination" />
        </Form.Item>
      )}

      {/* Offloading Date */}
      {selectedStatus === "Offloading" && (
        <Form.Item
          name="offloading_date"
          label="Offloading Date (auto-advances to Offloaded)"
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Offloading date" />
        </Form.Item>
      )}

      {/* Returning Empty */}
      {selectedStatus === "Returning Empty" && (
        <Form.Item name="arrival_return_date" label="Arrival at Yard">
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Date truck arrived back (auto-advances to Waiting for PODs)" />
        </Form.Item>
      )}

      {/* Arrived at Yard */}
      {selectedStatus === "Arrived at Yard" && (
        <Form.Item
          name="arrival_return_date"
          label="Arrival at Yard"
          rules={[{ required: true, message: "Please enter return date" }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Date truck returned to yard" />
        </Form.Item>
      )}

      {/* Dispatched (Return) */}
      {selectedStatus === "Dispatched (Return)" && (
        <Form.Item
          name="dispatch_return_date"
          label="Dispatch Date (Return)"
          rules={[{ required: true, message: "Please enter return dispatch date" }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Date dispatched for return journey" />
        </Form.Item>
      )}

      {/* Arrived at Loading Point (Return) */}
      {selectedStatus === "Arrived at Loading Point (Return)" && (
        <Form.Item
          name="arrival_loading_return_date"
          label="Arrival at Return Loading Point"
          rules={[{ required: true, message: "Please enter arrival date" }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Date arrived at return loading point" />
        </Form.Item>
      )}

      {/* Loading (Return) */}
      {selectedStatus === "Loading (Return)" && (
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="loading_return_start_date"
              label="Return Loading Start"
              rules={[{ required: true, message: "Required" }]}
            >
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Return loading started" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="loading_return_end_date" label="Return Loading Complete (auto-advances to Loaded (Return))">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Return loading completed" />
            </Form.Item>
          </Col>
        </Row>
      )}

      {/* Arrived at Destination (Return) */}
      {selectedStatus === "Arrived at Destination (Return)" && (
        <Form.Item
          name="arrival_destination_return_date"
          label="Arrival at Return Destination"
          rules={[{ required: true, message: "Please enter arrival date" }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Date arrived at return destination" />
        </Form.Item>
      )}

      {/* Offloading (Return) */}
      {selectedStatus === "Offloading (Return)" && (
        <Form.Item
          name="offloading_return_date"
          label="Return Offloading Date (auto-advances to Offloaded (Return))"
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Date return cargo was offloaded" />
        </Form.Item>
      )}

      {/* In Transit (Return) */}
      {selectedStatus === "In Transit (Return)" && (
        <Form.Item name="loading_return_end_date" label="Return Loading Completed">
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Return loading completed" />
        </Form.Item>
      )}

      {/* Return Empty Container Date */}
      {(selectedStatus === "Returning Empty" || selectedStatus === "Arrived at Yard") && (
        <Form.Item name="return_empty_container_date" label="Return Empty Container Date">
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Return empty container date if any" />
        </Form.Item>
      )}

      {/* PODs Confirmed Date */}
      {selectedStatus === "Waiting for PODs" && (
        <Form.Item
          name="pods_confirmed_date"
          label="PODs Confirmed Date"
          extra="Filling this date automatically completes and closes the trip."
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} placeholder="Date PODs were confirmed" />
        </Form.Item>
      )}

      {/* Remarks — go leg */}
      {![...ALL_RETURN_STATUSES, "Offloaded (Return)", "Arrived at Yard", "Waiting for PODs"].includes(selectedStatus as TripStatus) && (
        <Form.Item name="remarks" label="Remarks">
          <Input.TextArea rows={2} placeholder="Optional notes for client report (go leg)" maxLength={500} />
        </Form.Item>
      )}
      {/* Remarks — return leg */}
      {[...ALL_RETURN_STATUSES, "Offloaded (Return)", "Arrived at Yard", "Waiting for PODs"].includes(selectedStatus as TripStatus) && (
        <Form.Item name="return_remarks" label="Remarks (Return)">
          <Input.TextArea rows={2} placeholder="Optional notes for client report (return leg)" maxLength={500} />
        </Form.Item>
      )}
    </>
  );
}
