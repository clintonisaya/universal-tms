"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Badge, Button, Tooltip, Typography, Divider, Empty } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { TASK_TYPE_ICONS } from "@/types/notification";
import type { Notification } from "@/types/notification";

const { Text } = Typography;

// AC-2: Notification role filtering — filter at display time, never modify stored data
const ALL_ROLES = ['admin', 'manager', 'ops', 'dispatcher', 'finance', 'fleet'];
const TASK_TYPE_ROLE_MAP: Record<string, string[]> = {
  expense_approval: ['manager', 'admin'],
  payment_processing: ['finance', 'manager', 'admin'],
  expense_correction: ['ops', 'dispatcher', 'admin'],
};

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const ts = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - ts) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface NotificationCenterProps {
  onNotificationClick?: (taskId: string) => void;
}

export function NotificationCenter({
  onNotificationClick,
}: NotificationCenterProps) {
  const { user } = useAuth();
  const { notifications, markAsRead, markAllRead } =
    useNotifications(user?.id);
  const [open, setOpen] = useState(false);

  // AC-2, AC-3: Filter notifications by role at render time — stored data is never modified
  const roleFilteredNotifications = useMemo(() => {
    const userRole = user?.role ?? '';
    return notifications.filter((n) => {
      const allowedRoles = TASK_TYPE_ROLE_MAP[n.taskType] ?? ALL_ROLES;
      return allowedRoles.includes(userRole);
    });
  }, [notifications, user?.role]);

  const roleFilteredUnreadCount = useMemo(
    () => roleFilteredNotifications.filter((n) => !n.read).length,
    [roleFilteredNotifications],
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleItemClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    setOpen(false);
    onNotificationClick?.(notification.taskId);
  };

  // Show at most 10 in the dropdown (role-filtered — AC-2, AC-3)
  const visibleNotifications = roleFilteredNotifications.slice(0, 10);

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <Tooltip title="Notifications">
        <Badge
          count={roleFilteredUnreadCount}
          overflowCount={99}
          offset={[-4, 4]}
          color="#faad14"
        >
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 20 }} />}
            onClick={() => setOpen((prev) => !prev)}
            style={{
              height: 40,
              width: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        </Badge>
      </Tooltip>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 0,
            width: 350,
            maxHeight: 400,
            overflowY: "auto",
            background: "#fff",
            borderRadius: 8,
            boxShadow:
              "0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12), 0 9px 28px 8px rgba(0,0,0,0.05)",
            zIndex: 1050,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px 8px",
            }}
          >
            <Text strong style={{ fontSize: 14 }}>
              Notifications
            </Text>
            {roleFilteredUnreadCount > 0 && (
              <Button
                type="link"
                size="small"
                onClick={() => markAllRead()}
                style={{ padding: 0, fontSize: 12 }}
              >
                Mark all read
              </Button>
            )}
          </div>
          <Divider style={{ margin: 0 }} />

          {visibleNotifications.length === 0 ? (
            <Empty
              image={
                <span style={{ fontSize: 40 }}>
                  {"\uD83D\uDD14"}
                </span>
              }
              description={
                <div>
                  <Text type="secondary">No notifications yet</Text>
                  <br />
                  <Text
                    type="secondary"
                    style={{ fontSize: 12 }}
                  >
                    You&apos;ll see updates here when tasks require your
                    attention
                  </Text>
                </div>
              }
              style={{ padding: "24px 16px" }}
            />
          ) : (
            <div>
              {visibleNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 16px",
                    cursor: "pointer",
                    background: "transparent",
                    transition: "background 0.2s",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f0f5ff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {/* Icon */}
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                    {TASK_TYPE_ICONS[n.taskType] || "\uD83D\uDD14"}
                  </span>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {!n.read && (
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#faad14",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Text
                        style={{
                          fontWeight: n.read ? 400 : 600,
                          color: n.read ? "#8c8c8c" : "inherit",
                          fontSize: 13,
                        }}
                        ellipsis
                      >
                        {n.message}
                      </Text>
                    </div>
                    <Text
                      type="secondary"
                      style={{ fontSize: 12 }}
                    >
                      {formatTimeAgo(n.timestamp)}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
