# Story 2.17: Trip Expense ID Formatting

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-17-tripexpense-id-format
**Status:** ready-for-dev

## 1. User Story

**As a** Finance Officer,
**I want** Trip Expenses to carry an ID derived directly from the Trip Number (e.g., `E<TripNumber><Sequence>`),
**So that** I can visually identify which expenses belong to which trip during audits without database lookups.

**As a** System Auditor,
**I want** the sequence count to be unique per trip (starting at 001 for each trip),
**So that** we can track the exact number of voucher/expenses raised per trip.

## 2. Acceptance Criteria (BDD)

### Scenario 1: First Expense for a Trip
**Given** an existing Trip with ID `TDLD937F-2026781`
**And** this trip has 0 existing expenses
**When** I create a new "Fuel" expense for this trip
**Then** the Expense ID is generated as `ETDLD937F-2026781001`
**And** the record is saved.

### Scenario 2: Subsequent Expenses
**Given** Trip `TDLD937F-2026781` already has an expense `ETDLD937F-2026781001`
**When** I create a new "Allowance" expense for the same trip
**Then** the Expense ID is generated as `ETDLD937F-2026781002`

### Scenario 3: Independent Sequencing
**Given** Trip A (`T-A`) has expenses up to `ET-A005`
**And** Trip B (`T-B`) has 0 expenses
**When** I create a new expense for Trip B
**Then** the Expense ID is `ET-B001` (Starting at 001)
**And** it does *not* inherit the sequence from Trip A.

### Scenario 4: Non-Trip Expenses (Context Check)
**Given** I am creating an Office Expense (not linked to a trip)
**When** I submit
**Then** the system uses the standard Expense ID format (e.g., `EXP-YYYY-SEQ`)
**And** does *not* attempt to use the Trip ID pattern.

## 3. Technical requirements

### 🏗️ Architecture & Logic
*   **Pattern:** `E` + `Trip Number` + `3-Digit Padding`.
*   **Logic Location:** `ExpenseService.create` or `ExpenseRequest` model hook.
*   **Concurrency:** Must handle simultaneous submissions for the same trip without duplicate key errors (use database locking or generic auto-increment strategy scoped to trip if possible, though explicit count + lock is safer).

### 🛠️ Data Model
*   `ExpenseRequest` table needs to support this custom ID format.
*   Likely need a `sequence` column on `ExpenseRequest` *or* a query to count existing expenses for the `trip_id` during creation.
    *   *Recommendation:* Query `SELECT count(*) FROM expenses WHERE trip_id = X` inside a transaction to determine next sequence.

## 4. Implementation Tasks

- [ ] **Backend**
    - [ ] Update `create_expense` validator: If `media_type` is TRIP_RELATED, `trip_id` must be present.
    - [ ] If `trip_id` exists:
        - [ ] Fetch the `Trip` to get the `trip_number`.
        - [ ] Calc next sequence: `Count(expenses for trip) + 1`.
        - [ ] Format ID: `E{trip_number}{seq:03d}`.
    - [ ] Ensure formatting handles long Trip Numbers gracefully.
- [ ] **Tests**
    - [ ] Unit Test: Create 3 expenses for Trip A, verify IDs 001, 002, 003.
    - [ ] Unit Test: Create 1 expense for Trip B, verify ID 001.
    - [ ] Unit Test: Verify non-trip expense (Office) uses fallback/standard format.
