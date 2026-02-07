# Story 2.15: Expense Audit Trail & History

Status: ready-for-dev

## Story

As an **Administrator or Finance Manager**,
I want to **view the full history of an expense application, including who initiated, approved, and paid it**,
so that **I have a transparent audit trail and completed applications are clearly organized at the bottom or in a separate view.**

## Acceptance Criteria

1.  **Completed Applications Retention**:
    *   Completed (Status: "Paid") applications must remain accessible in the system.
    *   **Sorting**: In the default "Expenses" list, ensure "Paid" and "Rejected" items appear at the bottom, or confirm they are sorted by Date (Newest first) but can be filtered. *User preference interpretation*: "Stay at the bottom" implies either sorting order or a separate grouping.
    *   **Recommendation**: Implement a default sort order of `Status Priority (Pending > Paid/Rejected)` OR add a "Show Completed" toggle/tab to separate active from historical data to keep the view clean. (Let's go with **Tabs**: "Active" vs "History/All" for better UX).

2.  **Audit Trail Visualization ("View Button")**:
    *   Add a **"View History"** (or generic "View Details") button to the Actions column in the Expenses table for ALL expenses (not just trips).
    *   Clicking this opens a **Details Modal** or Drawer showing:
        *   **Header**: Expense Type, Amount, Current Status.
        *   **Timeline/Flow**: A vertical step-progress visualization showing:
            1.  **Initiated**: Created by {User} on {Date}.
            2.  **Manager Approval**: Approved (or Pending) by {Manager Name} on {Date}.
            3.  **Finance Payment**: Paid by {Finance User} on {Date} with Method {Method}.
    *   If "Rejected", show who rejected it and the reason (Manager Comment).

3.  **Data Persistence**:
    *   Ensure the backend `ExpenseRequest` model tracks `created_by`, `paid_by`, and potentially `approved_by` (if not currently separate, might need to rely on logs or status updates).
    *   *Check*: Current `ExpenseRequest` has `created_by_id`, `paid_by_id`. It *might* miss explicit `approved_by_id` if only status changes.
    *   **Requirement**: Add `approved_by_id` and `approved_at` to the `expenses` table if missing, to accurately track the "Manager" step.

## Tasks / Subtasks

- [ ] **Backend Schema Update**
    - [ ] Update `expenses` table:
        - [ ] Add `approved_by_id` (UUID, nullable).
        - [ ] Add `approved_at` (Timestamp, nullable).
    - [ ] Update `PATCH /expenses/{id}` logic: When status changes to "Pending Finance" (Manager Approval), record the `approved_by` user and timestamp.
    - [ ] Update `GET /expenses/` response to include these auditor details (joined user names).

- [ ] **Frontend: Expense List**
    - [ ] Add "Active" vs "History" (Paid/Rejected) Tabs to `src/app/ops/expenses/page.tsx` or `Select` filter.
    - [ ] Update default Sort order if requested (Active on top).
    - [ ] Add "View History" (Eye icon) button to all rows.

- [ ] **Frontend: History Modal**
    - [ ] Create `ExpenseHistoryModal.tsx`.
    - [ ] Use Ant Design `Steps` or `Timeline` component.
    - [ ] Display the 3-step flow:
        - [ ] **Step 1**: Created (User + Date).
        - [ ] **Step 2**: Manager Approval (User + Date + Comment). Status: Finish/Process/Wait.
        - [ ] **Step 3**: Finance Payment (User + Date + Ref).

## Dev Notes

- **Timeline Logic**:
    - If status == Pending Manager: Step 1 Finish, Step 2 In Progress.
    - If status == Pending Finance: Step 1 & 2 Finish, Step 3 In Progress.
    - If status == Paid: All Finish.
    - If status == Rejected: Step 2 Error/Red.
- **Backend**: You may need to create a simple migration for `approved_by`.

### References
- User Request: "view buttun to track the flow like who initiate, who manager has approve and who finance has pay"
