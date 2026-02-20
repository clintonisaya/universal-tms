# Story 4.7: Expense Review & Action Modal

Status: review

## Story

As an **Operations Manager / Finance Officer**,
I want to **review expense details in a familiar form layout and take action (approve / reject / return / pay) all from a single unified modal**,
So that I can **see the full expense context without navigating away, and make decisions faster with fewer clicks**.

## UX Design Rationale

### Problem Statement
Currently the Tasks page (`/dashboard/tasks`) uses:
1. **Separate action buttons** (Approve, Reject, Return, Pay, Fix) inline in each table row — cluttered and error-prone since you act without seeing full details.
2. **ExpenseDetailModal** — a read-only `Descriptions` view (700px) that looks nothing like the expense creation form, making it hard for reviewers to mentally map what was submitted.
3. **Separate reject/return comment modal** — forces a second modal on top, fragmenting the workflow.

### Design Solution: Unified Expense Review Modal
A single full-width modal (1200px) that mirrors the `AddExpenseModal` layout but in **view-only mode**, with an integrated action panel at the bottom. The reviewer sees exactly what the submitter filled out, plus approval timeline and action controls.

### Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│  🔍 Expense Review — TRP-EXP-0042              [Status Badge] │
├──────────────────────────────────────────────────────────────┤
│  ┌─ Tab: Expense Details ──┬─ Tab: Attachments ──┬─ Tab: History ─┐
│  │                         │                     │                │
│  │  ┌─────────────────────────────────────────┐  │                │
│  │  │ HEADER GRID (disabled form fields)      │  │                │
│  │  │ Company | Date | Total Amount           │  │                │
│  │  │ Payment Method | Remarks                │  │                │
│  │  │ [Bank Details if Transfer]              │  │                │
│  │  └─────────────────────────────────────────┘  │                │
│  │                                               │                │
│  │  ┌─────────────────────────────────────────┐  │                │
│  │  │ ITEMS TABLE (read-only, no delete btn)  │  │                │
│  │  │ No. | Item | Amount | Currency | ...    │  │                │
│  │  │ 1.  | Fuel | 150,000 | TZS | ...       │  │                │
│  │  │                        Total: TZS 150K  │  │                │
│  │  └─────────────────────────────────────────┘  │                │
│  │                                               │                │
│  │  ┌─────────────────────────────────────────┐  │                │
│  │  │ TRIP INFO (if linked)                   │  │                │
│  │  │ Trip # | Route | Status | Location      │  │                │
│  │  └─────────────────────────────────────────┘  │                │
│  └───────────────────────────────────────────────┘                │
│                                                                   │
│  ── ACTION PANEL (always visible at bottom) ────────────────────  │
│  ┌───────────────────────────────────────────────────────────────┐│
│  │  💬 Comment (optional for approve, required for reject/return)││
│  │  ┌──────────────────────────────────────────────────────────┐ ││
│  │  │ [TextArea placeholder: "Add a comment..."]               │ ││
│  │  └──────────────────────────────────────────────────────────┘ ││
│  │                                                               ││
│  │  [✅ Approve]  [❌ Reject]  [↩ Return]  or  [💰 Pay]  [Close]││
│  └───────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### Todo Task Table Enhancement
Replace the current multi-button "Actions" column with a single **Play button** (▶️) that opens the unified modal:

```
Current:  [Approve] [Reject] [Return]  ← 3 buttons, cluttered
Proposed: [▶ Review]                   ← 1 button, opens modal
```

The action buttons move INTO the modal where the reviewer has full context.

### Key UX Principles Applied
1. **Recognition over recall** — Form-like preview matches what the submitter saw
2. **Reduced cognitive load** — One modal replaces three separate interactions
3. **Context-aware actions** — Only show relevant action buttons based on task type and status
4. **Comment proximity** — Comment box sits right next to action buttons, encouraging feedback

---

## Acceptance Criteria

### AC1: Unified Expense Review Modal
**Given** I click the Review (play) button on any todo task
**When** the modal opens
**Then** I should see the expense data displayed in a form layout identical to `AddExpenseModal` but with all fields disabled/read-only
**And** the modal should be 1200px wide matching the creation form

### AC2: Tabbed View Matching Creation Form
**Given** the Review modal is open
**When** I view the "Expense Details" tab
**Then** I should see the header grid (Company, Date, Total, Payment Method, Remarks, Bank Details)
**And** the itemized expense table (No., Item, Amount, Currency, Invoice State, Details, Ex. Rate, Remarks)
**And** linked trip information if applicable
**And** all fields should be displayed but not editable

### AC3: Attachments Tab
**Given** the Review modal is open
**When** I click the "Attachments" tab
**Then** I should see all uploaded files with preview/download capabilities
**And** match the current attachment display from `ExpenseDetailModal`

### AC4: History/Timeline Tab
**Given** the Review modal is open
**When** I click the "History" tab
**Then** I should see the approval workflow timeline (submitted → manager → finance → paid)
**And** show timestamps, actors, and comments at each stage

### AC5: Action Panel with Context-Aware Buttons
**Given** the Review modal is open
**When** I view the action panel at the bottom
**Then** I should see action buttons matching the task's `actions` array:
- `approve` → Green "Approve" button
- `reject` → Red "Reject" button
- `return` → Orange "Return" button
- `pay` → Blue "Pay" button (opens ProcessPaymentModal)
- `edit` → Yellow "Fix" button (opens EditExpenseModal)
**And** a comment TextArea that is:
- Optional when approving
- Required when rejecting or returning

### AC6: Todo Task Play Button
**Given** I am viewing the Tasks page
**When** I see the Actions column for each task
**Then** each task should have a single Play/Review button (▶)
**And** clicking it should open the Unified Expense Review Modal
**And** the old inline Approve/Reject/Return buttons should be removed from the table

### AC7: Expense Detail Preview (Non-Task Context)
**Given** I click an expense number link (from tasks page, approvals page, etc.)
**When** the detail view opens
**Then** it should also use the new form-like preview layout
**And** only show the action panel if the user has pending actions on this expense

---

## Tasks / Subtasks

- [x] Create `ExpenseReviewModal` component (AC: #1, #2, #3, #4, #5)
  - [x] Build form-like read-only header grid (Company, Date, Amount, Payment Method, Remarks)
  - [x] Build read-only items table (matching AddExpenseModal columns minus delete button)
  - [x] Build trip info section (when expense is linked to a trip)
  - [x] Build attachments tab (reuse attachment fetching from ExpenseDetailModal)
  - [x] Build history/timeline tab (reuse timeline logic from ExpenseDetailModal)
  - [x] Build action panel with context-aware buttons and comment TextArea
  - [x] Implement approve/reject/return actions using existing API calls from tasks page
  - [x] Integrate ProcessPaymentModal for "pay" action
  - [x] Integrate EditExpenseModal for "edit" action

- [x] Update Tasks page to use Play/Review button (AC: #6)
  - [x] Replace multi-button Actions column with single ▶ Review button
  - [x] Wire Review button to open ExpenseReviewModal with expense data + task actions
  - [x] Remove old inline action modal (reject/return comment modal)
  - [x] Maintain highlight-on-navigate and empty state behaviors

- [x] Update ExpenseDetailModal to use new form-like layout (AC: #7)
  - [x] Deprecate ExpenseDetailModal in favor of ExpenseReviewModal (without action panel)
  - [x] Updated 4 consumer pages (manager/payments, ops/expenses, office-expenses, manager/approvals)

- [x] Testing
  - [x] Frontend build passes clean
  - [ ] Verify modal opens with correct data for each task type
  - [ ] Verify action buttons match task.actions array
  - [ ] Verify approve/reject/return work correctly from within the modal
  - [ ] Verify comment is required for reject/return, optional for approve
  - [ ] Verify Pay action opens ProcessPaymentModal correctly
  - [ ] Verify Edit action opens EditExpenseModal correctly
  - [ ] Test responsiveness at different screen sizes

---

## Dev Notes

### Architecture

**New Component:**
- `frontend/src/components/expenses/ExpenseReviewModal.tsx` — The new unified modal

**Modified Files:**
- `frontend/src/app/(authenticated)/dashboard/tasks/page.tsx` — Replace action buttons with play button
- `frontend/src/components/expenses/ExpenseDetailModal.tsx` — Update or deprecate

### Key Implementation Details

1. **Form-like read-only rendering**: Use Ant Design `Form` with `disabled` prop set globally, OR render `Input` / `Select` / `InputNumber` components with `disabled` attribute. This gives the same visual structure as `AddExpenseModal` but prevents editing.

2. **Data fetching**: The modal needs full expense details (`ExpenseRequestDetailed` type). The tasks page already has `handleViewExpense` that fetches via `/api/v1/expenses/{id}`. Reuse this pattern.

3. **Action handlers**: Move `handleApprove`, `openActionModal`, `handleRejectOrReturn` logic from `TasksContent` into the `ExpenseReviewModal` component, or pass them as callbacks.

4. **Task actions array**: The TodoTask interface already has `actions: string[]` which determines which buttons to show. Pass this to the modal.

5. **ProcessPaymentModal integration**: Already imported and used in tasks page. Pass the expense data to it when "Pay" is clicked from within the review modal.

### Reference Files
- `components/expenses/AddExpenseModal.tsx` — Layout to mimic (726 lines)
- `components/expenses/ExpenseDetailModal.tsx` — Timeline/attachment logic to reuse (408 lines)
- `app/(authenticated)/dashboard/tasks/page.tsx` — Current action handlers to move (605 lines)
- `components/expenses/ProcessPaymentModal.tsx` — Payment modal integration
- `components/expenses/EditExpenseModal.tsx` — Edit modal integration
- `types/expense.ts` — ExpenseRequestDetailed type definition

### Interaction Flow
```
Tasks Table → Click ▶ Review → fetch /api/v1/expenses/{id}
  → ExpenseReviewModal opens
    → Tab 1: Expense form (read-only)
    → Tab 2: Attachments
    → Tab 3: Timeline
    → Bottom: Comment box + [Approve] [Reject] [Return] / [Pay] / [Fix]
      → Approve: PATCH /api/v1/expenses/batch → close modal → refresh tasks
      → Reject/Return: validates comment → PATCH → close → refresh
      → Pay: opens ProcessPaymentModal on top → close both → refresh
      → Fix: opens EditExpenseModal on top → close both → refresh
```

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes

Implemented the unified Expense Review Modal that replaces the fragmented action workflow (inline buttons + separate comment modal + separate detail modal) with a single cohesive review experience.

**Key changes:**

1. **New Component — `ExpenseReviewModal.tsx`** (~450 lines)
   - 1200px modal mirroring `AddExpenseModal` form layout in read-only mode
   - 3 tabs: Expense Details (form-like header grid + items table + trip info), Attachments, History/Timeline
   - Action panel at bottom with comment TextArea and context-aware buttons (Approve/Reject/Return/Pay/Fix)
   - Comment required for reject/return, optional for approve
   - Approve/reject/return actions handled internally; Pay/Fix delegate to parent via callbacks
   - Loading state with spinner shown while expense data is being fetched

2. **Tasks page rewrite** — Replaced 280px multi-button Actions column (Approve/Reject/Return/Pay/Fix) with single 100px "Review" button. Removed old reject/return comment Modal, `ExpenseDetailModal` import, and all inline action handlers. The `ExpenseReviewModal` now owns the full review+action workflow.

3. **Deprecated `ExpenseDetailModal`** — Swapped all 4 consumer pages to use `ExpenseReviewModal` (without actions = read-only mode):
   - `manager/payments/page.tsx`
   - `ops/expenses/page.tsx`
   - `office-expenses/page.tsx`
   - `manager/approvals/page.tsx`

### File List

- `frontend/src/components/expenses/ExpenseReviewModal.tsx` *(new)*
- `frontend/src/app/(authenticated)/dashboard/tasks/page.tsx` *(rewritten)*
- `frontend/src/app/(authenticated)/manager/payments/page.tsx` *(import swap)*
- `frontend/src/app/(authenticated)/ops/expenses/page.tsx` *(import swap)*
- `frontend/src/app/(authenticated)/office-expenses/page.tsx` *(import swap)*
- `frontend/src/app/(authenticated)/manager/approvals/page.tsx` *(import swap)*
- `_bmad-output/implementation-artifacts/4-7-expense-review-action-modal.md` *(status update)*
