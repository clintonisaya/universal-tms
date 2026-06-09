"use client";

import {
  LogoutOutlined,
  SkinOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar } from "antd";
import type { MenuProps } from "antd";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { clearNotifications } from "@/hooks/application/useNotifications";
import HeaderDropdown from "@/components/HeaderDropdown";

type AvatarDropdownProps = {
  children?: React.ReactNode;
  onThemeSettingsClick?: () => void;
};

/**
 * AvatarDropdown for ProLayout header.
 * Reference: ant-design-pro/src/components/RightContent/AvatarDropdown.tsx
 *
 * Includes:
 * - Profile link
 * - Theme settings (opens SettingDrawer)
 * - Logout
 */
export const AvatarDropdown: React.FC<AvatarDropdownProps> = ({
  children,
  onThemeSettingsClick,
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    if (user?.id) clearNotifications(user.id);
    await logout();
    router.push("/login");
  };

  const onMenuClick: MenuProps["onClick"] = (event) => {
    const { key } = event;
    if (key === "logout") {
      handleLogout();
      return;
    }
    if (key === "theme") {
      onThemeSettingsClick?.();
      return;
    }
    if (key === "profile") {
      // Navigate to profile page if it exists
      return;
    }
  };

  const menuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      key: "theme",
      icon: <SkinOutlined />,
      label: "Theme Settings",
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      danger: true,
    },
  ];

  const userInitial = (user?.full_name || user?.username || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <HeaderDropdown
      placement="bottomRight"
      menu={{
        selectedKeys: [],
        onClick: onMenuClick,
        items: menuItems,
      }}
      arrow
    >
      {children || (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            padding: "0 8px",
          }}
        >
          <Avatar
            size="small"
            style={{
              backgroundColor: "#1677ff",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            {userInitial}
          </Avatar>
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {user?.full_name || user?.username || "User"}
          </span>
        </div>
      )}
    </HeaderDropdown>
  );
};

export default AvatarDropdown;
