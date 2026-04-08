"use client";

import { Collapse, Space, Spin, Descriptions, Typography } from "antd";
import { StatusBadge } from "@/components/ui/StatusBadge";

const { Text } = Typography;

interface TripWaybillsTabProps {
  borderCrossings: any[];
  loadingCrossings: boolean;
}

export function TripWaybillsTab({ borderCrossings, loadingCrossings }: TripWaybillsTabProps) {
  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      {loadingCrossings ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin />
        </div>
      ) : borderCrossings.length === 0 ? (
        <Text type="secondary">No border crossings recorded for this trip.</Text>
      ) : (
        <Collapse
          items={borderCrossings.map((crossing: any) => {
            const bp = crossing.border_post;
            const isGo = crossing.direction === "go";
            const sideALabel = isGo ? bp?.side_a_name : bp?.side_b_name;
            const sideBLabel = isGo ? bp?.side_b_name : bp?.side_a_name;

            const dateFields = [
              { field: "arrived_side_a_at", label: `Arrived at ${sideALabel}` },
              { field: "documents_submitted_side_a_at", label: `Documents Submitted at ${sideALabel}` },
              { field: "documents_cleared_side_a_at", label: `Documents Cleared at ${sideALabel}` },
              { field: "arrived_side_b_at", label: `Crossed ${sideALabel} (= Arrive at ${sideBLabel})` },
              { field: "departed_border_at", label: "Departed Border Zone" },
            ];

            const filledCount = dateFields.filter((df) => crossing[df.field]).length;
            const completionTag =
              filledCount === 5 ? (
                <StatusBadge status="Complete" colorKey="green" />
              ) : filledCount > 0 ? (
                <StatusBadge status={`In Progress (${filledCount}/5)`} colorKey="orange" />
              ) : (
                <StatusBadge status="Pending" colorKey="gray" />
              );

            return {
              key: crossing.id,
              label: (
                <Space>
                  <strong>{bp?.display_name || "Unknown Border"}</strong>
                  <StatusBadge status={isGo ? "Go" : "Return"} colorKey={isGo ? "gray" : "blue"} />
                  {completionTag}
                </Space>
              ),
              children: (
                <Descriptions bordered column={1} size="small">
                  {dateFields.map((df) => (
                    <Descriptions.Item key={df.field} label={df.label}>
                      {crossing[df.field]
                        ? new Date(crossing[df.field]).toLocaleDateString("en-GB", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                        })
                        : "—"}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              ),
            };
          })}
        />
      )}
    </Space>
  );
}
