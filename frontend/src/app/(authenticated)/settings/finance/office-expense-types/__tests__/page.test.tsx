import { screen, waitFor } from "@testing-library/react";
import OfficeExpenseTypesPage from "../page";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "@/test-utils";

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

describe("OfficeExpenseTypesPage", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "1", name: "Rent", category: "Office", description: "Office Rent", is_active: true },
          { id: "2", name: "Internet", category: "Office", description: null, is_active: false },
        ],
        count: 2,
      }),
    });
  });

  it("renders the table with expense types", async () => {
    renderWithProviders(<OfficeExpenseTypesPage />);

    await waitFor(() => {
      expect(screen.getByText("Office Expense Types")).toBeInTheDocument();
      expect(screen.getByText("Rent")).toBeInTheDocument();
      expect(screen.getByText("Internet")).toBeInTheDocument();
    });
  });
});
