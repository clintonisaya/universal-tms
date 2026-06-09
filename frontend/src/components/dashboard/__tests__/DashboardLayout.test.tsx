import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import AuthenticatedLayout from "@/app/(authenticated)/layout";
import { renderWithProviders } from "@/test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "testuser", role: "admin", is_superuser: true },
    loading: false,
    logout: vi.fn(),
  }),
}));

vi.mock("@/contexts/TabContext", () => ({
  useTabs: () => ({
    tabs: [],
    activeKey: "/dashboard",
    openTab: vi.fn(),
    closeTab: vi.fn(),
    switchTab: vi.fn(),
  }),
}));

vi.mock("@/lib/socket", () => ({
  SocketProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/auth/SessionExpiredModal", () => ({
  SessionExpiredModal: () => null,
}));

vi.mock("@/components/RightContent/AvatarDropdown", () => ({
  AvatarDropdown: () => <button>Admin</button>,
}));

vi.mock("@/components/SettingDrawer", () => ({
  SettingDrawer: () => null,
  loadSettings: () => ({}),
}));

vi.mock("@/components/dashboard/ToDoWidget", () => ({
  ToDoWidget: () => <button>Tasks</button>,
}));

describe("AuthenticatedLayout", () => {
  it("renders children correctly", () => {
    renderWithProviders(
      <AuthenticatedLayout>
        <div>Test Content</div>
      </AuthenticatedLayout>,
    );

    expect(screen.getByText("Test Content")).toBeDefined();
  });

  it("renders sidebar menu items", () => {
    renderWithProviders(
      <AuthenticatedLayout>
        <div>Test Content</div>
      </AuthenticatedLayout>,
    );

    expect(screen.getByText("Fleet")).toBeDefined();
    expect(screen.getByText("Operations")).toBeDefined();
  });
});
