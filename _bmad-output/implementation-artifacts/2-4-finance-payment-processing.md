# Story 2.4: Finance Payment Processing

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-4-finance-payment-processing
**Status:** ready-for-dev

## 1. User Story

**As a** Finance Officer,
**I want** to mark expense requests as paid using either Cash or Transfer,
**So that** funds are officially released and the transaction is recorded.

## 2. Acceptance Criteria (BDD)

### Scenario 1: View Payment Details via ID
**Given** I am a Finance Officer viewing the "Pending Finance" list
**When** I see the list of expenses
**Then** I see the **Unique Document ID** (e.g., `OFF-EXP-2026-001`) for each item
**When** I click the ID
**Then** a modal/drawer opens showing the full details (including Invoice Attachment)

### Scenario 2: Process Cash Payment
**Given** I am a Finance Officer viewing a "Pending Finance" expense request
**When** I click the "Pay" button
**And** I select "Cash" as the payment method
**Then** the expense status updates to "Paid"
**And** the `payment_method` is recorded as "CASH"

### Scenario 3: Process Transfer Payment
**Given** I am viewing the Payment Modal
**When** I select "Transfer"
**And** I enter a valid "Reference Number"
**Then** the expense is paid and ref number saved

## 3. Technical Requirements

### 🏗️ Architecture & Stack
*   **Backend:** FastAPI (Python) - `PATCH /api/v1/expenses/{id}/payment`
*   **Frontend:** `ProTable` with clickable ID column.

### 4. Implementation Tasks

- [ ] **Backend**
    - [ ] Update Payment Endpoint.
- [ ] **Frontend**
    - [ ] Update Finance Dashboard Columns to include `document_number` (Clickable).
    - [ ] Add Viewer for Expense Details + Attachment.
    - [ ] Implement Payment Modal (Cash/Transfer).
