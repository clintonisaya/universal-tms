# Story 1.5: Driver Registry Management

**Epic:** 1 - System Foundation & Asset Registry
**Story Key:** 1-5-driver-registry-management
**Status:** review

## 1. User Story

**As a** Fleet Manager,
**I want** to register verified drivers,
**So that** they can be assigned to trips.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Register Driver
**Given** I am a Fleet Manager
**When** I submit the "New Driver" form with:
    - Name: "John Doe"
    - License: "DL-998877"
    - Phone: "+254700000000"
**Then** the driver is saved
**And** default status is "Active"

### Scenario 2: Listing
**Given** multiple drivers exist
**When** I view the Driver Registry
**Then** I see all drivers with their current status (Active/On Trip)

## 3. Technical Requirements

### 🏗️ Architecture & Stack
*   **Backend:** `Driver` SQLModel.
*   **Frontend:** `ProTable` for listing.

### 🛠️ Data Model
```python
class Driver(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    full_name: str
    license_number: str = Field(unique=True)
    phone_number: str
    status: str = Field(default="Active") # Active, On Trip, Inactive
```

### 📂 File Structure
*   `backend/app/models/driver.py`
*   `backend/app/api/endpoints/drivers.py`
*   `frontend/src/app/fleet/drivers/page.tsx`

## 4. Implementation Guide

1.  **Backend:**
    *   CRUD Endpoints.
2.  **Frontend:**
    *   Similar UI pattern to Truck Registry for consistency.

## 5. Tasks

- [x] Backend: Define `Driver` SQLModel in `backend/app/models/driver.py` <!-- id: 0 -->
- [x] Backend: Create Migration for Driver table <!-- id: 1 -->
- [x] Backend: Implement CRUD logic in `backend/app/api/endpoints/drivers.py` <!-- id: 2 -->
- [x] Backend: Add Router to `backend/app/main.py` <!-- id: 3 -->
- [x] Backend: Write tests for Driver endpoints <!-- id: 4 -->
- [x] Frontend: Define Driver Type definitions <!-- id: 5 -->
- [x] Frontend: Create Driver List Page `frontend/src/app/fleet/drivers/page.tsx` <!-- id: 6 -->
- [x] Frontend: Implement Create Driver ModalForm <!-- id: 7 -->
- [ ] Manual Verification: Validates Scenarios 1 & 2 <!-- id: 8 -->

## 6. Dev Agent Record

### Implementation Notes
- **Driver Model:** Added to `backend/app/models.py` with DriverStatus enum, DriverBase/Create/Update/Public models
- **Migration:** Created `2fbe05ddd438_add_driver_table.py` with unique index on `license_number`
- **CRUD Endpoints:** Full CRUD in `backend/app/api/routes/drivers.py` with duplicate license prevention
- **Tests:** 10 comprehensive tests covering AC Scenarios 1 & 2
- **Frontend:** Ant Design Table with sorting/filtering, Create/Edit modals, Delete with confirmation

### Decisions Made
- Used existing project pattern of single `models.py` file
- Used UUID for driver id (consistent with other models)
- Added license number normalization (remove spaces, uppercase) for duplicate detection
- UI matches Truck Registry pattern for consistency

### Test Results
- All 95 backend tests pass (10 new driver tests)
- Frontend builds successfully

## 7. File List

### New Files
- `backend/app/api/routes/drivers.py` - CRUD endpoints for drivers
- `backend/app/alembic/versions/2fbe05ddd438_add_driver_table.py` - Migration
- `backend/tests/api/routes/test_drivers.py` - API tests
- `backend/tests/utils/driver.py` - Test utilities
- `frontend/src/types/driver.ts` - TypeScript type definitions
- `frontend/src/app/fleet/drivers/page.tsx` - Driver list page with CRUD modals

### Modified Files
- `backend/app/models.py` - Added Driver, DriverStatus, DriverBase, DriverCreate, DriverUpdate, DriverPublic, DriversPublic
- `backend/app/api/main.py` - Added drivers router
- `backend/tests/conftest.py` - Added Driver to cleanup

## 8. Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-26 | Initial implementation of Driver Registry Management | Dev Agent |
