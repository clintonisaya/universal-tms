"use client";

import { useEffect } from "react";
import { SettingDrawer as AntSettingDrawer } from "@ant-design/pro-components";
import type { Settings as LayoutSettings } from "@ant-design/pro-components";

const STORAGE_KEY = "nablafleet-settings";

function loadSettings(): Partial<LayoutSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveSettings(settings: Partial<LayoutSettings>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable
  }
}

interface SettingDrawerWrapperProps {
  settings: Partial<LayoutSettings>;
  onSettingsChange: (settings: Partial<LayoutSettings>) => void;
  collapse: boolean;
  onCollapseChange: (collapse: boolean) => void;
}

/**
 * SettingDrawer wrapper for theme customization.
 * Reference: ant-design-pro/src/app.tsx childrenRender
 *
 * Provides a slide-out panel for:
 * - Color Primary (brand color)
 * - Nav Mode (Side / Mix / Top)
 * - Content Width (Fixed / Fluid)
 * - Fixed Header toggle
 * - Fix Sidebar toggle
 * - Color Weak (accessibility)
 * - Dark Theme toggle
 */
export function SettingDrawer({
  settings,
  onSettingsChange,
  collapse,
  onCollapseChange,
}: SettingDrawerWrapperProps) {
  // Suppress antd v6 deprecation warning for List used internally by pro-components SettingDrawer.
  // Remove once @ant-design/pro-components drops its List dependency.
  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("[antd: List]") &&
        args[0].includes("deprecated")
      ) {
        return;
      }
      originalWarn(...args);
    };
    return () => {
      console.warn = originalWarn;
    };
  }, []);

  return (
    <AntSettingDrawer
      disableUrlParams
      enableDarkTheme
      collapse={collapse}
      onCollapseChange={onCollapseChange}
      settings={settings}
      onSettingChange={(newSettings) => {
        onSettingsChange(newSettings);
        saveSettings(newSettings);
      }}
    />
  );
}

export { loadSettings, saveSettings };
export type { LayoutSettings };
export default SettingDrawer;
