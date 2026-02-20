# Story 7.1 — Consolidate Payment Modals Into Single Component

## User Story

**As a** finance user processing payments,
**I want** the same payment form regardless of which page I'm on,
**so that** I always see the same fields and behavior.

**Priority:** High
**Points:** 5
**Epic:** 7 — Expense System Reliability

---

## Acceptance Criteria

- [ ] **AC 7.1.1** — `ProcessPaymentModal.tsx` is the single payment modal used everywhere
- [ ] **AC 7.1.2** — `PaymentModal.tsx` is deleted (legacy/duplicate)
- [ ] **AC 7.1.3** — `TripDetailDrawer.tsx` inline payment modal is replaced with `<ProcessPaymentModal>`
- [ ] **AC 7.1.4** — `/dashboard/tasks` page payment flow uses `<ProcessPaymentModal>`
- [ ] **AC 7.1.5** — Payment modal consistently shows: Payment Method (Cash/Transfer), Payment Date, Reference Number (for Transfer), Bank Details (pre-filled from metadata for Transfer)
- [ ] **AC 7.1.6** — After successful payment, the parent page's data is refreshed (via callback prop or query invalidation)
- [ ] **AC 7.1.7** — No duplicate payment modal code remains in the codebase

---

## Technical Notes

### Current State — 3 Implementations

| Implementation | File | Status |
|---------------|------|--------|
| `ProcessPaymentModal` | `components/expenses/ProcessPaymentModal.tsx` | **KEEP** — most complete |
| `PaymentModal` | `components/expenses/PaymentModal.tsx` | **DELETE** — legacy |
| Inline payment modal | `components/trips/TripDetailDrawer.tsx` | **REPLACE** with ProcessPaymentModal |

### ProcessPaymentModal Props Interface

Ensure the kept component accepts these props:
```tsx
interface ProcessPaymentModalProps {
  expense: ExpenseRequest | null;
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}
```

### Refactor TripDetailDrawer

**File:** `frontend/src/components/trips/TripDetailDrawer.tsx`

1. Remove the inline payment `<Modal>` JSX (the one with payment method select, reference number input, etc.)
2. Remove the associated state: `showPayModal`, `paymentForm`, `paymentSubmitting`, etc.
3. Import and use `<ProcessPaymentModal>`:

```tsx
import { ProcessPaymentModal } from "@/components/expenses/ProcessPaymentModal";

// In the JSX:
<ProcessPaymentModal
  expense={selectedExpenseForPayment}
  open={showPayModal}
  onSuccess={() => {
    setShowPayModal(false);
    refreshTripData();
  }}
  onCancel={() => setShowPayModal(false)}
/>
```

### Refactor Dashboard Tasks Page

**File:** `frontend/src/app/(authenticated)/dashboard/tasks/page.tsx`

Same pattern — replace any inline payment handling with `<ProcessPaymentModal>`.

### Delete Legacy Modal

**File to delete:** `frontend/src/components/expenses/PaymentModal.tsx`

Check for any remaining imports of `PaymentModal` and remove them.

---

## Dev Checklist

- [ ] Audit `ProcessPaymentModal` props — ensure it covers all use cases
- [ ] Replace inline payment modal in `TripDetailDrawer`
- [ ] Replace payment handling in `dashboard/tasks/page.tsx`
- [ ] Delete `PaymentModal.tsx`
- [ ] Search codebase for any remaining `PaymentModal` imports
- [ ] Test payment from: Trip Detail drawer, Dashboard Tasks page, Office Expenses page
- [ ] Verify bank details pre-fill from metadata works in all contexts
- [ ] Verify parent data refresh after payment in all contexts
