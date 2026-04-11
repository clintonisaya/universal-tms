import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddExpenseModal } from "../AddExpenseModal";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// Mock dependencies
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", name: "Test User", role: "admin" },
    loading: false,
  }),
}));

// Mock window.matchMedia
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
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock fetch
global.fetch = vi.fn();

describe("AddExpenseModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
  });

  it("renders the expanded modal with tabs", async () => {
    render(
      <AddExpenseModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
        // Check for modal title
        expect(screen.getByText("Add Office Expense")).toBeInTheDocument();

        // Check for tabs
        expect(screen.getByText("Basic Information")).toBeInTheDocument();
        expect(screen.getByText("Attachment Manage")).toBeInTheDocument();
    });
  });

  it("renders the basic information header fields", async () => {
    render(
      <AddExpenseModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
        // Check for header fields
        expect(screen.getByText("Company")).toBeInTheDocument();
        expect(screen.getByDisplayValue("NABLAFLEET COMPANY LIMITED")).toBeInTheDocument();
        expect(screen.getByText("Application Date")).toBeInTheDocument();
        expect(screen.getByText("Payment Method")).toBeInTheDocument();
    });
  });

  it("adds and removes expense items", async () => {
    render(
      <AddExpenseModal
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Initial row should be present
    await waitFor(() => {
      expect(screen.getAllByRole("row").length).toBeGreaterThan(1); // Header + 1 row
    });

    // Add a new row
    const addButton = screen.getByText("Add Item");
    fireEvent.click(addButton);

    await waitFor(() => {
      // Should have one more row (based on delete buttons)
      const deleteButtons = screen.getAllByLabelText("Delete Item");
      expect(deleteButtons.length).toBe(2);
    });

    // Delete a row
    const deleteButtons = screen.getAllByLabelText("Delete Item");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
       const deleteButtonsAfter = screen.getAllByLabelText("Delete Item");
       expect(deleteButtonsAfter.length).toBe(1);
    });
  });
});
