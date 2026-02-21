import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

const themeConfig: ThemeConfig = {
    token: {
        // Typography - Standardizing on 13px as requested
        fontSize: 13,
        fontSizeHeading1: 26,
        fontSizeHeading2: 22,
        fontSizeHeading3: 18,
        fontSizeHeading4: 15,
        fontSizeHeading5: 14, // Slightly larger for emphasis

        // Brand Colors
        colorPrimary: '#B8961F', // Brand Gold (WCAG AA-compliant — contrast ratio ~4.5:1 on white)
        colorInfo: '#B8961F',

        // Neutralizing Text for better readability
        colorTextBase: '#262626', // Slightly softer black
        colorTextSecondary: '#595959',

        // Modernizing Structure
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        borderRadius: 6, // 6px is a sweet spot between "boxy" (4px) and "round" (8px)

        // Spacing - controlling density
        controlHeight: 34, // Slightly taller than default compact (24/32) for better touch/click targets
    },
    components: {
        Layout: {
            headerBg: '#ffffff',
            bodyBg: '#f8f9fa', // Cleaner, brighter background
            siderBg: '#1F1F1F',
        },
        Table: {
            headerBg: '#ffffff', // Clean white headers
            headerColor: '#8c8c8c', // Muted headers to let data stand out
            headerSplitColor: '#f0f0f0',
            rowHoverBg: '#FFFDF5', // Subtle gold tint on hover
            cellPaddingBlock: 8, // Maintaining density
            cellPaddingInline: 12,
            borderColor: '#f0f0f0',
        },
        Card: {
            headerFontSize: 14,

            borderRadiusLG: 8, // Slightly softer cards
        },
        Button: {
            primaryShadow: '0 2px 0 rgba(0, 0, 0, 0.045)',
            algorithm: true,
            fontWeight: 500,
            contentFontSize: 13,
        },
        Input: {
            activeBorderColor: '#B8961F',
            hoverBorderColor: '#D4AF37',
        },
        Select: {
            colorPrimary: '#B8961F',
        },
        Typography: {
            fontFamilyCode: '"Fira Code", monospace',
        },
        Modal: {
            headerBg: '#ffffff',
            titleFontSize: 16,
        },
        Tag: {
            borderRadiusSM: 4,
        }
    },
    // Keeping compact algorithm for data density, but our token overrides will refine it
    algorithm: theme.compactAlgorithm,
};

export default themeConfig;
