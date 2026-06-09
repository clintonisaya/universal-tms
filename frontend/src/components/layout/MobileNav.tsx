"use client";

import { useState } from "react";
import { Drawer, Menu } from "antd";
import type { MenuProps } from "antd";
import { MenuOutlined, CloseOutlined } from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  /** Menu items to display */
  items: MenuProps["items"];
  /** Currently selected keys */
  selectedKeys?: string[];
  /** Default open keys */
  defaultOpenKeys?: string[];
  /** Additional Tailwind classes */
  className?: string;
}

/**
 * Mobile-first navigation component.
 * Shows a hamburger menu on small screens that opens a drawer with navigation.
 */
export function MobileNav({
  items,
  selectedKeys = [],
  defaultOpenKeys = [],
  className,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key.startsWith("/")) {
      router.push(key);
      setOpen(false);
    }
  };

  return (
    <div className={cn("lg:hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg",
          "bg-[var(--color-surface)] border border-[var(--color-border)]",
          "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
          "transition-colors"
        )}
      >
        <MenuOutlined className="text-lg" />
      </button>

      <Drawer
        title="Navigation"
        placement="left"
        onClose={() => setOpen(false)}
        open={open}
        width={280}
        styles={{
          body: { padding: 0 },
          header: {
            background: "var(--color-card)",
            borderBottom: "1px solid var(--color-border)",
          },
        }}
        closeIcon={<CloseOutlined />}
      >
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={defaultOpenKeys}
          items={items}
          onClick={handleMenuClick}
          style={{
            border: "none",
            background: "transparent",
          }}
        />
      </Drawer>
    </div>
  );
}

export default MobileNav;
