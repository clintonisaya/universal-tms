"use client";

import { Descriptions, Space, Typography } from "antd";
import { EditOutlined } from "@ant-design/icons";
import { TripStatusTag } from "@/components/ui/TripStatusTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TripDetailed, PodDocument } from "@/types/trip";

const { Text } = Typography;

interface TripInfoPanelProps {
  trip: TripDetailed;
  onEditRemarks?: () => void;
}

export function TripInfoPanel({ trip, onEditRemarks }: TripInfoPanelProps) {
  const goPods = trip.pod_documents?.filter(
    (d) => typeof d === "string" || (d as any).leg === "go" || !(d as any).leg
  ) || [];
  const returnPods = trip.pod_documents?.filter(
    (d) => typeof d !== "string" && (d as any).leg === "return"
  ) || [];
  const getDocName = (d: PodDocument) => typeof d === "string" ? d : d.name;
  const getDocUrl = (d: PodDocument) => typeof d === "string" ? d : d.url;

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="Route">{trip.route_name}</Descriptions.Item>
        <Descriptions.Item label="Direction">
          <StatusBadge status={trip.return_waybill_id ? "Return" : "Go"} colorKey={trip.return_waybill_id ? "blue" : "gray"} />
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <TripStatusTag status={trip.status} isDelayed={trip.is_delayed} />
        </Descriptions.Item>
        <Descriptions.Item label="Detailed Status/Location">
          {trip.current_location || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Truck">
          {trip.truck ? `${trip.truck.plate_number} - ${trip.truck.make} ${trip.truck.model}` : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Trailer">
          {trip.trailer ? `${trip.trailer.plate_number} - ${trip.trailer.type}` : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Driver">{trip.driver?.full_name || "-"}</Descriptions.Item>
        <Descriptions.Item label="Start Date">
          {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="End Date">
          {trip.end_date ? new Date(trip.end_date).toLocaleDateString() : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Created">
          {trip.created_at ? new Date(trip.created_at).toLocaleDateString() : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Created By">
          {trip.created_by?.full_name || trip.created_by?.username || "-"}
        </Descriptions.Item>
        {trip.updated_by && (
          <Descriptions.Item label="Last Updated By">
            {trip.updated_by.full_name || trip.updated_by.username}
          </Descriptions.Item>
        )}
        {trip.remarks && (
          <Descriptions.Item label="Remarks" span={2}>
            <Text style={{ whiteSpace: "pre-wrap" }}>{trip.remarks}</Text>
            {onEditRemarks && (
              <EditOutlined
                style={{ marginLeft: 8, cursor: "pointer", color: "var(--color-primary)" }}
                onClick={onEditRemarks}
              />
            )}
          </Descriptions.Item>
        )}
      </Descriptions>

      {/* Go Waybill */}
      {trip.waybill_id && (
        <Descriptions
          title={<Text strong style={{ color: "var(--color-primary)" }}>Go Waybill</Text>}
          bordered column={2} size="small"
        >
          <Descriptions.Item label="Waybill #" span={2}>
            <Text strong>{trip.waybill_number ?? trip.waybill_id}</Text>
          </Descriptions.Item>
          {trip.dispatch_date && (
            <Descriptions.Item label="Dispatched">
              {new Date(trip.dispatch_date).toLocaleString()}
            </Descriptions.Item>
          )}
          {trip.arrival_loading_date && (
            <Descriptions.Item label="Arrival Loading">
              {new Date(trip.arrival_loading_date).toLocaleString()}
            </Descriptions.Item>
          )}
          {trip.offloading_date && (
            <Descriptions.Item label="Offloading">
              {new Date(trip.offloading_date).toLocaleString()}
            </Descriptions.Item>
          )}
        </Descriptions>
      )}

      {/* Return Waybill */}
      {trip.return_waybill_id && (
        <Descriptions
          title={<Text strong style={{ color: "var(--color-green)" }}>Return Waybill</Text>}
          bordered column={2} size="small"
        >
          <Descriptions.Item label="Waybill #" span={2}>
            <Text strong>{trip.return_waybill_number ?? trip.return_waybill_id}</Text>
          </Descriptions.Item>
          {trip.arrival_loading_return_date && (
            <Descriptions.Item label="Arrival at Return Loading">
              {new Date(trip.arrival_loading_return_date).toLocaleString()}
            </Descriptions.Item>
          )}
          {trip.loading_return_start_date && (
            <Descriptions.Item label="Loading Started">
              {new Date(trip.loading_return_start_date).toLocaleString()}
            </Descriptions.Item>
          )}
          {trip.loading_return_end_date && (
            <Descriptions.Item label="Loading Completed">
              {new Date(trip.loading_return_end_date).toLocaleString()}
            </Descriptions.Item>
          )}
          {trip.arrival_return_date && (
            <Descriptions.Item label="Returned to Yard">
              {new Date(trip.arrival_return_date).toLocaleString()}
            </Descriptions.Item>
          )}
        </Descriptions>
      )}

      {/* POD Documents */}
      {trip.pod_documents && trip.pod_documents.length > 0 && (
        <Space orientation="vertical" size="small" style={{ width: "100%" }}>
          {goPods.length > 0 && (
            <div>
              <Text strong>Go PODs</Text>
              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                {goPods.map((d, i) => (
                  <li key={i}>
                    <a href={getDocUrl(d)} target="_blank" rel="noreferrer">{getDocName(d)}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {returnPods.length > 0 && (
            <div>
              <Text strong style={{ color: "var(--color-green)" }}>Return PODs</Text>
              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                {returnPods.map((d, i) => (
                  <li key={i}>
                    <a href={getDocUrl(d)} target="_blank" rel="noreferrer">{getDocName(d)}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Space>
      )}
    </Space>
  );
}
