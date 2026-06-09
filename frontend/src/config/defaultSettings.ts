// frontend/src/config/defaultSettings.ts
import type { ProLayoutProps } from "@ant-design/pro-components";

/**
 * Default ProLayout settings.
 * Reference: ant-design-pro/config/defaultSettings.ts
 *
 * These settings are passed to ProLayout and can be overridden by SettingDrawer.
 * Default theme is LIGHT mode (not dark).
 */
const defaultSettings: ProLayoutProps & {
  logo?: string;
} = {
  navTheme: "light",
  colorPrimary: "#1677ff",
  layout: "mix",
  contentWidth: "Fluid",
  fixedHeader: true,
  fixSiderbar: true,
  colorWeak: false,
  title: "Nablafleet",
  logo: undefined,
  token: {
    // Custom tokens for Nablafleet branding
    header: {
      colorBgHeader: "rgba(255,255,255,0.75)",
      heightLayoutHeader: 64,
    },
    sider: {
      colorMenuBackground: "#ffffff",
      colorTextMenu: "#71717A",
      colorTextMenuSelected: "#1677ff",
      colorBgMenuItemSelected: "rgba(22,119,255,0.08)",
    },
  },
};

export default defaultSettings;
