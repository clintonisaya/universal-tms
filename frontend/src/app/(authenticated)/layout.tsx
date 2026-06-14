"use client";

import { useState, useEffect, useRef } from "react";
import type { Settings as LayoutSettings } from "@ant-design/pro-components";
import {
  ProConfigProvider,
  enUSIntl,
} from "@ant-design/pro-components";
import dynamic from "next/dynamic";
import { ConfigProvider, App } from "antd";
import enUS from "antd/locale/en_US";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/application/usePermissions";
import { useTabs } from "@/contexts/TabContext";
import { SocketProvider } from "@/lib/socket";
import { SessionExpiredModal } from "@/components/auth/SessionExpiredModal";
import { AvatarDropdown } from "@/components/RightContent/AvatarDropdown";
import { SettingDrawer, loadSettings } from "@/components/SettingDrawer";
import { ToDoWidget } from "@/components/dashboard/ToDoWidget";
import { useTodoCount } from "@/hooks/application/useApi";
import { getAntdThemeConfig } from "@/theme/antd";
import defaultSettings from "@/config/defaultSettings";
import routes from "@/config/routes";

// ProLayout accesses window.matchMedia during SSR — import client-only
const ProLayout = dynamic(
  () => import("@ant-design/pro-components").then((mod) => ({ default: mod.ProLayout })),
  { ssr: false },
);

/** Filter route tree by user permissions. */
function filterRoutesByPermission(
  items: any[],
  hasAnyPermission: (...perms: string[]) => boolean,
): any[] {
  return items
    .map((item) => {
      if (item.access && !hasAnyPermission(item.access)) {
        return null;
      }
      if (item.children) {
        const filteredChildren = filterRoutesByPermission(
          item.children,
          hasAnyPermission,
        );
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      return item;
    })
    .filter(Boolean);
}

const WAS_AUTHENTICATED_KEY = "nablafleet_was_authenticated";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const { tabs, activeKey, openTab, closeTab, switchTab } = useTabs();
  const { data: todoData } = useTodoCount(!!user);

  // Settings — merged from localStorage + defaults
  const [settings, setSettings] = useState<Partial<LayoutSettings>>(() => ({
    navTheme: defaultSettings.navTheme,
    colorPrimary: defaultSettings.colorPrimary,
    layout: defaultSettings.layout,
    contentWidth: defaultSettings.contentWidth,
    fixedHeader: defaultSettings.fixedHeader,
    fixSiderbar: defaultSettings.fixSiderbar,
    colorWeak: defaultSettings.colorWeak,
    ...loadSettings(),
  }));
  const [settingDrawerOpen, setSettingDrawerOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasCheckedAuth = useRef(false);

  const todoCount = todoData?.count ?? 0;
  const isDark = settings.navTheme === "realDark";
  const themeConfig = getAntdThemeConfig(isDark ? "dark" : "light");

  // Track when user becomes authenticated
  useEffect(() => {
    if (user && typeof window !== "undefined") {
      sessionStorage.setItem(WAS_AUTHENTICATED_KEY, "true");
    }
  }, [user]);

  // Apply theme attribute to <html>
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light",
    );
  }, [isDark]);

  // Close session modal when a valid user is authenticated.
  useEffect(() => {
    if (user) {
      setShowLoginModal(false);
      setIsRedirecting(false);
    }
  }, [user]);

  // Handle auth redirect
  useEffect(() => {
    if (loading || hasCheckedAuth.current) return;

    hasCheckedAuth.current = true;

    if (!user) {
      const wasAuthenticated =
        typeof window !== "undefined" &&
        sessionStorage.getItem(WAS_AUTHENTICATED_KEY) === "true";
      if (wasAuthenticated) {
        setShowLoginModal(true);
      } else {
        setIsRedirecting(true);
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  // Listen for session expiry
  useEffect(() => {
    const handleSessionExpiry = () => setShowLoginModal(true);
    window.addEventListener("session-expired", handleSessionExpiry);
    return () =>
      window.removeEventListener("session-expired", handleSessionExpiry);
  }, []);

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    window.location.reload();
  };

  // Filter routes by permission
  const filteredRoutes = filterRoutesByPermission(routes, hasAnyPermission);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Redirecting to login...
      </div>
    );
  }

  if (showLoginModal && !user) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <SessionExpiredModal
          open={showLoginModal}
          onSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <ConfigProvider theme={themeConfig} locale={enUS}>
      <ProConfigProvider intl={enUSIntl}>
        <App>
          <SocketProvider>
            <ProLayout
              title={defaultSettings.title}
              logo={defaultSettings.logo}
              layout={settings.layout || defaultSettings.layout}
              navTheme={isDark ? "realDark" : "light"}
              contentWidth={settings.contentWidth || defaultSettings.contentWidth}
              fixedHeader={settings.fixedHeader ?? defaultSettings.fixedHeader}
              fixSiderbar={settings.fixSiderbar ?? defaultSettings.fixSiderbar}
              colorPrimary={settings.colorPrimary || defaultSettings.colorPrimary}
              colorWeak={settings.colorWeak ?? defaultSettings.colorWeak}
              route={{ routes: filteredRoutes }}
              location={{ pathname }}
              token={defaultSettings.token}
              menuProps={{ tooltip: undefined } as any}
              menuItemRender={(item, dom) => (
                <div
                  onClick={() => {
                    if (item.path) {
                      openTab(item.path);
                    }
                  }}
                >
                  {dom}
                </div>
              )}
              actionsRender={() => [
                <ToDoWidget
                  key="todo"
                  count={todoCount}
                  loading={false}
                  onClick={() => router.push("/dashboard/tasks")}
                />,
                <AvatarDropdown
                  key="avatar"
                  onThemeSettingsClick={() => setSettingDrawerOpen(true)}
                />,
              ]}
            >
              {/* Tab bar */}
              {tabs.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0,
                    height: 16,
                    overflowX: "auto",
                    borderBottom: "1px solid var(--ant-color-border)",
                    marginBottom: 8,
                    scrollbarWidth: "none",
                  }}
                >
                  {tabs.map((tab) => {
                    const isActive = tab.key === activeKey;
                    return (
                      <div
                        key={tab.key}
                        onClick={() => switchTab(tab.key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "0 16px",
                          height: "100%",
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: isActive ? 700 : 400,
                          color: isActive
                            ? "var(--ant-color-text)"
                            : "var(--ant-color-text-secondary)",
                          borderBottom: isActive
                            ? "2px solid var(--ant-color-primary)"
                            : "2px solid transparent",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tab.label}
                        {tab.closable && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              closeTab(tab.key);
                            }}
                            style={{
                              fontSize: 10,
                              opacity: isActive ? 1 : 0,
                              transition: "opacity 0.15s",
                            }}
                          >
                            ×
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Page content */}
              {children}

              {/* SettingDrawer — reference: ant-design-pro/src/app.tsx childrenRender */}
              <SettingDrawer
                settings={settings}
                onSettingsChange={setSettings}
                collapse={settingDrawerOpen}
                onCollapseChange={setSettingDrawerOpen}
              />
            </ProLayout>

            <SessionExpiredModal
              open={showLoginModal}
              onSuccess={handleLoginSuccess}
            />
          </SocketProvider>
        </App>
      </ProConfigProvider>
    </ConfigProvider>
  );
}
