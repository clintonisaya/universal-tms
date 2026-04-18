/**
 * Invoice types for Invoice Generation & Payment Verification
 */

import type { UserSummary } from "./expense";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "fully_paid"
  | "voided";

export type PaymentType = "full" | "advance" | "balance";

export interface InvoiceItem {
  route: string;
  truck_plate: string;
  trailer_plate: string;
  qty: number;
  unit_price: number;
  payment_schedule: string;
  amount: number;
}

export interface BankDetails {
  bank: string;
  account: string;
  name: string;
  currency: string;
}

export interface Invoice {
  id: string;
  invoice_number: string | null;
  archived_invoice_number?: string | null;
  invoice_seq: number;
  date: string;
  due_date: string | null;
  status: InvoiceStatus;

  // Company
  company_name: string;
  company_address: string;
  company_tin: string;
  company_phone: string;
  company_email: string;

  // Customer
  customer_name: string;
  customer_tin: string;
  client_id: string | null;
  regarding: string;

  // Financial
  currency: string;
  vat_rate: number;
  exchange_rate: number;
  subtotal: number;
  vat_amount: number;
  total_usd: number;
  total_tzs: number;
  amount_paid: number;
  amount_outstanding: number;

  // JSON
  items: InvoiceItem[];
  bank_details_tzs: BankDetails;
  bank_details_usd: BankDetails;

  // References
  waybill_id: string | null;
  trip_id: string | null;
  // Enrichment fields (resolved server-side from refs)
  waybill_number?: string | null;
  trip_number?: string | null;

  // Audit
  created_by_id: string | null;
  updated_by_id: string | null;
  issued_by_id: string | null;
  issued_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: UserSummary | null;
  updated_by: UserSummary | null;
  issued_by: UserSummary | null;
}

export function getInvoiceDisplayNumber(invoice: Pick<Invoice, "invoice_number" | "archived_invoice_number">): string {
  return invoice.invoice_number || invoice.archived_invoice_number || "";
}

export interface InvoicesResponse {
  data: Invoice[];
  count: number;
}

// Invoice Payment types

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  payment_type: PaymentType;
  amount: number;
  currency: string;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  verified_by_id: string | null;
  verified_by: UserSummary | null;
  attachments: PopAttachment[];
  created_at: string | null;
  updated_at: string | null;
}

export interface PopAttachment {
  id: string;
  key: string;
  filename: string;
  content_type: string;
  uploaded_by: string;
  uploaded_at: string;
  url?: string;
}

export interface PopAttachmentsGroup {
  payment_id: string;
  payment_type: PaymentType;
  amount: number;
  payment_date: string;
  attachments: PopAttachment[];
}

export interface InvoicePaymentsResponse {
  data: InvoicePayment[];
  count: number;
}

export interface RecordPaymentInput {
  payment_type: PaymentType;
  amount: number;
  currency: string;
  payment_date: string;
  reference?: string;
  notes?: string;
}
