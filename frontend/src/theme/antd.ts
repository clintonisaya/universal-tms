// frontend/src/theme/antd.ts
import type { ThemeConfig } from "antd";
import { theme } from "antd";

/**
 * Ant Design theme configuration.
 * Reference: ant-design-pro uses antd-style for component-level styling.
 *
 * This file provides the base theme config for ConfigProvider.
 * Component-level styles use createStyles from antd-style.
 *
 * Default is LIGHT mode. Dark mode uses darkAlgorithm.
 */
export function getAntdThemeConfig(mode: "dark" | "light"): ThemeConfig {
  const isDark = mode === "dark";

  return {
    algorithm: isDark
      ? [theme.darkAlgorithm, theme.compactAlgorithm]
      : theme.compactAlgorithm,
    token: {
      // Brand color — Ant Design blue
      colorPrimary: "#1677ff",
      colorInfo: "#1677ff",

      // Base colors
      colorTextBase: isDark ? "#ffffff" : "#000000",
      colorBgBase: isDark ? "#000000" : "#ffffff",

      // Container & border tokens
      colorBgContainer: isDark ? "#141414" : "#ffffff",
      colorBgLayout: isDark ? "#000000" : "#f5f5f5",
      colorBgElevated: isDark ? "#1f1f1f" : "#ffffff",
      colorBorder: isDark ? "#424242" : "#d9d9d9",
      colorText: isDark ? "#ffffff" : "#000000",
      colorTextSecondary: isDark ? "#a6a6a6" : "#8c8c8c",
      colorTextTertiary: isDark ? "#737373" : "#bfbfbf",
      colorTextPlaceholder: isDark ? "#737373" : "#bfbfbf",

      // Font
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      fontSize: 14,
      fontSizeHeading1: 26,
      fontSizeHeading2: 20,
      fontSizeHeading3: 18,
      fontSizeHeading4: 16,

      // Spacing & shape
      borderRadius: 6,
      controlHeight: 34,
    },
    components: {
      Layout: {
        headerBg: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.75)",
        bodyBg: isDark ? "#000000" : "#f5f5f5",
        siderBg: isDark ? "#141414" : "#ffffff",
      },
      Table: {
        headerBg: "transparent",
        headerColor: isDark ? "#a6a6a6" : "#8c8c8c",
        headerSplitColor: isDark ? "#424242" : "#d9d9d9",
        rowHoverBg: isDark ? "#1f1f1f" : "#fafafa",
        borderColor: isDark ? "#424242" : "#d9d9d9",
        cellPaddingBlock: 12,
        cellPaddingInline: 16,
        cellFontSize: 14,
      },
      Card: {
        headerFontSize: 14,
        borderRadiusLG: 8,
      },
      Button: {
        primaryShadow: "0 2px 0 rgba(0,0,0,0.02)",
        fontWeight: 600,
        borderRadius: 6,
      },
      Menu: {
        itemBg: "transparent",
        subMenuItemBg: "transparent",
        itemSelectedBg: isDark ? "rgba(22,119,255,0.15)" : "rgba(22,119,255,0.08)",
        itemSelectedColor: "#1677ff",
        itemColor: isDark ? "#a6a6a6" : "#8c8c8c",
        itemHoverColor: "#1677ff",
        itemBorderRadius: 8,
        itemMarginInline: 8,
        itemPaddingInline: 16,
        itemHeight: 40,
        iconSize: 16,
        fontSize: 14,
      },
      Modal: {
        headerBg: isDark ? "#141414" : "#ffffff",
        contentBg: isDark ? "#141414" : "#ffffff",
        titleFontSize: 16,
      },
      Drawer: {
        colorBgElevated: isDark ? "#141414" : "#ffffff",
      },
      Tag: {
        borderRadiusSM: 4,
      },
    },
  };
}
