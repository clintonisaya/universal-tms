"use client";

import { use } from "react";
import { InvoiceGenerator } from "@/components/invoices/InvoiceGenerator";

export default function InvoiceEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <InvoiceGenerator invoiceId={id} />;
}
