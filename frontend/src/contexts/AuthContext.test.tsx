import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./AuthContext";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  usePathname: () => "/login",
}));

function LoginProbe() {
  const auth = useAuth();
  const [result, setResult] = useState("idle");

  return (
    <div>
      <button
        disabled={auth.loading}
        onClick={async () => {
          setResult(
            (await auth.login("admin@example.com", "password"))
              ? "succeeded"
              : "failed",
          );
        }}
      >
        login
      </button>
      <span>{result}</span>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not report login success when the new session cannot be authenticated", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "login" })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(screen.getByText("failed")).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalledWith("/dashboard");
  });
});
