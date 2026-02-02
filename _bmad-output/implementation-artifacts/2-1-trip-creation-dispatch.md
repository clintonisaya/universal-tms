# Story 2.1: Trip Creation & Dispatch

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-1-trip-creation-dispatch
**Status:** review

## 1. User Story

**As an** Ops Officer,
**I want** to create and dispatch a new trip with a specific truck and trailer,
**As an** Ops Officer,
**I want** to create and dispatch a new trip with a specific truck and trailer,
**So that** the cargo can be transported and revenue generation begins.

**As an** Ops Manager,
**I want** trip numbers to follow a standardized format `T<TruckPlate>-<Year><Sequence>` (e.g., `T512EDF-2026001`),
**So that** we can easily identify trips by truck and year, with sequences resetting annually.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Create Trip
**Given** I am on the "New Trip" page (NOT a modal)
**When** I select:
    - Truck: "KCB 123A" (Must be Status: Idle or Offloaded)
    - Trailer: "ZD 4040" (Must be Status: Idle or Offloaded)
    - Driver: "John Doe" (Must be Status: Active)
    - Route: "Mombasa - Nairobi"
**And** I click "Dispatch"
**Then** a new Trip is created with Status "Loading"
**And** the Trip Number is generated automatically (e.g., "TKCB123A-2026001")
**And** the Truck Status updates to "Loading"
**And** the Trailer Status updates to "Loading"
**And** the Driver Status updates to "Assigned"

### Scenario 2: Validation
**Given** Truck "KCB 123A" is already "In Transit"
**When** I try to assign it to a new trip
**Then** I see an error "Truck is not available"
**And** the trip is NOT created

## 3. Technical Requirements

### 🏗️ Architecture & Stack
*   **Backend:** `Trip` SQLModel. Relationship to `Truck` and `Driver`.
*   **Database:** Transactional integrity is critical (Trip create + Truck update).
*   **Frontend:** `ProForm` with `ProFormSelect` fetching available trucks/drivers.

### 🛠️ Data Model
```python
class TripStatus(str, Enum):
    LOADING = "Loading"
    IN_TRANSIT = "In Transit"
    AT_BORDER = "At Border"
    OFFLOADED = "Offloaded"
    RETURNED = "Returned"
    WAITING_FOR_PODS = "Waiting for PODs"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class Trip(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    truck_id: int = Field(foreign_key="truck.id")
    trailer_id: int = Field(foreign_key="trailer.id")
    driver_id: int = Field(foreign_key="driver.id")
    route_name: str
    waybill_id: int | None = Field(default=None, foreign_key="waybill.id") # Link to commercial Waybill
    current_location: str | None = Field(default=None) # E.g., "Mlolongo", "Tunduma Border"
    trip_number: str = Field(index=True, unique=True) # Format: T<TruckPlate>-<Year><Sequence>
    status: TripStatus = Field(default=TripStatus.LOADING)
    pod_documents: List[str] = Field(default=[], sa_column=Column(JSON)) # List of S3 URLs
    start_date: datetime = Field(default_factory=datetime.utcnow)
    end_date: datetime | None = None
```

### 📋 Status Definitions

| Status | Description | User Action |
| :--- | :--- | :--- |
| **Loading** | Trip created, truck is loading cargo at origin. | Trip Created |
| **In Transit** | Truck has left origin, en route to destination. | Driver/Ops updates status |
| **At Border** | Truck is at a border crossing (customs/clearance). | Driver/Ops updates status |
| **Offloaded** | Cargo offloaded at destination. | Driver/Ops updates status |
| **Returned** | Truck has returned to yard or is empty. | Driver/Ops updates status |
| **Waiting for PODs** | Delivery done, waiting for POD document upload. | System/Ops updates triggers |
| **Completed** | PODs verified, trip cycle finished. | Ops approves PODs |
| **Cancelled** | Trip aborted. | Ops cancels |

### 📄 POD Requirements
*   **Upload Limit:** Max 5MB per file.
*   **Format:** PDF, JPG, PNG.
*   **Storage:** S3 or Blob Storage (URLs stored in DB).

### 🛠️ Truck Swap / Breakdown Handling
*   **Requirement:** Allow changing the assigned Truck (or Trailer) during an active trip.
*   **Mechanism:** Update `truck_id` on the `Trip` record.
*   **Trip Number:** The Trip Number remains unchanged even if the truck is swapped. Ideally, the Trip Number reflects the *originating* truck.

### 🔢 Trip Number Generation Logic
*   **Format:** `T{TruckPlateSanitized}-{Year}{Sequence}`
    *   `TruckPlateSanitized`: Truck Plate with spaces removed / specialized format (e.g. `T512 EDF` -> `T512EDF`).
    *   `Year`: Current Year (YYYY).
    *   `Sequence`: 3-digit number (001, 002...) resetting every year.
*   **Implementation:**
    *   Need a mechanism to track the last sequence used for a given year.
    *   Could use a `TripSequence` table or `SELECT MAX(trip_number)` logic (with locking/atomic increment).
    *   Reset logic: If Year changes, sequence starts at 001.

### 📂 File Structure
*   `backend/app/models/trip.py`
*   `backend/app/models/trailer.py`
*   `backend/app/api/endpoints/trips.py`
*   `frontend/src/app/ops/trips/new/page.tsx`

## 4. Implementation Guide

1.  **Backend:**
    *   Use `session.exec()` inside a transaction block to ensure Trip Creation and Truck Status Update happen together.
    *   **Synchronized Status:** Any status change to the **Truck** MUST be propagated to the attached **Trailer**.
    *   **Trip Number Generation:** Implement a service/utility to generate the ID atomically.
2.  **Frontend:**
    *   **Navigation:** The "New Trip" button must be on the main Trips list page.
    *   **Sidebar:** REMOVE "New Trip" from the sidebar menu. It should only be accessible via the "New Trip" button on the Trips page.
    *   **Layout:** When clicked, it should navigate to `/ops/trips/new` (Dedicated Page).
    *   **Constraint:** Do NOT use a modal/submodal. This must be a full page form.
    *   **Trips List:** The main table MUST display the **Trip Number** as the first column.
    *   The "Truck" dropdown should filters for `status == "Idle"` or `status == "Offloaded"`.
    *   The "Trailer" dropdown should filters for `status == "Idle"` or `status == "Offloaded"`.
    *   The "Driver" dropdown should filters for `status == "Active"`.

## 5. Tasks / Subtasks

- [x] Backend: Create `Trailer` model
    - [x] Define `Trailer` class in `backend/app/models/trailer.py` (Note: Already existed from Story 1.6)
    - [x] Define status field (Idle, Loading, In Transit, etc.) - Extended TrailerStatus enum
- [x] Backend: Create `Trip` model
    - [x] Define `Trip` class in `backend/app/models.py` with relationships to Truck, Trailer, and Driver
    - [x] Ensure foreign keys match existing `Truck`, `Trailer` and `Driver` models (using UUID)
- [x] Backend: Create Trips API
    - [x] Create `backend/app/api/routes/trips.py`
    - [x] Implement `POST /` endpoint for creating a trip
    - [x] Implement `PUT /{id}/swap-truck` (or generic update) to handle Breakdown/Truck Change (Update `truck_id`, set old truck 'Idle'/'Broken', new truck 'In Transit')
    - [x] Use transaction (`with session.begin():`) to ensure atomicity:
        - [x] Create new Trip record (Status: Loading)
        - [x] Update Truck status to 'Loading'
        - [x] Update Trailer status to 'Loading'
        - [x] Update Driver status to 'Assigned'
    - [x] Add validation to ensure Truck/Trailer is 'Idle' or 'Offloaded' and Driver is 'Active'
    - [x] Register new router in `backend/app/api/main.py`
- [x] Frontend: Create New Trip Page
    - [x] Create `frontend/src/app/ops/trips/new/page.tsx`
    - [x] Use Ant Design Form for the layout (consistent with existing codebase)
    - [x] Implement Select for Truck selection (fetch 'Idle' and 'Offloaded')
    - [x] Implement Select for Trailer selection (fetch 'Idle' and 'Offloaded')
    - [x] Implement Select for Driver selection (fetch only 'Active')
    - [x] Add Input for Route Name
    - [x] Add Note: POD Upload logic will be handled in "Trip Completion" story (Status: Waiting for PODs).
    - [x] Wiring: Connect form submission to `POST /api/v1/trips`
- [ ] Refactor: Trip Number Implementation
    - [ ] Database: Migration to add `trip_number` column to `Trip` table (unique, not null)
    - [ ] Backend: Implement `generate_trip_number` logic (T<Plate>-YYYY<Seq>) with year reset
    - [ ] Backend: Update `POST /trips` to use generator
    - [ ] Backend: Add `waybill_id` FK and `current_location` to `Trip` table
    - [ ] Backend: Update Trip creation endpoint to accept `waybill_id` matches
- [ ] Refactor: Frontend UI
    - [ ] Ensure `New Trip` button is prominent on Trips List
    - [ ] **Remove** "New Trip" from the sidebar navigation configuration
    - [ ] Add `Trip Number` column to the Trips List table
    - [ ] Verify `New Trip` is a full page navigation, not a modal
- [ ] Manual Verification
    - [ ] Start backend and frontend
    - [ ] Create a Trip via UI and verify:
        - [ ] Trip appears in database (Status: Loading)
        - [ ] Truck status becomes 'Loading' in database
        - [ ] Trailer status becomes 'Loading' in database
        - [ ] Driver status becomes 'Assigned' in database
    - [ ] Attempt to assign an 'In Transit' truck to a new trip and verify error

## 6. Dev Agent Record

### Implementation Plan
- Extended existing status enums (TruckStatus, TrailerStatus, DriverStatus) to include trip-related statuses
- Created Trip model with SQLModel following existing patterns (UUID primary keys, datetime with timezone)
- Implemented transactional trip creation with synchronized status updates
- Added truck swap functionality for breakdown handling
- Created frontend pages following existing Ant Design patterns

### Debug Log
- Trailer model already existed from Story 1.6 - only needed status enum extension
- Used existing codebase pattern (single models.py file) instead of separate model files
- Adjusted swap-truck endpoint to use body parameter instead of query parameter

### Completion Notes
- All backend models and API endpoints implemented
- Frontend pages created for trip list and new trip creation
- Comprehensive test suite created covering all acceptance criteria
- Database migration created for Trip table and status enum updates

## 7. File List

### New Files
- `backend/app/api/routes/trips.py` - Trip CRUD API endpoints
- `backend/app/alembic/versions/c73d8e91f204_add_trip_table_and_update_statuses.py` - Database migration
- `backend/tests/api/routes/test_trips.py` - Trip API tests
- `backend/tests/utils/trip.py` - Trip test utilities
- `frontend/src/app/ops/trips/page.tsx` - Trips list page
- `frontend/src/app/ops/trips/new/page.tsx` - New trip creation page
- `frontend/src/types/trip.ts` - Trip TypeScript types

### Modified Files
- `backend/app/models.py` - Added Trip model, TripStatus enum, extended other status enums
- `backend/app/api/main.py` - Registered trips router
- `backend/tests/conftest.py` - Added Trip cleanup in test teardown
- `frontend/src/types/truck.ts` - Extended TruckStatus type
- `frontend/src/types/trailer.ts` - Extended TrailerStatus type
- `frontend/src/types/driver.ts` - Extended DriverStatus type

## 8. Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-26 | Initial implementation of Trip Creation & Dispatch | Dev Agent |
