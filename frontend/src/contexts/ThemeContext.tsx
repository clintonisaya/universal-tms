"use client";

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { ConfigProvider, App } from "antd";
import { getThemeConfig } from "@/theme/themeConfig";

type ThemeMode = "dark" | "light";

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  // P10: warn when toggle is called outside ThemeProvider
  toggle: () => {
    console.warn("useThemeMode: called outside ThemeProvider — toggle will have no effect");
  },
});

export function useThemeMode() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // P1: Initialize from localStorage immediately to avoid FOUC on returning users
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const saved = localStorage.getItem("edupo-theme") as ThemeMode | null;
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // localStorage unavailable (privacy mode, sandboxed iframe) — use default
    }
    return "dark";
  });

  // Apply data-theme attribute to <html> and persist to localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem("edupo-theme", mode);
    } catch {
      // localStorage unavailable — theme not persisted
    }
  }, [mode]);

  const toggle = () => setMode((m: ThemeMode) => (m === "dark" ? "light" : "dark"));

  const themeConfig = useMemo(() => getThemeConfig(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      <ConfigProvider theme={themeConfig}>
        <App>
          {children}
        </App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
