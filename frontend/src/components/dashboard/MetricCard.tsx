import { Card, Statistic, Typography } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number; // percentage
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  loading?: boolean;
  status?: "active" | "critical" | "normal"; // For styling borders/colors
  isRevenue?: boolean;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  trend,
  prefix,
  suffix,
  loading = false,
  status = "normal",
  isRevenue = false,
  onClick,
}: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case "critical":
        return "#ff4d4f"; // Red
      case "active":
        return "#1890ff"; // Blue for In Transit
      default:
        return "transparent";
    }
  };

  const getValueColor = () => {
    if (status === "critical") return "#ff4d4f";
    if (isRevenue) return "#D4AF37"; // Royal Gold
    return "#1F1F1F"; // Charcoal
  };

  return (
    <Card
      loading={loading}
      hoverable={!!onClick}
      onClick={onClick}
      style={{
        height: "100%",
        borderTop: `2px solid ${getStatusColor()}`,
        borderRadius: "4px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        cursor: onClick ? "pointer" : "default",
      }}
      bodyStyle={{ padding: "20px 24px" }}
    >
      <Statistic
        title={<Text type="secondary" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</Text>}
        value={value}
        prefix={prefix}
        suffix={suffix}
        valueStyle={{
          color: getValueColor(),
          fontWeight: 700,
          fontSize: isRevenue ? 28 : 24,
          fontFamily: "Inter, sans-serif",
        }}
      />
      {trend !== undefined && (
        <div style={{ marginTop: 8 }}>
          <Text
            type={trend >= 0 ? "success" : "danger"}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500 }}
          >
            {trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {Math.abs(trend)}%
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {" "}vs last week
          </Text>
        </div>
      )}
    </Card>
  );
}
