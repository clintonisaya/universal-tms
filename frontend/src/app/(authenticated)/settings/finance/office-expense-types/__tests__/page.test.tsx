import { render, screen, waitFor } from "@testing-library/react";
import OfficeExpenseTypesPage from "../page";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", name: "Admin", role: "admin" },
    loading: false,
  }),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("OfficeExpenseTypesPage", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "1", name: "Rent", description: "Office Rent", is_active: true },
          { id: "2", name: "Internet", description: null, is_active: false },
        ],
        count: 2,
      }),
    });
  });

  it("renders the table with expense types", async () => {
    render(<OfficeExpenseTypesPage />);

    await waitFor(() => {
      expect(screen.getByText("Office Expense Types")).toBeInTheDocument();
      expect(screen.getByText("Rent")).toBeInTheDocument();
      expect(screen.getByText("Internet")).toBeInTheDocument();
    });
  });
});
