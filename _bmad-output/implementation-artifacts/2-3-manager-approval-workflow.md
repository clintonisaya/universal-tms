# Story 2.3: Manager Approval Workflow (The Gate)

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-3-manager-approval-workflow
**Status:** ready-for-dev

## 1. User Story

**As a** General Manager,
**I want** to approve, return, or reject expense requests,
**So that** I can control costs.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Approve
**Given** I see a "Pending Manager" request
**When** I click "Approve"
**Then** the status changes to "Pending Finance"
**And** it disappears from my immediate todo list (or moves to 'Approved' tab)

### Scenario 2: Return with Comment
**Given** I see a request that needs clarification
**When** I click "Return"
**And** I enter comment: "Attach Receipt please"
**Then** the status changes to "Returned"
**And** the comment is saved

### Scenario 3: Bulk Action
**Given** 5 pending requests
**When** I select all and click "Batch Approve"
**Then** all 5 status update to "Pending Finance"

## 3. Technical Requirements

### 🏗️ Architecture & Stack
*   **Backend:** Bulk Update Endpoint `PATCH /expenses/batch`.
*   **Frontend:** The "WakaWaka" Table (ProTable) with `rowSelection`.

### 📂 File Structure
*   `backend/app/api/endpoints/expenses.py` (Add approval logic/permissions).
*   `frontend/src/app/manager/approvals/page.tsx`.

## 4. Implementation Guide

1.  **Frontend (The WakaWaka Table):**
    *   Use `ProTable` with columns: ID, Date, Requester, Category, Amount, Status.
    *   Filters: `status="Pending Manager"`.
    *   Actions: Approve (Green), Reject (Red), Return (Orange).
    *   On Return/Reject, pop up a Modal to ask for the `comment`.
