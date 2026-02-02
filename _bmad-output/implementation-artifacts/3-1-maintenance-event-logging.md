# Story 3.1: Maintenance Event Logging

**Epic:** 3 - Maintenance & Office Overheads
**Story Key:** 3-1-maintenance-event-logging
**Status:** ready-for-dev

## 1. User Story

**As a** Fleet Manager,
**I want** to log maintenance events and their costs,
**So that** I can track the total cost of ownership for each truck.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Log Maintenance
**Given** I am a Fleet Manager
**When** I submit a "New Maintenance Record" with:
    - Truck: "KCB 123A"
    - Garage: "AutoXpress"
    - Cost: 15,000
    - Description: "Oil Change"
**Then** a `MaintenanceEvent` is created
**And** an associated `ExpenseRequest` is created (Category="Maintenance")
**And** the Expense Status is "Pending Manager"

### Scenario 2: Truck Status Update
**Given** functionality to set truck status
**When** I create a major maintenance event
**Then** I can optionally set the Truck Status to "Maintenance" (unavailable for trips)

## 3. Technical Requirements

### 🏗️ Architecture & Stack
*   **Backend:** `MaintenanceEvent` model linked to `Truck` and `ExpenseRequest`.
*   **Frontend:** Maintenance Module.

### 🛠️ Data Model
```python
class MaintenanceEvent(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    truck_id: int = Field(foreign_key="truck.id")
    expense_id: int = Field(foreign_key="expenserequest.id")
    start_date: datetime
    end_date: datetime | None = None
    garage_name: str
    description: str
```

### 📂 File Structure
*   `backend/app/models/maintenance.py`
*   `backend/app/api/endpoints/maintenance.py`
*   `frontend/src/app/fleet/maintenance/new/page.tsx`

## 4. Implementation Guide

1.  **Backend:**
    *   The `Create Maintenance` endpoint must also create the `ExpenseRequest` in the same transaction.
2.  **Frontend:**
    *   Form should look similar to Trip Expense, but selecting a Truck instead of a Trip.
