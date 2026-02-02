import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TruckDetailPage from "../page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useParams: () => ({
    id: "truck-123",
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

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockTruck = {
  id: "truck-123",
  plate_number: "KCB123 A",
  make: "Mercedes",
  model: "Actros",
  status: "Idle",
  created_at: "2026-01-01T10:00:00Z",
};

const mockMaintenanceHistory = {
  data: [],
  count: 0,
  total_maintenance_cost: 0,
};

describe("TruckDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/maintenance-history")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMaintenanceHistory),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTruck),
      });
    });
  });

  it("renders a loading spinner initially", () => {
    render(<TruckDetailPage />);
    // The component starts in loading state showing a spinner
    const spinner = document.querySelector(".ant-spin");
    expect(spinner).not.toBeNull();
  });

  it("fetches truck data on mount", async () => {
    render(<TruckDetailPage />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/v1/trucks/truck-123", {
        credentials: "include",
      });
    });
  });

  it("fetches maintenance history on mount", async () => {
    render(<TruckDetailPage />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/trucks/truck-123/maintenance-history",
        { credentials: "include" }
      );
    });
  });

  it("handles truck not found (404)", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/maintenance-history")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMaintenanceHistory),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: "Truck not found" }),
      });
    });

    render(<TruckDetailPage />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
