# Story 1.6: Trailer Registry Management

**Epic:** 1 - System Foundation & Asset Registry
**Story Key:** 1-6-trailer-registry-management
**Status:** review

## 1. User Story

**As a** Fleet Manager,
**I want** to register physical trailers in the system,
**So that** they can be paired with trucks for trips.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Register New Trailer
**Given** I am a Fleet Manager
**When** I submit the "New Trailer" form with:
    - Plate: "ZD 4040"
    - Type: "Flatbed"
    - Make: "Hambure"
    - Status: "Idle"
**Then** the trailer is saved to the database
**And** it appears in the Table List

### Scenario 2: Prevent Duplicates
**Given** "ZD 4040" exists
**When** I try to register another trailer with "ZD 4040"
**Then** I get an error "Trailer with this plate already exists"

## 3. Technical Requirements

### Architecture & Stack
*   **Backend:** `Trailer` SQLModel with unique constraint on `plate_number`.
*   **Frontend:** `ProTable` (Ant Design Pro) for listing, `ModalForm` for creation.

### Data Model
```python
class Trailer(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    plate_number: str = Field(unique=True, index=True)
    type: str # Flatbed, Skeleton, Box, Tanker
    make: str
    status: str = Field(default="Idle") # Idle, In Transit, Maintenance
```

### File Structure
*   `backend/app/models/trailer.py`
*   `backend/app/api/endpoints/trailers.py`
*   `frontend/src/app/fleet/trailers/page.tsx`

## 4. Implementation Guide

1.  **Backend:**
    *   Standard CRUD Endpoints (`GET /trailers`, `POST /trailers`, `GET /trailers/{id}`, `PATCH /trailers/{id}`).
2.  **Frontend:**
    *   Use `ProTable<Trailer>` for a high-density view.
    *   Columns: Plate, Type, Make, Status (Tag colored).

## 5. Tasks / Subtasks

- [x] Backend: Create `Trailer` model
    - [x] Define `Trailer` class in `backend/app/models.py`
    - [x] Create migration (`alembic revision --autogenerate`)
- [x] Backend: Create Trailers API
    - [x] Create `backend/app/api/routes/trailers.py`
    - [x] Implement CRUD operations
    - [x] Register router in `backend/app/api/main.py`
- [x] Frontend: Create Trailer Registry Page
    - [x] Create `frontend/src/app/fleet/trailers/page.tsx`
    - [x] Implement `Table` list with filters
    - [x] Implement Create/Edit Modal
- [ ] Manual Verification
    - [ ] Verify creation, listing, and duplicate prevention

## 6. Dev Agent Record

### Implementation Plan
- Followed existing patterns from Truck (Story 1.4) and Driver (Story 1.5) implementations
- Used UUID primary keys consistent with project architecture
- Added TrailerType and TrailerStatus enums for type safety
- Plate number normalization for duplicate detection (case-insensitive, space-normalized)

### Completion Notes
- Backend: Added Trailer models (TrailerBase, TrailerCreate, TrailerUpdate, Trailer, TrailerPublic, TrailersPublic) to `backend/app/models.py`
- Backend: Created Alembic migration `b62df7a91c03_add_trailer_table.py` with unique index on plate_number
- Backend: Created CRUD API in `backend/app/api/routes/trailers.py` with full CRUD operations
- Backend: Registered trailers router in `backend/app/api/main.py`
- Frontend: Created TypeScript types in `frontend/src/types/trailer.ts`
- Frontend: Created Trailer Registry page at `frontend/src/app/fleet/trailers/page.tsx` with Table, Create Modal, Edit Modal
- Tests: Created comprehensive test suite in `backend/tests/api/routes/test_trailers.py` covering all acceptance criteria

### Debug Log
N/A - No issues encountered during implementation

## 7. File List

### New Files
- `backend/app/alembic/versions/b62df7a91c03_add_trailer_table.py`
- `backend/app/api/routes/trailers.py`
- `backend/tests/api/routes/test_trailers.py`
- `backend/tests/utils/trailer.py`
- `frontend/src/types/trailer.ts`
- `frontend/src/app/fleet/trailers/page.tsx`

### Modified Files
- `backend/app/models.py` - Added TrailerStatus, TrailerType enums and Trailer models
- `backend/app/api/main.py` - Registered trailers router

## 8. Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-26 | Initial implementation of Trailer Registry Management | Dev Agent (Amelia) |
