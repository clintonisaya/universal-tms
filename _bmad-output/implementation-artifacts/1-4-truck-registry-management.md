# Story 1.4: Truck Registry Management

**Epic:** 1 - System Foundation & Asset Registry
**Story Key:** 1-4-truck-registry-management
**Status:** review

## 1. User Story

**As a** Fleet Manager,
**I want** to register physical trucks in the system,
**So that** they can be selected for trips.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Register New Truck
**Given** I am a Fleet Manager
**When** I submit the "New Truck" form with:
    - Plate: "KCB 123A"
    - Make: "Mercedes"
    - Model: "Actros"
    - Status: "Idle"
**Then** the truck is saved to the database
**And** it appears in the Table List

### Scenario 2: Prevent Duplicates
**Given** "KCB 123A" exists
**When** I try to register another truck with "KCB 123A"
**Then** I get an error "Truck with this plate already exists"

## 3. Technical Requirements

### 🏗️ Architecture & Stack
*   **Backend:** `Truck` SQLModel with unique constraint on `plate_number`.
*   **Frontend:** `ProTable` (Ant Design Pro) for listing, `ModalForm` for creation.

### 🛠️ Data Model
```python
class Truck(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    plate_number: str = Field(unique=True, index=True)
    make: str
    model: str
    status: str = Field(default="Idle") # Idle, In Transit, Maintenance
```

### 📂 File Structure
*   `backend/app/models/truck.py`
*   `backend/app/api/endpoints/trucks.py`
*   `frontend/src/app/fleet/trucks/page.tsx`

## 4. Implementation Guide

1.  **Backend:**
    *   Standard CRUD Endpoints (`GET /trucks`, `POST /trucks`, `GET /trucks/{id}`, `PATCH /trucks/{id}`).
2.  **Frontend:**
    *   Use `ProTable<Truck>` for a high-density view.
    *   Columns: Plate, Make, Model, Status (Tag colored: Green for Idle, Blue for Transit).

## 5. Tasks

- [x] Backend: Define `Truck` SQLModel in `backend/app/models/truck.py` <!-- id: 0 -->
- [x] Backend: Create Migration for Truck table <!-- id: 1 -->
- [x] Backend: Implement CRUD logic in `backend/app/api/endpoints/trucks.py` <!-- id: 2 -->
- [x] Backend: Add Router to `backend/app/main.py` <!-- id: 3 -->
- [x] Backend: Write tests for Truck endpoints <!-- id: 4 -->
- [x] Frontend: Define Truck Type definitions <!-- id: 5 -->
- [x] Frontend: Create Truck List Page `frontend/src/app/fleet/trucks/page.tsx` <!-- id: 6 -->
- [x] Frontend: Implement Create Truck ModalForm <!-- id: 7 -->
- [ ] Manual Verification: Validates Scenarios 1 & 2 <!-- id: 8 -->

## 6. Dev Agent Record

### Implementation Notes
- **Truck Model:** Added to `backend/app/models.py` following existing project patterns (UUID for id, TruckStatus enum, TruckBase/Create/Update/Public models)
- **Migration:** Created `244dbc198b96_add_truck_table.py` with unique index on `plate_number`
- **CRUD Endpoints:** Full CRUD in `backend/app/api/routes/trucks.py` with duplicate plate prevention
- **Tests:** 10 comprehensive tests covering AC Scenarios 1 & 2, plus CRUD operations
- **Frontend:** Ant Design Table with sorting/filtering, Modal form for truck creation

### Decisions Made
- Used existing project pattern of single `models.py` file instead of separate `models/truck.py`
- Used UUID for truck id (consistent with User/Item models) instead of int from story spec
- Added TruckStatus enum for type safety (Idle, In Transit, Maintenance)
- Used standard Ant Design Table instead of ProTable (not installed in project)

### Test Results
- All 83 backend tests pass (10 new truck tests)
- Frontend builds successfully

## 7. File List

### New Files
- `backend/app/api/routes/trucks.py` - CRUD endpoints for trucks
- `backend/app/alembic/versions/244dbc198b96_add_truck_table.py` - Migration
- `backend/tests/api/routes/test_trucks.py` - API tests
- `backend/tests/utils/truck.py` - Test utilities
- `frontend/src/types/truck.ts` - TypeScript type definitions
- `frontend/src/app/fleet/trucks/page.tsx` - Truck list page with create modal

### Modified Files
- `backend/app/models.py` - Added Truck, TruckStatus, TruckBase, TruckCreate, TruckUpdate, TruckPublic, TrucksPublic
- `backend/app/api/main.py` - Added trucks router
- `backend/tests/conftest.py` - Added Truck to cleanup
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Status updated

## 8. Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-26 | Initial implementation of Truck Registry Management | Dev Agent |
