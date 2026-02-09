# Story 2.23: Unified Payment Process Form

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-23-unified-payment-process-form
**Status:** complete

## 1. User Story

**As a** Finance Officer or Manager,
**I want** the "Process Payment" interface to be consistent with the "Finance Application" (Add Expense) form,
**So that** I have a unified, detailed, and professional experience when processing both Trip and Office expenses.

## 2. Context & Design

Currently, the "Process Payment" modal is a simple form. The user requires it to match the **Admin > Finance > Add Office Expense** (and **Add Trip Expense**) logic/layout, specifically:

*   **Dynamic Context:**
    *   If **Office Expense**: Title = "Process Office Payment".
    *   If **Trip Expense**: Title = "Process Trip Payment - [Trip Number]" (if available).
*   **Layout:** Modal with "Basic Information" and "Attachment Manage" tabs.
*   **Header Grid:**
    *   **Company:** Read-only (e.g., "EDUPO COMPANY LIMITED").
    *   **Payment Date:** Editable DatePicker (Defaults to Today).
    *   **Payment Amount:** Read-only total amount.
    *   **Payment Method:** Select (Cash, Transfer).
    *   **Bank Details:** (If Transfer) Bank Name, Account Name, Account No.
    *   **Remarks/Reference:** Input for notes or transaction IDs.
*   **Items Grid:**
    *   A table view of the expense item being paid.
    *   **Columns:** No, Payment Item (Description), Amount, Currency, Invoice State, Details, Ex. Rate, Remarks.
    *   *Note: While currently processing single items, this grid layout standardizes the view.*

## 3. Acceptance Criteria (BDD)

### Scenario 1: Open Payment Modal Layout
**Given** I am on the "Office Expenses", "Trip Expenses", or "Finance Payments" page
**And** I have a "Pending Finance" expense selected
**When** I click the "Pay" button
**Then** the "Process Payment" modal opens with the title "Process Payment - [Description]"
**And** I see two tabs: "Basic Information" and "Attachment Manage"
**And** the "Basic Information" tab displays the Header Grid and Items Grid as defined in the design.

### Scenario 2: Payment Method - Cash
**Given** the Payment Modal is open
**When** I select "Cash" as the Payment Method
**Then** the Bank Details fields (Bank Name, Account Name, Account No) are **hidden**
**And** the "Reference Number" field is optional (or labeled "Remarks").

### Scenario 3: Payment Method - Transfer
**Given** the Payment Modal is open
**When** I select "Transfer" as the Payment Method
**Then** the Bank Details fields (Bank Name, Account Name, Account No) are **visible** and **editable**
**And** the "Reference Number" field is **required**.

### Scenario 4: Process Payment
**Given** I have filled in all required fields
**When** I click "Confirm Payment"
**Then** the system submits the payment with the selected Method, Date, and Reference
**And** the expense status updates to "Paid"
**And** the modal closes and the list refreshes.

## 4. Technical Requirements

*   **Component:** Create `ProcessPaymentModal.tsx` reusing the layout patterns from `AddExpenseModal.tsx`.
*   **Props:** Accept `expense` object (ExpenseRequestDetailed).
*   **State:** Manage form state for Payment Date, Method, Reference, and Bank Details.
*   **Validation:** Ensure Reference is present if Method is Transfer.

## 5. Implementation Tasks

- [x] **Frontend Component**
    - [x] Create `ProcessPaymentModal` component with Tabs/Grid layout.
    - [x] Implement conditional logic for Payment Method (Cash vs Transfer).
    - [x] Map `expense` data to the Items Table (Read-only).
- [x] **Integration**
    - [x] Replace `PaymentModal` in `(authenticated)/office-expenses/page.tsx`.
    - [x] Replace `PaymentModal` in `(authenticated)/ops/expenses/page.tsx`.
    - [x] Replace custom modal in `(authenticated)/manager/payments/page.tsx`.
