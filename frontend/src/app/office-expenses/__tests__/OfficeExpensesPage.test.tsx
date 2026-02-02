import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OfficeExpensesPage from "../page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "testuser", role: "admin", full_name: "Test User" },
    loading: false,
  }),
}));

// Mock window.matchMedia (Ant Design requirement)
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

// Mock ResizeObserver (required by Ant Design Modal)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("OfficeExpensesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "1",
            trip_id: null,
            amount: 100000,
            category: "Office",
            description: "Jan 2026 Office Rent",
            status: "Pending Manager",
            created_by_id: "user-1",
            created_at: "2026-01-15T10:00:00Z",
            updated_at: null,
          },
        ],
        count: 1,
      }),
    });
  });

  it("renders the page title", async () => {
    render(<OfficeExpensesPage />);
    expect(screen.getByText("Office Expenses")).toBeDefined();
  });

  it("renders the New Office Expense button", async () => {
    render(<OfficeExpensesPage />);
    expect(screen.getByText("New Office Expense")).toBeDefined();
  });

  it("fetches and displays office expenses", async () => {
    render(<OfficeExpensesPage />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/expenses/?category=Office", {
        credentials: "include",
      });
    });
    await waitFor(() => {
      expect(screen.getByText("Jan 2026 Office Rent")).toBeDefined();
    });
  });

  it("fetches only office category expenses via server-side filter", async () => {
    render(<OfficeExpensesPage />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/expenses/?category=Office", {
        credentials: "include",
      });
    });
  });

  it("opens the submission modal when clicking New Office Expense", async () => {
    render(<OfficeExpensesPage />);

    const button = screen.getByText("New Office Expense");
    fireEvent.click(button);

    // Ant Design Modal renders in a portal; check for the modal wrapper in the DOM
    await waitFor(() => {
      const modal = document.querySelector(".ant-modal");
      expect(modal).not.toBeNull();
    });
  });
});
