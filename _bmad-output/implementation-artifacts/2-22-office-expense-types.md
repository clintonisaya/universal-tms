# Story 2.22: Office Expense Types & Trip Linkage Enforcement

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-22-office-expense-types
**Status:** review

## 1. User Story

**As an** Admin or Finance Officer,
**I want** to manage a master list of "Office Expense Types" (e.g., Rent, Utilities, Stationery),
**So that** office expense reporting is standardized and consistent.

**As a** System,
**I want** to strictly enforce that "Trip Expenses" (Fuel, Border, Allowance) are always linked to a Trip ID,
**So that** all direct transport costs are correctly allocated to trips for profitability analysis.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Managing Office Expense Types
**Given** I am an Admin/Finance user
**When** I navigate to Settings > Finance > Office Expense Types
**Then** I can View, Add, Edit, and Disable office expense types (e.g., "Office Rent", "Internet", "Staff Welfare").

### Scenario 2: Selecting Office Expense Types
**Given** I am creating an "Office Expense" application (Story 2.21)
**When** I add a new item
**Then** I can select from the active "Office Expense Types".

### Scenario 3: Trip Expense Validation (Backend)
**Given** I submit an expense with category "Fuel", "Allowance", "Border", or "Maintenance"
**And** I do NOT provide a valid `trip_id`
**Then** The system should reject the request with an error: "Trip ID is required for trip-related expenses".

### Scenario 4: Office Expense Validation (Backend)
**Given** I submit an expense with category "Office"
**Then** `trip_id` is Optional (or ignored/nullified).

## 3. Technical Requirements

### 🏗️ Backend
*   **New Model**: `OfficeExpenseType`
    *   Fields: `id` (UUID), `name` (String, Unique), `description` (Optional), `is_active` (Bool).
    *   Table: `office_expense_type`
*   **New API Endpoints**:
    *   `GET /api/v1/office-expense-types/`
    *   `POST /api/v1/office-expense-types/`
    *   `PATCH /api/v1/office-expense-types/{id}`
    *   `DELETE /api/v1/office-expense-types/{id}`
*   **Validation Logic**:
    *   Update `ExpenseRequest` create/update logic.
    *   Define "Trip Categories": `[Fuel, Allowance, Border, Maintenance]`.
    *   If `category` in Trip Categories => `trip_id` REQUIRED.

### 🎨 Frontend
*   **Settings Page**: Create `src/app/settings/finance/office-expenses/page.tsx` (using standard Table pattern).
*   **Integration**: Update `AddExpenseModal.tsx` to fetch `OfficeExpenseTypes` when in "Office" mode (or generic mode).

## 4. Implementation Tasks

- [ ] **Backend: Office Expense Master Data**
    - [ ] Define `OfficeExpenseType` model in `models.py`.
    - [ ] Create CRUD endpoints in `api/v1/endpoints/office_expense_types.py`.
    - [ ] Register router in `api_v1/api.py`.
    - [ ] Run migration (if applicable, or `alembic` setup).
- [ ] **Backend: Validation Logic**
    - [ ] Update `create_expense` service/route to check `trip_id` vs `category`.
- [ ] **Frontend: Settings Page**
    - [ ] Create `OfficeExpenseTypesPage` in Settings.
- [ ] **Frontend: Integration**
    - [ ] Update `AddExpenseModal` to use `OfficeExpenseType` for selection when applicable.

## 5. Dev Agent Record

### Implementation Plan
- **Strategy**: Implement distinct `OfficeExpenseType` master data to separate office expenses from trip expenses. Update validation to enforce trip linkage only for trip-related categories.
- **Key Components**:
    - **Backend**: `OfficeExpenseType` model, CRUD router, and updated validation in `expenses.py`.
    - **Frontend**: New `OfficeExpenseTypesPage` in Settings, and updated `AddExpenseModal` to fetch appropriate types based on context (Trip vs Office).

### Debug Log
- **Observation**: Need to handle `OfficeExpenseType` in `AddExpenseModal` which previously assumed `TripExpenseType` structure (specifically `category` field).
- **Fix**: Updated `handleItemChange` to check for property existence and default to "Office" category for office expense types.

### Completion Notes
- **Master Data**: Admin can now manage Office Expense Types separately.
- **Validation**: System now enforces Trip ID requirement for Trip Expenses (Fuel, etc.) while allowing Office Expenses to be independent.
- **UI**: Add Expense Modal dynamically adapts to the context.


- **Verification**: Added unit tests for `OfficeExpenseTypesPage`.
