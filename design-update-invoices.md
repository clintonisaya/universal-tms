# Nablafleet TMS — Invoice & Payment Verification Design

**Scope**: Add invoice generation, payment tracking, and payment verification to the Nablafleet TMS. Invoices are generated per-waybill from trip data, the invoice becomes the source of truth for trip rates, and Finance verifies payments (advance, full, balance) against issued invoices.

---

## 1. Overview

The invoice module replaces the manual Microsoft Word invoice process and introduces a complete accounts-receivable lifecycle: **Issue → Pay → Verify**. It pulls data directly from the TMS (waybills, trips, clients) and renders a pixel-perfect commercial invoice matching the Nablafleet brand identity.

### Core Principles

- **One invoice per waybill** — a trip with go + return legs produces two separate invoices
- **Invoice is the rate authority** — the rate is entered on the invoice, then written back to the waybill
- **Waybill creation no longer requires a rate** — `agreed_rate` becomes optional (default `0.00`)
- **Waybill-centric workflow** — Ops generates and issues invoices directly from the waybill table (no separate Invoices page); Finance verifies payments on a dedicated verification page

### Complete Lifecycle

```
1. Ops creates Trip + Waybill (no rate required)
        ↓
2. Ops clicks "Generate Invoice" on waybill row
        ↓
3. Invoice created in Draft status
   - Ops enters the rate/amount (this IS the trip rate)
   - Auto-fills: client, route, truck/trailer from waybill + trip
        ↓
4. Ops reviews in two-panel editor, clicks "Issue"
   - Status: Draft → Issued
   - Rate writes back to Waybill.agreed_rate automatically
   - Invoice printed/PDF'd and sent to client (always shows FULL amount)
        ↓
5. Client pays based on agreement (advance or full — this is external)
        ↓
6. Finance records what was received in Invoice Verification screen
   - Selects payment type: Full or Advance
        ↓
6a. Full Payment received:
   - Finance records amount = invoice total
   - Status: Issued → Fully Paid ✓
        ↓
6b. Advance Payment received:
   - Finance records partial amount (e.g., $5,000 of $6,000)
   - Status: Issued → Partially Paid
        ↓
7. Balance Payment received (after advance):
   - Finance records remaining amount
   - Status: Partially Paid → Fully Paid ✓
```

**Note:** The printed invoice is always for the full amount. The advance/balance split is an agreement between the company and the client — it is tracked in the system but never printed on the invoice document itself.

---

## 2. Where It Lives in the UI

### 2a. Navigation

Invoice generation is embedded in the existing Waybills workflow — there is **no separate Operations → Invoices page**. Finance gets a dedicated verification page.

```
Operations
  ├── Tracking
  ├── Waybills              ← Invoice generation lives here (row action + status column)
  ├── Trips
  └── Expenses

Finance
  ├── Expense Console
  ├── Payments
  ├── Exchange Rates
  └── Invoice Verification  ← NEW (Finance view: verify payments)
```

**Operations → Waybills**: Waybill table gains an "Invoice Status" column and a "Generate Invoice" / "View Invoice" row action. Ops creates, edits, issues, prints, and voids invoices directly from the waybill context. No standalone invoice list page.

**Finance → Invoice Verification**: Filtered view showing only `Issued` and `Partially Paid` invoices. Finance can record payments and verify receipts. Cannot create or edit invoice details.

### 2b. Entry Points (buttons that trigger invoice generation)

| Location | Trigger | Pre-filled Data |
|---|---|---|
| Waybills list → row action | "Generate Invoice" button (no existing invoice) | Client, route, cargo from waybill; truck/trailer from trip |
| Waybills list → row action | "View Invoice" button (invoice exists) | Opens existing invoice in editor/preview |
| Trip detail → waybill section | "Generate Invoice" on each waybill card | Same as above |

### 2c. Invoice Generator Page (Two-Panel Layout)

When the user clicks "Generate Invoice", navigate to a dedicated invoice page:

```
┌─────────────────────────────────────────────────────────────┐
│  TOOLBAR: [← Back] [Preview | Edit] [Print / PDF] [Save]   │
│           [Issue ▸] (only on Draft)                         │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  EDIT PANEL  │          PREVIEW PANEL                       │
│  (380px)     │    (A4 invoice rendered at scale)            │
│              │                                              │
│  • Invoice # │                                              │
│  • Date      │    ┌────────────────────────┐                │
│  • Customer  │    │  INVOICE PREVIEW       │                │
│  • Rate      │    │  (print-ready, full    │                │
│  • Schedule  │    │   amount always — no   │                │
│  • VAT       │    │   payment status)      │                │
│  • Exchange  │    └────────────────────────┘                │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

The edit panel is toggleable. In "Preview" mode, the invoice takes full width. In "Edit" mode, the side panel shows all editable fields.

**Important: The printed invoice always shows the full invoice amount.** Payment status (advance, partially paid, balance) is **system-only data** — it never appears on the printed document. The invoice is a clean commercial document that the client receives for the total agreed amount. Payment tracking lives entirely within the system UI (the Invoice Verification page and invoice detail sidebar).

---

## 3. Invoice Layout Specification

The invoice is a single A4 page (210mm × 297mm) with the following zones from top to bottom:

### 3a. Header Banner (full-width, dark background)

| Property | Value |
|---|---|
| Height | ~130px |
| Background | `#13161C` (always dark for print, regardless of app theme) |
| Layout | Flex row: Logo (160px) + Company Info (flex: 1) + Decorative edge (80px) |

**Logo area**: The Nablafleet heraldic crest rendered at ~100px height inside a 160px-wide column. Use the `logo-icon-full.png` asset. Always gold-on-dark for print.

**Company info**:
- Company name: `font-size: 22px; font-weight: 800; color: white`
- Contact lines: `font-size: 11px; color: rgba(255,255,255,0.7)`
- Email label in gold: `color: var(--color-gold)`

**Decorative right edge**: Diagonal skewed dark panel with gold accent dots and lines (matching the original Word template's geometric decoration).

### 3b. Invoice Title Bar

A gold ribbon aligned right below the header:
- Background: `var(--color-gold)`
- Text: "COMMERCIAL INVOICE" — `font-size: 11px; font-weight: 700; color: white; letter-spacing: 0.1em`
- Padding: `var(--space-sm) var(--space-xl)`

### 3c. Company + Invoice Meta Row

Two-column layout:
- **Left**: Company name, address, TIN (repeated from header for formal invoice requirements)
- **Right**: 2-column table with headers "INVOICE #" and "DATE" in gold cells

| Cell Style (header) | Value |
|---|---|
| Background | `var(--color-gold)` |
| Color | White |
| Font size | `var(--font-xs)` |
| Font weight | 700 |
| Padding | `6px 20px` |

### 3d. Bill To + Regarding Row

- **Left**: "BILL TO" tag (dark background pill) + customer company name + customer TIN
- **Right**: "REGARDING" label + value (e.g., "TRANSPORTATION")

### 3e. Line Items Table

| Column | Width | Alignment | Notes |
|---|---|---|---|
| DESCRIPTION | flex | left | Multi-line: route + truck/trailer plates |
| QTY | 50px | center | Integer |
| UNIT PRICE | 90px | right | Monospace font, USD |
| SCHEDULE | 80px | center | e.g., "100%", "50/50" |
| AMOUNT (USD) | 100px | right | Monospace font, bold, calculated |

Header row: dark background, white text, `font-size: var(--font-xs)`, `letter-spacing: 0.04em`.
Body rows: `border-bottom: 1px solid var(--color-border)`, `padding: var(--space-sm) var(--space-md)`.
Empty rows fill to a minimum of 4 visible rows.

### 3f. Bank Details + Totals Row

Two-column layout below the items table:

**Left column — Banking Details**:
Two bank account cards (TZS and USD), each in a light card with border:
- Bank name (bold)
- Account number (bold, monospace)
- Account holder name
- Currency label in gold

**Right column — Totals** (260px wide):

| Row | Style | Amount Font |
|---|---|---|
| SUBTOTAL | Light border bottom | Monospace, `var(--font-xs)` |
| VAT (x%) | Light, muted text | Monospace, muted |
| TOTAL — USD | Dark background, white text | Monospace, gold, `var(--font-base)`, bold |
| TOTAL — TZS | Gold background, white text | Monospace, white, `var(--font-base)`, bold |

Below totals: "Exchange Rate: 1 USD = X TZS" in muted small text.

### 3g. Footer Area

- "Thank you for your business!" — italic, gold-dim, centered
- Contact line: phone + email
- Gold footer banner bar with diagonal decorative elements (matching header style)

---

## 4. Data Model

### 4a. Invoice Record

```typescript
interface Invoice {
  id: string;                    // UUID
  invoice_number: string;        // Display: "INV-2026-0047"
  invoice_seq: number;           // Sequential integer for auto-increment
  date: string;                  // ISO date: "2026-03-24"
  due_date?: string;             // Optional payment due date
  status: InvoiceStatus;

  // Company (static, from system settings)
  company_name: string;
  company_address: string;
  company_tin: string;
  company_phone: string;
  company_email: string;

  // Customer
  customer_name: string;
  customer_tin: string;
  client_id?: string;            // FK → Client record
  regarding: string;             // Default: "TRANSPORTATION"

  // Line items (JSONB in DB)
  items: InvoiceItem[];

  // Financial
  currency: string;              // Base currency, typically "USD"
  vat_rate: number;              // Percentage, e.g., 0 or 18
  exchange_rate: number;         // TZS per USD at invoice date
  subtotal: number;              // Computed: sum of item amounts
  vat_amount: number;            // Computed: subtotal × vat_rate%
  total_usd: number;             // Computed: subtotal + vat_amount
  total_tzs: number;             // Computed: total_usd × exchange_rate

  // Payment tracking (computed from InvoicePayments)
  amount_paid: number;           // Sum of all payment amounts
  amount_outstanding: number;    // total_usd - amount_paid

  // Banking (JSONB in DB)
  bank_details_tzs: BankDetails;
  bank_details_usd: BankDetails;

  // References
  waybill_id?: string;           // FK → Waybill (one invoice per waybill)
  trip_id?: string;              // FK → Trip

  // Metadata
  created_by: string;
  updated_by?: string;
  issued_by?: string;            // User who clicked "Issue"
  issued_at?: string;
  created_at: string;
  updated_at: string;
}

type InvoiceStatus =
  | 'draft'            // Created, not yet sent to client
  | 'issued'           // Sent/shared with client, awaiting payment
  | 'partially_paid'   // Advance payment received, balance outstanding
  | 'fully_paid'       // All payments received, invoice closed
  | 'voided'           // Cancelled / reversed
  ;

interface InvoiceItem {
  route: string;                 // Auto-filled: "{origin} - {destination}"
  truck_plate: string;           // Auto-filled: Trip → Truck plate
  trailer_plate: string;         // Auto-filled: Trip → Trailer plate
  qty: number;                   // Default: 1
  unit_price: number;            // USD — THIS is the trip rate
  payment_schedule: string;      // "100%", "50/50", etc.
  amount: number;                // Computed: qty × unit_price
}
// Printed description auto-composed as:
//   Line 1: "TRANSPORTATION: {route}"
//   Line 2: "{truck_plate}/{trailer_plate}"

interface BankDetails {
  bank: string;
  account: string;
  name: string;
  currency: string;
}
```

### 4b. Invoice Payment Record (NEW)

```typescript
interface InvoicePayment {
  id: string;                    // UUID
  invoice_id: string;            // FK → Invoice
  payment_type: PaymentType;
  amount: number;                // Amount received
  currency: string;              // Currency of payment
  payment_date: string;          // When payment was received
  reference?: string;            // Bank ref, cheque number, transfer ID
  verified_by: string;           // FK → User (finance user who recorded this)
  notes?: string;                // Optional remarks
  created_at: string;
  updated_at: string;
}

type PaymentType =
  | 'full'             // Single payment covering the full invoice amount
  | 'advance'          // Partial upfront payment
  | 'balance'          // Remaining amount after an advance
  ;
```

### 4c. Auto-Fill Mapping (Waybill → Invoice)

| Invoice Field | Source |
|---|---|
| `customer_name` | Waybill → Client name |
| `customer_tin` | Client record → TIN |
| `client_id` | Waybill → Client ID |
| `regarding` | "TRANSPORTATION" (default) |
| `items[0].route` | Trip → `"{origin} - {destination}"` |
| `items[0].truck_plate` | Trip → Truck plate number |
| `items[0].trailer_plate` | Trip → Trailer plate number |
| `items[0].qty` | `1` |
| `items[0].unit_price` | `0` (Ops enters the rate on the invoice) |
| `items[0].payment_schedule` | "100%" (default, editable) |
| `exchange_rate` | From Finance → Exchange Rates module (latest USD→TZS rate) |
| `invoice_seq` | Auto-increment from last invoice number |
| `date` | Today's date |
| `company_*` | From system settings / company profile |
| `bank_details_*` | From system settings / company bank details |

### 4d. Rate Write-Back (Invoice → Waybill)

When an invoice transitions from `draft` → `issued`:
1. Calculate `total_rate = sum(items[].unit_price × items[].qty)`
2. Write `total_rate` → `Waybill.agreed_rate` for the linked waybill
3. Write `invoice.currency` → `Waybill.currency` if different

This makes the invoice the authoritative source for pricing. The waybill's `agreed_rate` becomes a **derived field** after invoice issuance.

### 4e. Waybill Model Change

```python
# Before:
agreed_rate: Decimal = Field(..., required=True)

# After:
agreed_rate: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2)
# Optional — populated by invoice issuance, or manually if no invoice
```

Waybill creation form: **hide the `agreed_rate` field**. Show it as read-only on waybill detail view with source indication: "Set by INV-2026-0047" or "Not invoiced yet".

---

## 5. Payment Verification UX

### 5a. Finance → Invoice Verification Page

This page shows invoices that need financial action. Default filter: `status IN (issued, partially_paid)`.

**Page layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Invoice Verification                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Issued   │ │ Partial  │ │ Paid     │ │ All      │       │
│  │    12    │ │    3     │ │    45    │ │   60     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Invoice Table                                          │  │
│  │ # | Date | Client | Amount | Paid | Outstanding | Act. │  │
│  │ ...                                                    │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Table columns:**

| Column | Render |
|---|---|
| Invoice # | Gold text link, e.g., "INV-2026-0047" |
| Date | Formatted date |
| Client | Customer company name |
| Amount (USD) | Bold, monospace — full invoice amount |
| Paid (USD) | Green monospace — sum of payments received |
| Outstanding (USD) | Red/orange monospace — remaining balance |
| Status | StatusBadge (see below) |
| Actions | "Record Payment" button (for Issued/Partially Paid) |

**Status badges:**

| Status | Color | Label |
|---|---|---|
| `draft` | gray | Draft |
| `issued` | blue | Issued |
| `partially_paid` | orange | Partial |
| `fully_paid` | green | Paid |
| `voided` | red | Voided |

### 5b. Record Payment Modal

When Finance clicks "Record Payment" on an invoice, show a modal:

```
┌─────────────────────────────────────────┐
│  Record Payment — INV-2026-0047         │
│                                         │
│  Invoice Amount:    USD 6,000.00        │
│  Already Paid:      USD 5,000.00        │
│  Outstanding:       USD 1,000.00        │
│  ─────────────────────────────────      │
│                                         │
│  Payment Type:  [Advance ▼]            │
│                 • Full — pays entire    │
│                   invoice amount        │
│                 • Advance — partial     │
│                   upfront payment       │
│                 • Balance — remaining   │
│                   after advance         │
│                                         │
│  Amount:        [$ 3,000.00       ]     │
│  Payment Date:  [2026-03-24       ]     │
│  Reference:     [TRF-28374        ]     │
│  Notes:         [50% advance      ]     │
│                                         │
│         [Cancel]    [Record Payment]    │
└─────────────────────────────────────────┘
```

**Payment type behavior:**

| Type | When available | Amount default | After recording |
|---|---|---|---|
| **Full** | Status = `issued` AND no prior payments | Pre-fill with invoice total | Status → `fully_paid` |
| **Advance** | Status = `issued` AND no prior payments | Pre-fill with 50% of invoice total | Status → `partially_paid` |
| **Balance** | Status = `partially_paid` | Pre-fill with outstanding amount | Status → `fully_paid` |

**Validation rules:**
- Amount must be > 0
- Amount must not exceed outstanding balance
- Payment date is required
- If payment type is `full`, amount must equal invoice total (warn if different, allow override)
- If payment type is `balance`, amount should equal outstanding (warn if different, allow override)

### 5c. Payment History

On the invoice detail page (accessible from the waybill row action or from the Finance verification page), show a payment history timeline below the invoice preview:

```
┌──────────────────────────────────────────┐
│  Payment History                          │
│                                           │
│  ● Advance — $3,000.00                   │
│    Mar 15, 2026 · Ref: TRF-28374        │
│    Verified by: Jane (Finance)            │
│    Note: "50% advance per contract"       │
│                                           │
│  ● Balance — $3,000.00                   │
│    Mar 22, 2026 · Ref: TRF-29102        │
│    Verified by: Jane (Finance)            │
│    Note: "Balance payment received"       │
│                                           │
│  ─────────────────────────────────        │
│  Total Paid: $6,000.00 / $6,000.00 ✓    │
└──────────────────────────────────────────┘
```

---

## 6. Print / PDF Implementation

### Browser Print

The invoice preview component renders with exact A4 dimensions (`210mm × 297mm`). When the user clicks "Print / PDF":

1. Open a new browser window
2. Write the invoice HTML with embedded styles and fonts
3. Call `window.print()` after fonts load (500ms delay)
4. The browser's native print dialog allows printing or "Save as PDF"

### Print CSS Requirements

```css
@media print {
  @page {
    size: A4;
    margin: 0;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

**Critical**: All background colors must print. The `print-color-adjust: exact` property ensures the dark header, gold accents, and colored table headers render in print.

### Font Loading for Print

The print window must load DM Sans and Fira Code fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## 7. Integration with Existing TMS Modules

### 7a. Sidebar Menu Updates

```
Operations
  ├── Tracking
  ├── Waybills              ← Enhanced with invoice status + actions (no new sidebar entry)
  ├── Trips
  └── Expenses

Finance
  ├── Expense Console
  ├── Payments
  ├── Exchange Rates
  └── Invoice Verification  ← NEW (permission: invoices:verify)
```

### 7b. Waybill Table Enhancement (Invoice Status Column)

Add an "Invoice" column to the existing Waybills table showing invoice state at a glance:

| Invoice State | Column Render | Row Action Button |
|---|---|---|
| No invoice | "—" (muted dash) | "Generate Invoice" |
| Draft invoice | StatusBadge: gray "Draft" + invoice number link | "Edit Invoice" |
| Issued invoice | StatusBadge: blue "Issued" + invoice number link | "View Invoice" |
| Partially paid | StatusBadge: orange "Partial" + invoice number link | "View Invoice" |
| Fully paid | StatusBadge: green "Paid" + invoice number link | "View Invoice" |
| Voided | StatusBadge: red "Voided" + invoice number link | "View Invoice" |

The invoice number (e.g., "INV-2026-0047") is a gold text link that navigates to the invoice editor/preview. Hovering shows a tooltip with the invoice amount.

### 7c. Waybill Row Action — Invoice Generation

The waybill row action is the **primary entry point** for invoice generation. When clicked:
1. Check if an invoice already exists for this waybill
2. If yes, navigate to the existing invoice (editor if draft, preview if issued+)
3. If no, create a new draft invoice with auto-filled data, navigate to the invoice editor

### 7d. Waybill Creation Form Change

- **Remove** the `agreed_rate` field from the waybill creation form
- **Remove** the `agreed_rate` required validation
- On waybill detail view, show rate as read-only:
  - If invoiced: "USD 6,000.00 — Set by INV-2026-0047" (gold link)
  - If not invoiced: "Not invoiced yet" (muted text)

### 7e. Invoice Numbering

Auto-increment from the last invoice number. Format: `"INV-{YEAR}-{SEQ}"` where SEQ is zero-padded 4 digits. Example: `INV-2026-0047`. The system queries the last invoice sequence and increments by 1. Resets annually.

### 7f. Permissions

| Permission | Who | What |
|---|---|---|
| `invoices:view` | ops, manager, finance, admin | View invoice list and details |
| `invoices:create` | ops, admin | Create and edit draft invoices |
| `invoices:issue` | ops, manager, admin | Transition draft → issued (writes rate to waybill) |
| `invoices:verify` | finance, admin | Record payments, verify receipts |
| `invoices:void` | manager, admin | Void an invoice |

---

## 8. Component Architecture

### New Components

| Component | Purpose |
|---|---|
| `InvoiceGenerator` | Main page: two-panel layout (edit + preview) |
| `InvoicePrintView` | Pure HTML/CSS A4 invoice (no Ant Design) |
| `InvoiceForm` | Side panel form for editing invoice fields |
| `InvoiceStatusColumn` | Invoice status badge + link for waybill table rows |
| `InvoiceVerificationPage` | Finance verification page (issued + partial filter) |
| `RecordPaymentModal` | Modal for recording advance/full/balance payments |
| `PaymentHistory` | Timeline of payments on an invoice |

### File Structure

```
src/
  app/(authenticated)/
    ops/
      invoices/[id]/
        page.tsx                # Invoice detail / editor (InvoiceGenerator)
                                # Accessed via waybill row action — no list page
    finance/
      invoice-verification/
        page.tsx                # Finance → Invoice Verification list
  components/
    invoices/
      InvoiceGenerator.tsx      # Two-panel: edit + preview
      InvoicePrintView.tsx      # Print-ready A4 invoice (pure HTML/CSS)
      InvoiceForm.tsx           # Edit side panel (Ant Design form)
      InvoiceStatusColumn.tsx   # Status badge + link for waybill table
      RecordPaymentModal.tsx    # Payment recording modal
      PaymentHistory.tsx        # Payment timeline
  types/
    invoice.ts                  # TypeScript interfaces
```

### Key Implementation Notes

- **InvoicePrintView** must NOT use any Ant Design components. Pure HTML/CSS for reliable print output.
- **InvoiceForm** uses Ant Design's `Form`, `Input`, `InputNumber`, `DatePicker`, `Select`, styled with TMS design tokens.
- **InvoiceGenerator** layout uses Ant Design's `Layout` with a collapsible `Sider` for the edit panel.
- All monetary values display with `Fira Code` monospace font for alignment.
- The invoice preview always renders in "light/print" mode (white bg, dark header) regardless of app theme.
- **RecordPaymentModal** pre-calculates amount based on payment type selection and auto-transitions invoice status.

---

## 9. API Endpoints

### Invoice CRUD

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/invoices` | List invoices — used by Finance → Invoice Verification (pagination, filtering by status/client/date) |
| GET | `/api/v1/invoices/:id` | Get single invoice with payment history |
| PUT | `/api/v1/invoices/:id` | Update draft invoice |
| GET | `/api/v1/invoices/next-number` | Get next available invoice sequence |
| POST | `/api/v1/invoices/from-waybill/:waybillId` | Auto-generate invoice from waybill data (primary creation path) |

### Invoice Status Transitions

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/invoices/:id/issue` | Draft → Issued (triggers rate write-back to waybill) |
| POST | `/api/v1/invoices/:id/void` | Any → Voided |

### Payment Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/invoices/:id/payments` | List payments for an invoice |
| POST | `/api/v1/invoices/:id/payments` | Record a payment (advance/full/balance) |
| DELETE | `/api/v1/invoices/:id/payments/:paymentId` | Reverse a payment (admin only) |

### Waybill Changes

| Method | Endpoint | Change |
|---|---|---|
| POST | `/api/v1/waybills` | `agreed_rate` becomes optional (default 0) |
| GET | `/api/v1/waybills` | List response enriched with `invoice_id`, `invoice_number`, `invoice_status` per waybill (for table column) |
| GET | `/api/v1/waybills/:id` | Detail response enriched with `invoice_id`, `invoice_number`, `invoice_status` |

---

## 10. Summary of Deliverables

### Phase 1 — Invoice Generation (Ops workflow)
1. **Invoice data model** — Backend: Invoice table + migration
2. **Invoice API** — CRUD, auto-generate from waybill, issue with rate write-back
3. **InvoicePrintView** — Pure HTML/CSS A4 invoice (port from `nablafleet-invoice-generator.jsx`)
4. **InvoiceForm** — Ant Design edit panel
5. **InvoiceGenerator page** — Two-panel layout with preview + edit (accessed via waybill row action)
6. **Waybill table enhancement** — Add invoice status column + "Generate/View Invoice" row action
7. **Waybill form change** — Remove rate from creation form, show rate as read-only with invoice source
8. **Rate write-back** — On issue, write invoice rate → waybill.agreed_rate
9. **Print/PDF** — Browser print with exact A4 output and color preservation
10. **Permissions** — Invoice permission gates (no new sidebar entry for Ops)

### Phase 2 — Payment Verification (Finance workflow)
11. **InvoicePayment model** — Backend: payment table + migration
12. **Payment API** — Record, list, reverse payments
13. **Finance → Invoice Verification page** — Filtered list (issued + partial)
14. **RecordPaymentModal** — Full/Advance/Balance payment recording
15. **PaymentHistory** — Timeline on invoice detail page
16. **Status auto-progression** — Issued → Partially Paid → Fully Paid based on payments
