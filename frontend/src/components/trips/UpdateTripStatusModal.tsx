"use client";

import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  Space,
  message,
  Divider,
  Row,
  Col,
  Alert,
  Spin,
  Typography,
  Tooltip,
  theme,
} from "antd";
import dayjs from "dayjs";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { TripStatus } from "@/types/trip";
import { useTripStatusUpdate } from "@/hooks/useTripStatusUpdate";
import { StatusTimeline } from "./StatusTimeline";
import { StatusDateFields } from "./StatusDateFields";

const { Text, Link } = Typography;

interface UpdateTripStatusModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tripId: string;
  initialValues?: Partial<{ status: string; current_location?: string | null; return_waybill_id?: string | null; is_delayed?: boolean }>;
}

export function UpdateTripStatusModal({
  open,
  onClose,
  onSuccess,
  tripId,
  initialValues,
}: UpdateTripStatusModalProps) {
  const { token } = theme.useToken();
  const d = useTripStatusUpdate({ tripId, open, onSuccess, onClose, initialValues });

  return (
    <ErrorBoundary>
    <Modal
      title="Update Trip Status"
      open={open}
      onCancel={onClose}
      footer={null}
      confirmLoading={d.loadingResources}
      width={900}
      forceRender
      styles={{ body: { maxHeight: "75vh", overflowY: "auto", paddingBottom: 8 } }}
    >
      <StatusTimeline currentStatus={d.currentStatus} tripData={d.tripData} />

      <Spin spinning={d.loadingTrip}>
      <Form form={d.form} layout="vertical" onFinish={d.handleSubmit} onValuesChange={d.onValuesChange}>
        {d.isTripClosed && (
          <Alert
            title={`Trip is currently ${d.currentStatus}`}
            description={d.canReopen
              ? "Select a status below to reopen this trip."
              : "Only Manager or Admin can reopen this trip."}
            type={d.canReopen ? "warning" : "info"}
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {d.isReopening && (
          <Alert
            title="Reopening Trip"
            description={`You are about to change this trip from "${d.currentStatus}" to "${d.selectedStatus}".`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          name="status"
          label="New Status"
          rules={[{ required: true, message: "Please select a status" }]}
          extra={
            !d.isTripClosed && (
              <Link
                style={{ fontSize: "var(--font-sm)" }}
                onClick={() => message.info("Date correction feature coming soon. Contact your manager to adjust a date.")}
              >
                Need to correct a recorded date? →
              </Link>
            )
          }
        >
          <Select
            placeholder="Select status"
            onChange={d.handleStatusChange}
            disabled={d.isTripClosed && !d.canReopen}
          >
            {d.nextStepStatuses.length > 0 && (
              <Select.OptGroup label="Next Steps">
                {d.nextStepStatuses.map((status: TripStatus) => (
                  <Select.Option key={status} value={status}>{status}</Select.Option>
                ))}
              </Select.OptGroup>
            )}
            {d.specialStatuses.length > 0 && (
              <Select.OptGroup label="Special Actions">
                {d.specialStatuses.map((status: TripStatus) => (
                  <Select.Option key={status} value={status}>
                    {status === "Breakdown" ? (
                      <Tooltip title="Recoverable — ops manually advances status back when truck is repaired.">
                        <span style={{ color: token.colorWarning, fontWeight: 500 }}>
                          Breakdown
                        </span>
                      </Tooltip>
                    ) : (
                      <span style={{ color: token.colorError, fontWeight: 500 }}>
                        {status}
                      </span>
                    )}
                  </Select.Option>
                ))}
              </Select.OptGroup>
            )}
          </Select>
        </Form.Item>

        <StatusDateFields
          selectedStatus={d.selectedStatus}
          nextBorder={d.nextBorder}
          existingCrossing={d.existingCrossing}
          loadingBorder={d.loadingBorder}
        />

        <Divider style={{ margin: "12px 0" }}>Location</Divider>

        <Row gutter={12}>
          <Col span={14}>
            <Form.Item name="city" label="City / Place">
              <Input placeholder="e.g. Mbeya, Tunduma" />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              name="country"
              label="Country"
              rules={[
                {
                  validator: (_, value) => {
                    const city = d.form.getFieldValue("city");
                    if (city && !value) {
                      return Promise.reject("Country is required when a city is entered");
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Select
                placeholder="Select country"
                showSearch
                optionFilterProp="children"
                allowClear
                loading={d.loadingResources}
              >
                {d.countries.map((c) => (
                  <Select.Option key={c.id} value={c.name}>
                    {c.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, textAlign: "right", marginTop: 16 }}>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={d.submitting} disabled={d.loadingBorder}>
              Update Trip
            </Button>
          </Space>
        </Form.Item>
      </Form>
      </Spin>
    </Modal>
    </ErrorBoundary>
  );
}
