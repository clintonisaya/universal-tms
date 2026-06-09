import type { ThemeConfig } from "antd";
import { theme } from "antd";

/**
 * Ant Design theme configuration.
 * Primary color: #8B5CF6 (purple)
 * Text secondary: #6B7280 (gray-500)
 */
export function getThemeConfig(mode: "dark" | "light"): ThemeConfig {
  const isDark = mode === "dark";
  return {
    algorithm: isDark
      ? [theme.darkAlgorithm, theme.compactAlgorithm]
      : theme.compactAlgorithm,
    token: {
      // Typography
      fontSize: 14,
      fontSizeHeading1: 26,
      fontSizeHeading2: 20,
      fontSizeHeading3: 18,
      fontSizeHeading4: 16,
      fontSizeHeading5: 14,

      // Brand Colors — Purple
      colorPrimary: "#8B5CF6",
      colorInfo: "#8B5CF6",
      colorLink: "#8B5CF6",
      colorSuccess: "#059669",
      colorWarning: "#D97706",
      colorError: "#E02424",

      // Base colors
      colorTextBase: isDark ? "#FAFAFA" : "#09090B",
      colorBgBase: isDark ? "#000000" : "#F4F5F8",

      // Container & border tokens
      colorBgContainer: isDark ? "#09090B" : "#FFFFFF",
      colorBorder: isDark ? "#27272A" : "#E4E4E7",
      colorText: isDark ? "#FAFAFA" : "#09090B",
      colorTextSecondary: "#6B7280",
      colorTextTertiary: isDark ? "#71717A" : "#A1A1AA",

      // Font
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      borderRadius: 6,

      // Spacing
      controlHeight: 34,

      // Placeholder
      colorTextPlaceholder: isDark ? "#71717A" : "#A1A1AA",
    },
    components: {
      Layout: {
        headerBg: isDark ? "rgba(0,0,0,0.6)" : "rgba(244,245,248,0.75)",
        bodyBg: isDark ? "#000000" : "#F4F5F8",
        siderBg: isDark ? "#09090B" : "#FFFFFF",
      },
      Table: {
        headerBg: "transparent",
        headerColor: isDark ? "#71717A" : "#A1A1AA",
        headerSplitColor: isDark ? "#27272A" : "#E4E4E7",
        rowHoverBg: isDark ? "#18181B" : "#FAFAFA",
        borderColor: isDark ? "#27272A" : "#E4E4E7",
        headerSortActiveBg: "transparent",
        headerFilterHoverBg: isDark ? "#18181B" : "#F4F5F8",
        cellPaddingBlock: 12,
        cellPaddingInline: 16,
        headerBorderRadius: 0,
        cellFontSize: 14,
      },
      Card: {
        headerFontSize: 14,
        borderRadiusLG: 8,
      },
      Button: {
        primaryShadow: "0 2px 12px rgba(139,92,246,0.25)",
        fontWeight: 600,
        contentFontSize: 12,
        borderRadius: 8,
        paddingInline: 16,
        paddingBlock: 8,
        primaryColor: isDark ? "#FFFFFF" : "#FFFFFF",
        defaultBg: isDark ? "#18181B" : "#FFFFFF",
        defaultBorderColor: isDark ? "#27272A" : "#E4E4E7",
        defaultColor: isDark ? "#A1A1AA" : "#71717A",
      },
      Input: {
        activeBorderColor: "#8B5CF6",
        hoverBorderColor: "#8B5CF6",
        activeBg: isDark
          ? "rgba(139,92,246,0.06)"
          : "rgba(139,92,246,0.04)",
        addonBg: isDark ? "#18181B" : "#F4F5F8",
      },
      Select: {
        colorPrimary: "#8B5CF6",
      },
      Typography: {
        fontFamilyCode: '"Fira Code", monospace',
      },
      Modal: {
        headerBg: isDark ? "#09090B" : "#ffffff",
        contentBg: isDark ? "#09090B" : "#ffffff",
        titleFontSize: 16,
      },
      Drawer: {
        colorBgElevated: isDark ? "#09090B" : "#FFFFFF",
      },
      Tag: {
        borderRadiusSM: 4,
      },
      Menu: {
        itemBg: "transparent",
        subMenuItemBg: "transparent",
        itemSelectedBg: isDark
          ? "rgba(139,92,246,0.15)"
          : "rgba(139,92,246,0.08)",
        itemSelectedColor: "#8B5CF6",
        itemColor: isDark ? "#A1A1AA" : "#71717A",
        itemHoverColor: "#8B5CF6",
        itemBorderRadius: 10,
        itemMarginInline: 8,
        itemPaddingInline: 16,
        itemHeight: 38,
        iconSize: 18,
        fontSize: 14,
        ...(isDark
          ? {
              darkItemBg: "transparent",
              darkSubMenuItemBg: "transparent",
              darkItemSelectedBg: "rgba(139,92,246,0.15)",
              darkItemSelectedColor: "#8B5CF6",
            }
          : {}),
      },
    },
  };
}
