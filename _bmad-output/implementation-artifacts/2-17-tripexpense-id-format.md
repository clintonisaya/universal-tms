# Story 2.17: Trip Expense ID Formatting

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-17-tripexpense-id-format
**Status:** completed

## 1. User Story

**As a** Finance Officer,
**I want** Trip Expenses to carry an ID derived directly from the Trip Number (e.g., `ET512EZD-2026001-001`),
**So that** I can visually identify which expenses belong to which trip during audits without database lookups.

**As a** System Auditor,
**I want** the sequence count to be unique per trip (starting at 001 for each trip),
**So that** we can track the exact number of expenses raised for that specific trip.

## 2. Acceptance Criteria (BDD)

### Scenario 1: First Expense for a Trip
**Given** an existing Trip with trip_number `T512EZD-2026001`
**And** this trip has 0 existing expenses
**When** I create a new "Fuel" expense for this trip
**Then** the Expense ID is generated as `ET512EZD-2026001-001`
**And** the record is saved.

### Scenario 2: Subsequent Expenses
**Given** Trip `T512EZD-2026001` already has an expense `ET512EZD-2026001-001`
**When** I create a new "Allowance" expense for the same trip
**Then** the Expense ID is generated as `ET512EZD-2026001-002`

### Scenario 3: Independent Sequencing
**Given** Trip A (`T512EZD-2026001`) has expenses up to `ET512EZD-2026001-005`
**And** Trip B (`T556EDS-2026001`) has 0 expenses
**When** I create a new expense for Trip B
**Then** the Expense ID is `ET556EDS-2026001-001` (Starting at 001)
**And** it starts fresh, independent of Trip A's sequence.

### Scenario 4: Non-Trip Expenses (Office Expenses)
**Given** I am creating an Office Expense (not linked to a trip)
**When** I submit
**Then** the system uses the standard Expense ID format `EX-YYYY-XXXX` (e.g., `EX-2026-0001`)
**And** does *not* attempt to use the Trip ID pattern.

## 3. Technical Requirements

### 🏗️ ID Format Summary

| Expense Type | Format | Example |
|--------------|--------|---------|
| Trip Expense | `E{trip_number}-{seq:03d}` | `ET512EZD-2026001-001` |
| Office Expense | `EX-{year}-{seq:04d}` | `EX-2026-0001` |

### 🔢 Trip Expense ID Logic
1. Get `trip_number` from selected Trip (e.g., `T512EZD-2026001`)
2. Count existing expenses for *this specific trip*
3. `Sequence = Count + 1`
4. Format: `E{trip_number}-{seq:03d}` → `ET512EZD-2026001-001`

### 🔢 Office Expense ID Logic
1. Get current year
2. Find max sequence for `EX-{year}-%` pattern
3. `Sequence = Max + 1` (or 1 if none found)
4. Format: `EX-{year}-{seq:04d}` → `EX-2026-0001`

### 🛠️ Data Model
* `ExpenseRequest.expense_number` stores the generated ID
* Sequence is calculated dynamically at creation time via COUNT query

## 4. Implementation Tasks

- [x] **Backend**
    - [x] Update `create_expense` validator: If category is trip-related (Fuel, Allowance, Maintenance, Border), `trip_id` must be present.
    - [x] If `trip_id` exists:
        - [x] Fetch the `Trip` to get the `trip_number`.
        - [x] Calc next sequence: `Count(expenses for trip) + 1`.
        - [x] Format ID: `E{trip_number}-{seq:03d}`.
    - [x] If no `trip_id` (Office expense):
        - [x] Format ID: `EX-{year}-{seq:04d}`
    - [x] Ensure formatting handles long Trip Numbers gracefully.
- [x] **Tests**
    - [x] Unit Test: Create 3 expenses for Trip A, verify IDs 001, 002, 003.
    - [x] Unit Test: Create 1 expense for Trip B, verify ID 001.
    - [x] Unit Test: Verify non-trip expense (Office) uses `EX-YYYY-XXXX` format.

## 5. Dev Agent Record

### Implementation
- Trip expense ID: `E{trip_number}-{seq:03d}` in `backend/app/api/routes/expenses.py:47`
- Office expense ID: `EX-{year}-{seq:04d}` in `backend/app/api/routes/expenses.py:49-66`
- Per-trip sequence via `COUNT(*)` query inside `generate_expense_number()` function

### Tests Added
- `test_trip_expense_id_sequential_for_same_trip` - AC Scenario 1 & 2
- `test_trip_expense_id_independent_sequencing` - AC Scenario 3
- `test_office_expense_uses_standard_format` - AC Scenario 4

## 6. File List

### Modified Files
- `backend/app/api/routes/expenses.py` - `generate_expense_number()` function
- `backend/tests/api/routes/test_expenses.py` - Added Story 2.17 tests

## 7. Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-02-10 | Fixed office expense format from `EXP-` to `EX-` | Dev Agent |
| 2026-02-10 | Added unit tests for all 4 acceptance criteria scenarios | Dev Agent |
| 2026-02-10 | Updated story with correct format examples | Dev Agent |
