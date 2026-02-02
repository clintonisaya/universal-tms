# Story 2.5: Voucher Printing

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-5-voucher-printing
**Status:** ready-for-dev

## 1. User Story

**As a** Finance Officer,
**I want** to print a payment voucher for any paid expense,
**So that** we have physical evidence of the transaction with the Company Name and unique ID clearly visible.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Print Availability
**Given** an expense is "Pending Finance"
**Then** the "Print Voucher" button is Disabled (Greyed out)
**When** the expense status is "Paid"
**Then** the "Print Voucher" button is Active

### Scenario 2: Voucher Content
**When** I click "Print Voucher"
**Then** a printable page opens (A5 landscape optimized)
**And** the Header prominently displays **"Africa Wakawaka Logistics Co. Limited"** (Company Name)
**And** it displays the **Unique Document ID** (e.g., `OFF-EXP-2026-001`)
**And** it shows the Payment Details:
    - Amount Paid
    - Payment Method (Cash/Transfer)
    - Payment Date
    - Payee / Requester
    - Description/Remarks
**And** it shows the "Paid By" Finance Officer's name

## 3. Technical Requirements

### 🏗️ Architecture & Stack
*   **Frontend-only Print**: Use CSS `@media print` styles.
*   **Route**: `/finance/vouchers/[id]/page.tsx`
*   **Layout**: Simple, clean, high-contrast black & white for dot-matrix/laser compatibility.

### 4. Implementation Guide

1.  **UI Component**: `VoucherTemplate.tsx`
    *   **Header**: `<h1>Africa Wakawaka Logistics Co. Limited</h1>` (Centered, Uppercase).
    *   **Sub-Header**: `<h3>Payment Voucher</h3>`
    *   **Grid**: Key-Value pairs for Document Number, Date, Amount, etc.
    *   **Footer**: "Authorized Signature: _________________"

## 5. Tasks

- [ ] **Frontend Implementation**
    - [ ] Create `/finance/vouchers/[id]/page.tsx` to fetch expense details.
    - [ ] Design `VoucherTemplate` with CSS Print styles.
    - [ ] Ensure Company Name is hardcoded/configurable as the primary header.
    - [ ] Test printing functionality (verify Company Name and ID appear).
