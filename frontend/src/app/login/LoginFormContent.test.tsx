import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginFormContent from "./LoginFormContent";

const { loginMock, pushMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => new URLSearchParams("callbackUrl=/dashboard"),
}));

vi.mock("@ant-design/pro-components", async () => {
  const React = await import("react");

  function LoginForm(props: {
    children?: ReactNode;
    onFinish?: (values: { username: string; password: string }) => void;
  }) {
    return (
      <form
        aria-label="login form"
        onSubmit={(event) => {
          event.preventDefault();
          props.onFinish?.({ username: "admin@example.com", password: "password" });
        }}
      >
        {props.children}
        <button type="submit">Sign in</button>
      </form>
    );
  }

  function ProFormText(props: { name?: string; placeholder?: string }) {
    return <input name={props.name} placeholder={props.placeholder} />;
  }

  ProFormText.Password = ProFormText;

  return {
    LoginForm,
    ProFormText,
  };
});

describe("LoginFormContent", () => {
  beforeEach(() => {
    loginMock.mockReset();
    pushMock.mockReset();
  });

  it("redirects after successful login without showing a network error", async () => {
    loginMock.mockResolvedValue(true);

    render(<LoginFormContent />);

    fireEvent.submit(screen.getByRole("form", { name: "login form" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
    expect(
      screen.queryByText("Network error. Please check your connection and try again."),
    ).not.toBeInTheDocument();
  });
});
