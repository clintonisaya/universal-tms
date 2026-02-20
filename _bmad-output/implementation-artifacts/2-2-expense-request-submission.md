# Story 2.2: Expense Request Submission

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-2-expense-request-submission
**Status:** ready-for-dev

## 1. User Story

**As an** Ops Officer,
**I want** to submit expense requests (Fuel, Allowances) linked to a **Specific Trip Number**,
**So that** we can calculate exact profit/loss per trip and group expenses accurately.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Add Expense from Trip Detail (Context Aware)
**Given** I am viewing the details for **Trip #101**
**When** I click "Add Expense"
**Then** the "Trip Number" field is **auto-filled** with "Trip #101"
**And** I cannot change it (or it is locked to ensure accuracy)
**When** I fill the rest (Type: Fuel, Amount: 50k, Invoice: Yes)
**And** Submit
**Then** the expense is linked strictly to Trip #101

### Scenario 2: Add Expense from General Dashboard
**Given** I am on the general "Expenses" page
**When** I click "Add Trip Expense"
**Then** I **must select** an Active Trip from a dropdown (Searchable by Trip Number/Truck)
**When** I select "Trip #101"
**And** Submit
**Then** the expense is linked strictly to Trip #101

### Scenario 3: Validation
**When** I try to submit a "Trip Expense" without a Trip Number
**Then** the system prevents submission
**And** shows error: "Trip Number is required for Trip Expenses"

## 3. Technical Requirements

### 🏗️ Architecture & Stack
*   **Backend:** `ExpenseRequest` model.
    *   **Constraint:** `trip_id` is MANDATORY if category is NOT "Office/Overhead".
*   **Frontend:**
    *   Trip Selector Component (Searchable Select).

### 🛠️ Data Model
```python
class ExpenseRequest(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    document_number: str = Field(unique=True, index=True) # ET512EZD-2026001-001
    trip_id: int | None = Field(foreign_key="trip.id", nullable=True) # Required for Trip Exp
    category: ExpenseCategory # FUEL, ALLOWANCE -> Requires trip_id
    # ...
```

## 4. Implementation Tasks

- [ ] **Backend**
    - [ ] Update `create_expense` validator: If `media_type` is TRIP_RELATED, `trip_id` must be present.
- [ ] **Frontend**
    - [ ] Update `AddExpenseModal` to accept optional `tripId` prop.
    - [ ] If `tripId` is missing, show **Trip Selector** dropdown.
    - [ ] If `tripId` is provided, show it as Read-Only.
