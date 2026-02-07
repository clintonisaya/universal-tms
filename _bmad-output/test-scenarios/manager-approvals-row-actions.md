# Test Scenario: Manager Expense Approval Actions

**Epic:** 2 - Core Logistics Cycle
**Story:** 2-3 Manager Approval Workflow & 2-18 Standardize Tables
**Component:** ApprovalsPage (`/manager/approvals`)

## Scenario: Manager approves expense via row action

**Description:**
Verify that a Manager can approve a pending expense directly from the table row actions without needing to select the row first.

**Prerequisites:**
- User is logged in as a Manager (`role: manager`).
- At least one expense exists with status `Pending Manager`.

**Steps:**
1. Navigate to `/manager/approvals`.
2. Locate a row with status `Pending Manager`.
3. Hover over the row.
4. **Verify:** Action buttons (Approve, Reject, Return) become visible in the last column.
5. Click the "Approve" button.
6. **Verify:** The expense status updates to `Pending Finance`.
7. **Verify:** The expense disappears from the "Pending Manager" list (or updates status if filter allows).

**Expected Result:**
- Row actions are present and functional.
- Bulk actions are NOT required for single-item processing.

**Current Status:**
- [x] Defined
- [ ] Automated
- [ ] Passing (Currently FAILING: Actions column missing)
