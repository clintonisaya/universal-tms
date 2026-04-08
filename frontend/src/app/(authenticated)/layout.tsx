"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedLayout>
      <ErrorBoundary>{children}</ErrorBoundary>
    </ProtectedLayout>
  );
}
