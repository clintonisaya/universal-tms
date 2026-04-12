"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { message } from "antd";
import { resolveSection, SECTION_MAP } from "@/constants/navigation";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TabItem {
  key: string;       // stable section identifier (e.g. "fleet-trucks")
  label: string;     // display name (e.g. "Trucks")
  path: string;      // section root path (e.g. "/fleet/trucks")
  lastPath: string;  // where user last was within this section
  closable: boolean; // false for Dashboard
}

interface TabContextType {
  tabs: TabItem[];
  activeKey: string;
  /** Open or switch to the tab for the given pathname. Creates a new tab if needed. */
  openTab: (pathname: string) => void;
  /** Close a tab. Activates nearest neighbor. */
  closeTab: (key: string) => void;
  /** Switch to an existing tab by key. */
  switchTab: (key: string) => void;
  /** Update the lastPath for the currently active tab (call on navigation). */
  updateActivePath: (pathname: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

// ── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "nablafleet-tabs";
const MAX_TABS = 7;

const DASHBOARD_TAB: TabItem = {
  key: "dashboard",
  label: "Dashboard",
  path: "/dashboard",
  lastPath: "/dashboard",
  closable: false,
};

// ── Helper: load/save from sessionStorage ──────────────────────────────────────

function loadTabs(): TabItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // Validate shape
    return parsed.every((t: any) => t.key && t.label && t.path && t.lastPath)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function saveTabs(tabs: TabItem[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function TabProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [tabs, setTabs] = useState<TabItem[]>([DASHBOARD_TAB]);
  const [activeKey, setActiveKey] = useState<string>("dashboard");
  const initialized = useRef(false);

  // Restore tabs from sessionStorage on mount (hydration-safe)
  useEffect(() => {
    const saved = loadTabs();
    if (saved) {
      setTabs(saved);
      // Find active tab for current pathname
      const section = resolveSection(pathname);
      if (section) {
        const existing = saved.find((t) => t.key === section.key);
        if (existing) {
          setActiveKey(existing.key);
        } else {
          setActiveKey(section.key);
        }
      } else {
        setActiveKey(saved[0]?.key ?? "dashboard");
      }
    }
    initialized.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist tabs to sessionStorage whenever they change
  useEffect(() => {
    if (initialized.current) {
      saveTabs(tabs);
    }
  }, [tabs]);

  // Sync active tab when pathname changes (browser back/forward)
  useEffect(() => {
    const section = resolveSection(pathname);
    if (!section) return;

    setTabs((prev) => {
      const existing = prev.find((t) => t.key === section.key);
      if (existing) {
        // Update lastPath for the active tab
        return prev.map((t) =>
          t.key === section.key ? { ...t, lastPath: pathname } : t
        );
      }
      // Auto-create tab for direct URL navigation
      return [
        ...prev,
        { key: section.key, label: section.label, path: section.path, lastPath: pathname, closable: true },
      ];
    });
    setActiveKey(section.key);
  }, [pathname]);

  const openTab = useCallback(
    (path: string) => {
      const section = resolveSection(path);
      if (!section) {
        router.push(path);
        return;
      }

      setTabs((prev) => {
        const existing = prev.find((t) => t.key === section.key);
        if (existing) {
          // Switch to existing tab, update lastPath
          return prev.map((t) =>
            t.key === section.key ? { ...t, lastPath: path } : t
          );
        }

        // Check max tabs
        if (prev.length >= MAX_TABS) {
          message.warning("Close a tab first (max 7 tabs)");
          return prev;
        }

        // Create new tab
        return [
          ...prev,
          {
            key: section.key,
            label: section.label,
            path: section.path,
            lastPath: path,
            closable: true,
          },
        ];
      });

      setActiveKey(section.key);
      router.push(path);
    },
    [router]
  );

  const switchTab = useCallback(
    (key: string) => {
      setTabs((prev) => {
        const tab = prev.find((t) => t.key === key);
        if (tab) {
          router.push(tab.lastPath);
        }
        return prev;
      });
      setActiveKey(key);
    },
    [router]
  );

  const closeTab = useCallback(
    (key: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.key === key);
        if (idx === -1) return prev;
        if (!prev[idx].closable) return prev;

        const newTabs = prev.filter((_, i) => i !== idx);

        // Determine which tab to activate next
        let nextIdx = idx;
        if (nextIdx >= newTabs.length) nextIdx = newTabs.length - 1;
        const nextTab = newTabs[nextIdx];
        setActiveKey(nextTab.key);
        router.push(nextTab.lastPath);

        return newTabs;
      });
    },
    [router]
  );

  const updateActivePath = useCallback((path: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.key === activeKey ? { ...t, lastPath: path } : t))
    );
  }, [activeKey]);

  return (
    <TabContext.Provider
      value={{ tabs, activeKey, openTab, closeTab, switchTab, updateActivePath }}
    >
      {children}
    </TabContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useTabs() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("useTabs must be used within a TabProvider");
  }
  return context;
}
