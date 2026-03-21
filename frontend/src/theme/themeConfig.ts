import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

export function getThemeConfig(mode: "dark" | "light"): ThemeConfig {
  const isDark = mode === "dark";
  return {
    algorithm: isDark
      ? [theme.darkAlgorithm, theme.compactAlgorithm]
      : theme.compactAlgorithm,
    token: {
      // Typography
      fontSize: 13,
      fontSizeHeading1: 26,
      fontSizeHeading2: 22,
      fontSizeHeading3: 18,
      fontSizeHeading4: 15,
      fontSizeHeading5: 14,

      // Brand Colors — from edupo-redesign.jsx THEMES
      colorPrimary: isDark ? '#D4A843' : '#B8922E',
      colorInfo:    isDark ? '#D4A843' : '#B8922E',

      // Base colors drive Ant Design's dark/light algorithm
      colorTextBase: isDark ? '#E8E4DC' : '#1A1C20',
      colorBgBase:   isDark ? '#0C0E12' : '#F4F2EE',

      // Font
      fontFamily: '"DM Sans", var(--font-dm-sans), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      borderRadius: 6,

      // Spacing
      controlHeight: 34,
    },
    components: {
      Layout: {
        headerBg: isDark ? 'rgba(12,14,18,0.6)' : 'rgba(244,242,238,0.75)',
        bodyBg:   isDark ? '#0C0E12'            : '#F4F2EE',
        siderBg:  isDark ? '#13161C'            : '#FFFFFF',
      },
      Table: {
        headerBg:             isDark ? '#13161C'  : '#FFFFFF',
        headerColor:          isDark ? '#5A5F6C'  : '#9A9DA6',
        headerSplitColor:     isDark ? '#252A35'  : '#E2DDD4',
        rowHoverBg:           isDark ? '#191D25'  : '#FAF8F4',
        borderColor:          isDark ? '#252A35'  : '#E2DDD4',
        headerSortActiveBg:   isDark ? '#13161C'  : '#FFFFFF',
        headerFilterHoverBg:  isDark ? '#191D25'  : '#F0EDE8',
        cellPaddingBlock: 8,
        cellPaddingInline: 16,
      },
      Card: {
        headerFontSize: 14,
        borderRadiusLG: 8,
      },
      Button: {
        primaryShadow: '0 2px 12px rgba(212,168,67,0.25)',
        fontWeight: 600,
        contentFontSize: 12,
        borderRadius: 8,
        paddingInline: 16,
        paddingBlock: 8,
      },
      Input: {
        activeBorderColor: isDark ? '#D4A843' : '#B8922E',
        hoverBorderColor:  isDark ? '#B8922E' : '#9A7A20',
      },
      Select: {
        colorPrimary: isDark ? '#D4A843' : '#B8922E',
      },
      Typography: {
        fontFamilyCode: '"Fira Code", monospace',
      },
      Modal: {
        headerBg:      isDark ? '#13161C' : '#ffffff',
        titleFontSize: 16,
      },
      Tag: {
        borderRadiusSM: 4,
      },
      Menu: {
        ...(isDark ? {
          darkItemBg:           '#13161C',
          darkSubMenuItemBg:    '#0C0E12',
          darkItemSelectedBg:   'rgba(212,168,67,0.15)',
          darkItemSelectedColor: '#D4A843',
        } : {
          itemBg:               '#FFFFFF',
          subMenuItemBg:        '#F4F2EE',
          itemSelectedBg:       'rgba(184,146,46,0.12)',
          itemSelectedColor:    '#B8922E',
        }),
        itemBorderRadius:    10,
        itemMarginInline:    8,
        itemPaddingInline:   14,
        itemPaddingBlock:    10,
      },
    },
  };
}

