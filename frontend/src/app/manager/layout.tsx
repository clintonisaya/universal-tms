"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
