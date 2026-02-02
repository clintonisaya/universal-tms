# Story 3.2: Office Expense Management

**Epic:** 3 - Maintenance & Office Overheads
**Story Key:** 3-2-office-expense-management
**Status:** ready-for-dev

## 1. User Story

**As an** Admin or Ops Officer,
**I want** to submit operational expenses (Rent, Utilities) unrelated to trips,
**So that** they can be paid through the standard approval channel.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Submit Office Expense
**Given** I am on the "Office Expenses" page
**When** I submit a request:
    - Category: "Rent"
    - Amount: 100,000
    - Invoice Selection: **"With Invoice"**
    - Description: "Jan 2026 Office Rent"
**And** I upload the Invoice Image
**Then** an `ExpenseRequest` is created
**And** it has a unique ID like `OFF-EXP-2026-001`
**And** it status is "Pending Manager"

### Scenario 2: Approval Flow
**Given** I am a Manager
**When** I view my Approval Queue
**Then** I see this Office Expense mixed in with Trip Expenses
**And** I can see the ID (`OFF-EXP...`) to distinguish it

## 3. Technical Requirements

### 🏗️ Architecture & Stack
*   **Backend:** Reuse `ExpenseRequest` and `Sequence` logic.
*   **ID Prefix:** `OFF-EXP`.
*   **Frontend:** Dedicated page for Office Expenses.

### 📂 File Structure
*   `frontend/src/app/office/expenses/page.tsx`
*   `frontend/src/app/office/expenses/AddOfficeExpenseModal.tsx`

## 4. Implementation Guide

1.  **Backend:**
    *   Ensure creating an office expense triggers `generate_document_number('OFFICE')`.
2.  **Frontend:**
    *   Update form to include "With Invoice" toggle and File Upload, identical to Trip Expense.

## 5. Tasks

- [ ] **1. Backend Logic**
    - [ ] Ensure `custom_id` generation supports 'OFFICE' type.
- [ ] **2. Frontend Logic**
    - [ ] Implement `AddOfficeExpenseModal` with new fields.
    - [ ] Update List View to show `document_number`.
