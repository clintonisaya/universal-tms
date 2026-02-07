# Story 2.19: Trip Expense Master Data

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-19-trip-expense-types
**Status:** ready-for-dev

## 1. User Story

**As an** Ops Manager,
**I want** to manage a standardized list of Trip Expense Types (e.g., "Abnormal Permit", "Police Escort"),
**So that** Ops Officers select valid expenses from a list instead of entering free text, ensuring accurate reporting and cost tracking.

**As a** System,
**I want** to differentiate clearly between Trip Expenses and Office Expenses,
**So that** cost centers are kept distinct and history is maintained separately.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Expense Type Registry (Master Data)
**Given** I am on the "Settings > Trip Expenses" page
**When** I view the list
**Then** I see the standardized expense types (imported from `Trip expense.txt`)
**And** columns include:
*   **Description** (e.g., "Abnormal Permit (Zimbabwe)")
*   **Category** (e.g., "Cargo Charges", "Road Toll")
*   **Status** (Active/Inactive)

### Scenario 2: Selecting Expense during Submission
**Given** I am adding a "Trip Expense" to a Trip
**When** I click "Add Expense"
**Then** I **must select** the "Expense Description" from the Master Data list (Searchable Select)
**And** the "Category" is auto-filled based on the selection
**And** I cannot enter a random free-text description (unless "Other" is selected, if allowed)

### Scenario 3: Initial Data Seeding
**Given** the system is deployed
**Then** the database is pre-populated with the **14+ Categories** and **70+ Items** provided in the user's data file (`Trip expense.txt`).
*(See Technical Requirements for Data Mapping)*

### Scenario 4: Strict Separation
**Given** I am viewing the "Trip Details > Expenses" tab
**Then** I only see expenses linked to that Trip (Category: Trip Related)
**And** I do NOT see Office Expenses
**Given** I am viewing the "Office Expenses" page
**Then** I only see expenses with NO Trip ID
**And** I do NOT see Trip Expenses

## 3. Technical Requirements

### 🏗️ Data Model

```python
class TripExpenseType(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True) # "Abnormal Permit (Zimbabwe)"
    category: str = Field(index=True) # "Cargo Charges"
    is_active: bool = Field(default=True)
    # Optional: default_cost, currency, etc.
```

### 🧱 Integration
*   **ExpenseRequest Model:** Add `expense_type_id` (FK to `TripExpenseType`).
*   **Frontend:**
    *   New Page: `src/app/settings/trip-expenses/page.tsx`
    *   Update `AddExpenseModal`: Replace text input with `Select` fetching from `/api/v1/trip-expense-types`.

### 💾 Seed Data (Extract from `Trip expense.txt`)
*   **Cargo Charges:** Abnormal permit (Mozambique), Escort (Malawi), Police Escort (Zambia), etc.
*   **Driver Allowance:** Driver Hospital Benefits, Overstay Allowance, Driver Allowance.
*   **Transportation Costs-Others:** Radiation Transfer Charge, Carbon Tax Malawi, Council Levy (Lusaka), etc.
*   **Toll Gates:** Toll Gates (Kafulafuta), Zimbabwe Bridge, etc.
*   **Road Toll:** Road Toll (Malawi), Road Toll (Uganda), etc.
*   **Port Fee:** Labour Fee, GPRS, Wire.
*   **Parking Fee:** Parking Fee (Conadesi), Parking Fee (Mokambo).
*   **Council:** Council Levy (Lusaka), Council (Namanga).
*   **Bond:** Bond (Zimbabwe), Bond (Zambia).
*   **Agency Fee:** Agency Fee (Zimbabwe).
*   **Fuel:** Fuel.
*   **CNPR Tax:** CNPR (Copper Return).
*   **Bonus:** Trip Efficiency Bonus.

## 4. Implementation Tasks

- [x] **Backend**
    - [x] Create `TripExpenseType` model
    - [x] Create CRUD API (`/api/v1/trip-expense-types`)
    - [x] Migration: Add table
    - [x] **Seed Script:** Parse `Trip expense.txt` or hardcode list to populate DB on startup/migration.
- [x] **Frontend: Settings**
    - [x] Create `settings/trip-expenses` Management Page
- [x] **Frontend: Ops**
    - [x] Update `AddExpenseModal` to use `TripExpenseType` Select

## 5. Dev Agent Record

### Implementation Notes
- Created `TripExpenseType` model in `backend/app/models.py`
- Created full CRUD API in `backend/app/api/routes/trip_expense_types.py` with:
  - GET list with category and active_only filters
  - GET unique categories endpoint
  - GET by ID, POST create, PATCH update, DELETE
  - POST seed endpoint to populate standard expense types
- Created database migration `b4b37f9228db_add_trip_expense_type_table.py`
- Created TypeScript types in `frontend/src/types/trip-expense-type.ts`
- Created settings page at `frontend/src/app/settings/trip-expenses/page.tsx` with:
  - CRUD operations, search/filter, resizable columns
  - "Seed Data" button to populate standard expense types
- Updated `AddExpenseModal` to:
  - Fetch expense types from API
  - Show searchable grouped dropdown by category
  - Auto-fill description and category on selection
  - Support "Other" option for custom descriptions

### Files Changed
- `backend/app/models.py` - Added TripExpenseType model
- `backend/app/api/routes/trip_expense_types.py` - New CRUD API
- `backend/app/api/main.py` - Registered trip_expense_types router
- `backend/app/alembic/versions/b4b37f9228db_add_trip_expense_type_table.py` - New migration
- `frontend/src/types/trip-expense-type.ts` - New TypeScript types
- `frontend/src/app/settings/trip-expenses/page.tsx` - New settings page
- `frontend/src/components/expenses/AddExpenseModal.tsx` - Updated to use TripExpenseType

### Change Log
- 2026-02-06: Implemented Story 2-19 Trip Expense Master Data (all tasks)
