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
      fontSize: 14,
      fontSizeHeading1: 26,
      fontSizeHeading2: 20,
      fontSizeHeading3: 18,
      fontSizeHeading4: 16,
      fontSizeHeading5: 14,

      // Brand Colors
      colorPrimary: isDark ? '#D4A843' : '#B8922E',
      colorInfo:    isDark ? '#D4A843' : '#B8922E',

      // Base colors drive Ant Design's dark/light algorithm
      colorTextBase: isDark ? '#E8E4DC' : '#1A1C20',
      colorBgBase:   isDark ? '#0C0E12' : '#F4F2EE',

      // Container & border tokens — align Ant defaults with design system
      colorBgContainer: isDark ? '#13161C' : '#FFFFFF',
      colorBorder:      isDark ? '#252A35' : '#E2DDD4',
      colorText:        isDark ? '#E8E4DC' : '#1A1C20',
      colorTextSecondary: isDark ? '#8A8F9C' : '#6B6E76',
      colorTextTertiary:  isDark ? '#5A5F6C' : '#9A9DA6',

      // Font
      fontFamily: "'DM Sans', var(--font-dm-sans), 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      borderRadius: 6,

      // Spacing
      controlHeight: 34,

      // Placeholder — global alias token (applies to all inputs)
      colorTextPlaceholder: isDark ? '#5A5F6C' : '#9A9DA6',
    },
    components: {
      Layout: {
        headerBg: isDark ? 'rgba(12,14,18,0.6)' : 'rgba(244,242,238,0.75)',
        bodyBg:   isDark ? '#0C0E12'            : '#F4F2EE',
        siderBg:  isDark ? '#13161C'            : '#FFFFFF',
      },
      Table: {
        headerBg:           'transparent',
        headerColor:        isDark ? '#5A5F6C'  : '#9A9DA6',
        headerSplitColor:   isDark ? '#252A35'  : '#E2DDD4',
        rowHoverBg:         isDark ? '#191D25'  : '#FAF8F4',
        borderColor:        isDark ? '#252A35'  : '#E2DDD4',
        headerSortActiveBg: 'transparent',
        headerFilterHoverBg: isDark ? '#191D25' : '#F0EDE8',
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
        primaryShadow: '0 2px 12px rgba(212,168,67,0.25)',
        fontWeight: 600,
        contentFontSize: 12,
        borderRadius: 8,
        paddingInline: 16,
        paddingBlock: 8,
        primaryColor:      isDark ? '#0C0E12' : '#FFFFFF',
        defaultBg:         isDark ? '#191D25' : '#F0EDE8',
        defaultBorderColor: isDark ? '#252A35' : '#E2DDD4',
        defaultColor:      isDark ? '#8A8F9C' : '#6B6E76',
      },
      Input: {
        activeBorderColor: isDark ? '#B8922E' : '#9A7A20',
        hoverBorderColor:  isDark ? '#B8922E' : '#9A7A20',
        activeBg:          isDark ? 'rgba(212,168,67,0.06)' : 'rgba(184,146,46,0.06)',
        addonBg:           isDark ? '#191D25' : '#F0EDE8',
      },
      Select: {
        colorPrimary: isDark ? '#D4A843' : '#B8922E',
      },
      Typography: {
        fontFamilyCode: '"Fira Code", monospace',
      },
      Modal: {
        headerBg:      isDark ? '#13161C' : '#ffffff',
        contentBg:     isDark ? '#13161C' : '#ffffff',
        titleFontSize: 16,
      },
      Drawer: {
        colorBgElevated: isDark ? '#13161C' : '#FFFFFF',
      },
      Tag: {
        borderRadiusSM: 4,
      },
      Menu: {
        itemBg:            'transparent',
        subMenuItemBg:     'transparent',
        itemSelectedBg:    isDark ? 'rgba(212,168,67,0.15)' : 'rgba(184,146,46,0.10)',
        itemSelectedColor: isDark ? '#D4A843' : '#B8922E',
        itemColor:         isDark ? '#8A8F9C' : '#6B6E76',
        itemHoverColor:    isDark ? '#D4A843' : '#B8922E',
        itemBorderRadius:  10,
        itemMarginInline:  8,
        itemPaddingInline: 16,
        itemHeight:        38,
        iconSize:          18,
        fontSize:          14,
        ...(isDark ? {
          darkItemBg:            'transparent',
          darkSubMenuItemBg:     'transparent',
          darkItemSelectedBg:    'rgba(212,168,67,0.15)',
          darkItemSelectedColor: '#D4A843',
        } : {}),
      },
    },
  };
}

