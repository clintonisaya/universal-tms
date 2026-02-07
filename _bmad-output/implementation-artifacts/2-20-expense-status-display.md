# Story 2.20: Enhanced Expense Status Display (Dual Status)

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-20-expense-status-display
**Status:** ready-for-dev

## 1. User Story

**As an** Admin, Manager, and Ops Officer,
**I want** to see a "Double Status" display for expenses,
**So that** I can distinctly see the Manager's Approval state separate from the Finance Payment state.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Pending Manager (Initial State)
**Given** an expense is `pending_manager`
**Then** I see **Two Badges**:
1.  **Manager:** "Pending" (Blue/Processing)
2.  **Finance:** "Waiting" (Grey/Default) or Hidden

### Scenario 2: Approved by Manager (Pending Finance)
**Given** an expense is `pending_finance`
**Then** I see **Two Badges**:
1.  **Manager:** "Approved" (Green/Success)
2.  **Finance:** "Pending" (Blue/Processing - "Current Color")

### Scenario 3: Paid by Finance (Final State)
**Given** an expense is `paid`
**Then** I see **Two Badges**:
1.  **Manager:** "Approved" (Green/Success)
2.  **Finance:** "Paid" (Green/Success)

### Scenario 4: Exceptions
**Given** an expense is `rejected`
**Then** Manager Badge is "Rejected" (Red)
**Given** an expense is `returned`
**Then** Manager Badge is "Returned" (Orange)

## 3. Technical Requirements

### 🎨 UI Components
*   **Component:** `ExpenseStatusBadge`
*   **Design:** Render two `Tag` components side-by-side (or a composite component).
*   **Logic:**
    ```typescript
    // Example Logic
    const getBadges = (status: string) => {
      if (status === 'pending_manager') return [
        <Tag color="processing">Manager: Pending</Tag>,
        <Tag color="default">Finance: Waiting</Tag>
      ];
      if (status === 'pending_finance') return [
        <Tag color="success">Manager: Approved</Tag>,
        <Tag color="processing">Finance: Pending</Tag>
      ];
      if (status === 'paid') return [
        <Tag color="success">Manager: Approved</Tag>,
        <Tag color="success">Finance: Paid</Tag>
      ];
      // ... handle rejected/returned
    };
    ```

### 📋 Scope
*   Apply this `ExpenseStatusBadge` to:
    *   **Ops > Trip Expenses** Table
    *   **Ops > Office Expenses** Table
    *   **Manager > Approvals** Queue
    *   **Finance > Pending Payments** List
    *   **Trip Detail > Expenses** Tab

## 4. Implementation Tasks

- [x] **Frontend: Components**
    - [x] Create `src/components/expenses/ExpenseStatusBadge.tsx`
    - [x] Implement the "Dual Status" mapping logic
- [x] **Frontend: Integration**
    - [x] Replace text status with `ExpenseStatusBadge` in `RecentTripsTable` (if applicable)
    - [x] Replace in `expenses/page.tsx` (Trip & Office)
    - [x] Replace in `TripDetailDrawer` expense list

## 5. Dev Agent Record

### Implementation Notes
- Created `ExpenseStatusBadge` component showing dual Manager/Finance status badges
- Status mapping:
  - Pending Manager: Manager=Pending(blue), Finance=Waiting(grey)
  - Pending Finance: Manager=Approved(green), Finance=Pending(blue)
  - Paid: Manager=Approved(green), Finance=Paid(green)
  - Rejected: Manager=Rejected(red)
  - Returned: Manager=Returned(orange)
- Supports `compact` prop for smaller displays (uses "M:" and "F:" labels)
- Integrated into all expense tables across the application

### Files Changed
- `frontend/src/components/expenses/ExpenseStatusBadge.tsx` - New dual status badge component
- `frontend/src/app/ops/expenses/page.tsx` - Updated to use ExpenseStatusBadge
- `frontend/src/app/manager/approvals/page.tsx` - Updated to use ExpenseStatusBadge
- `frontend/src/app/manager/payments/page.tsx` - Updated to use ExpenseStatusBadge
- `frontend/src/app/office-expenses/page.tsx` - Updated to use ExpenseStatusBadge
- `frontend/src/components/trips/TripDetailDrawer.tsx` - Updated to use ExpenseStatusBadge (compact mode)

### Change Log
- 2026-02-06: Implemented Story 2-20 Enhanced Expense Status Display (all tasks)
