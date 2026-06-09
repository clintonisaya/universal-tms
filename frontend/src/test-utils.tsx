import { App } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function TestProviders({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <App>{children}</App>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & { queryClient?: QueryClient },
) {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  const { queryClient: _queryClient, ...renderOptions } = options ?? {};

  return {
    queryClient,
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestProviders queryClient={queryClient}>{children}</TestProviders>
      ),
      ...renderOptions,
    }),
  };
}
