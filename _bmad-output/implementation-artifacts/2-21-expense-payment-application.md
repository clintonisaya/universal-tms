# Story 2.21: Structured Office Expense Payment Application Form

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-21-expense-payment-application
**Status:** review

## 1. User Story

**As an** Ops Officer,
**I want** a structured "Payment Application" form for submitting office expenses,
**So that** I can group related expense items under a single application header with clear banking and business partner details.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Form Structure & Layout
**Given** I open the "Add Office Expense" modal
**Then** I see the modal is expanded (wide layout)
**And** I see two main Tabs:
1.  **Basic Information** (Active by default)
2.  **Attachment Manage**

### Scenario 2: Basic Information Header
**Given** I am on the "Basic Information" tab
**Then** I see a Header Grid with the following fields:
*   **Company** (Pre-filled "EDUPO COMPANY LIMITED", Read-only)
*   **Application Date** (Date Picker, Default: Today)
*   **Application Amount** (Read-only sum or Input)
*   **Payment Method** (Select: "Cash" or "Transfer")
*   **Remarks** (Text Input)
*   *(Hidden: Branch, Business Partner)*

### Scenario 2a: Payment Method - Transfer
**Given** I select **Payment Method** = "Transfer"
**Then** The following fields become **Required** and accept **Text Input**:
*   **Bank Name** (Text Input / Manual Entry)
*   **Account Name** (Text Input)
*   **Bank Account No.** (Text Input)

### Scenario 2b: Payment Method - Cash
**Given** I select **Payment Method** = "Cash"
**Then** The Bank Details fields (Bank Name, Account Name, Account No.) are **Not Required** (or Hidden/Disabled).

### Scenario 3: Expense Items Table
**Given** I look below the header section
**Then** I see an "Items Table" with:
*   **Toolbar**: "+ Add" (Blue) and "Delete" (Red) buttons
*   **Columns**:
    *   No. (Row Index)
    *   Payment Item (Searchable Select)
    *   Amount (Input)
    *   Currency (Select)
    *   Invoice State (Select: "With Invoice", "Without Invoice")
    *   Details (Input)
    *   Exchange Rate (Number)
    *   Remarks (Input)

### Scenario 4: Adding and Removing Items
**When** I click "+ Add"
**Then** A new empty row is added to the table
**When** I select a row and click "Delete"
**Then** The row is removed from the table
**And** The "Total" at the bottom footer updates to reflect the sum of all item amounts

## 3. Technical Requirements

### 🎨 UI Components
*   **Component**: `AddExpenseModal` (Refactoring existing)
*   **Layout**: `Tabs`, `Row`, `Col` for the grid.
*   **Table**: Ant Design `Table` with editable cells/inputs.
*   **State**: Manage an array of items in the form state (`items: ExpenseItem[]`).
*   **Data Model**:
    *   *Frontend*: Map the UI structure to the backend `ExpenseRequestCreate` payload.
    *   *Note*: If the backend only supports single expenses, iterate and submit multiple requests or use a batch endpoint if available. For this story, focus on the UI structure.

### 📋 Scope
*   **Target Page**: `src/app/office-expenses/page.tsx` (Add Button)
*   **Component**: `src/components/expenses/AddExpenseModal.tsx`

## 4. Implementation Tasks

- [x] **Modal Restructuring**
    - [x] Increase Modal width (`1000px`+)
    - [x] Implement `Tabs` (Basic Info, Attachments)
- [x] **Header Section**
    - [x] Create Grid layout
    - [x] Set Company default "EDUPO COMPANY LIMITED" (Read-only)
    - [x] Hide Branch and Business Partner fields
    - [x] Implement Conditional Logic:
        -   If **Transfer**: Show Bank Name, Account Name, Account No. (All Text Inputs, Required)
        -   If **Cash**: Hide or Optionalize Bank fields
- [x] **Items Table**
    - [x] Implement dynamic Table for line items
    - [x] Column: Invoice State (With/Without Invoice) instead of Date
    - [x] Add state for managing rows (Add/Delete/Update)
    - [x] Implement "Total" calculation in footer
- [x] **Form Submission**
    - [x] Map table data to submission payload (Single or Batch)

## 5. Dev Agent Record

### Implementation Plan
- **Strategy**: Refactor `AddExpenseModal` to support a structured payment application form with multiple line items.
- **Key Components**:
    - `AddExpenseModal`: Updated to use `Tabs`, `Form` with `Header Grid`, and dynamic `Table` for items.
    - `Ant Design` components: Used extensively for layout and form elements.
- **Data Model**: mapped UI state to match backend expectations, iterating over items for submission as backend doesn't support batch creation yet.

### Debug Log
- **Issue**: Test failures due to `ResizeObserver` not being defined in JSDOM.
- **Fix**: Added `ResizeObserver` mock in `src/setupTests.ts` and updated `vitest.config.ts` to include setup files. Also mocked `matchMedia`.
- **Issue**: `toBeInTheDocument` invalid Chai property.
- **Fix**: Installed `@testing-library/jest-dom` and imported it in `src/setupTests.ts`.
- **Issue**: Difficulty selecting delete buttons in tests.
- **Fix**: Added `aria-label="Delete Item"` to the delete button for robust selection.

### Completion Notes
- The modal now supports adding multiple expense items in a single session.
- Bank details are conditionally shown based on payment method.
- Total amount is auto-calculated.
- Tests cover rendering and interaction flows.

