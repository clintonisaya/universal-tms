import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

const themeConfig: ThemeConfig = {
    token: {
        fontSize: 12, // High density base size
        colorPrimary: '#D4AF37', // Royal Gold
        colorInfo: '#D4AF37',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        borderRadius: 4, // Professional, sharper corners
        colorTextBase: '#1F1F1F', // Charcoal for text
    },
    components: {
        Layout: {
            headerBg: '#ffffff',
            bodyBg: '#f5f7fa', // Soft gray enterprise background
            siderBg: '#1F1F1F', // Deep Charcoal sidebar
        },
        Table: {
            headerBg: '#fafafa',
            headerColor: '#595959',
            rowHoverBg: '#FFFDF5', // Very subtle gold tint on hover
            borderColor: '#e8e8e8',
        },
        Card: {
            headerFontSize: 14,
        },
        Button: {
            primaryShadow: '0 2px 0 rgba(0, 0, 0, 0.045)',
            algorithm: true, // Generate proper shades
        },
        Typography: {
            fontFamilyCode: '"Fira Code", monospace',
        }
    },
    algorithm: theme.compactAlgorithm,
};

export default themeConfig;
