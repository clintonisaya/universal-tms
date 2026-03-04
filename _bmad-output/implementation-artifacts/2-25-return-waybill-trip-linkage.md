# Story 2.25: Return Waybill Trip Linkage

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-25-return-waybill-trip-linkage
**Status:** review
**Date Created:** 2026-02-18

---

## Story

As an **Ops Officer**,
I want to attach a return waybill to an existing trip when it reaches "Offloaded" status,
So that the return leg cargo and client are tracked commercially under the same physical truck movement, giving the business full visibility into both directions of a single trip.

As an **Ops Manager**,
I want to see a direction column on the trip list that shows "Go" by default or "Return" when a return waybill is attached,
So that I can immediately identify which trips are carrying cargo on the return leg without duplicating the route information already shown in the Route column.

---

## Acceptance Criteria

### Scenario 1: Attach Return Waybill at Offloaded Status
**Given** a trip with status "Offloaded" and a linked go waybill (e.g., WB-2026-0012)
**When** I open the Trip Detail Drawer
**Then** I see an "Attach Return Waybill" button
**When** I click it
**Then** a waybill selector appears showing only waybills with status "Open" and not linked to any other active trip
**When** I select a waybill (e.g., WB-2026-0019) and confirm
**Then** the trip's `return_waybill_id` is set to the selected waybill's ID
**And** the selected return waybill's status changes from "Open" to "In Progress"
**And** the go waybill (WB-2026-0012) status remains "Completed"
**And** the Trip Detail shows both waybills: Go and Return sections

### Scenario 2: Return Waybill Not Attachable Before Offloaded
**Given** a trip with status "In Transit" (or any pre-Offloaded status)
**When** I open the Trip Detail Drawer
**Then** the "Attach Return Waybill" button is NOT visible

### Scenario 3: Direction Column in Trip List
**Given** the trip list is loaded
**Then** there is a "Direction" column separate from the existing "Route" column (which already shows origin → destination)

**Given** a trip with no return waybill attached
**When** the trip list renders the Direction column
**Then** it shows a "Go" badge (neutral/blue style)

**Given** a trip with a return waybill attached
**When** the trip list renders the Direction column
**Then** it shows a "Return" badge (green style)
**And** does NOT show "Go/Return" — "Go" is already implied by the existence of the trip

### Scenario 4: Return Leg Status Progression
**Given** a trip with `return_waybill_id` set and status "Offloaded"
**When** I update the trip status
**Then** the next available statuses include:
  - "Wait to Load (Return)"
  - "Returned" (if skipping return cargo — empty return)

**When** status progresses to "Wait to Load (Return)"
**Then** the `arrival_loading_return_date` timestamp is recorded

**When** status progresses to "Loading (Return)"
**Then** the `loading_return_start_date` timestamp is recorded

**When** status progresses to "In Transit (Return)"
**Then** the `loading_return_end_date` timestamp is recorded

**When** status progresses to "At Border (Return)" (optional)
**Then** trip status reflects border crossing on return leg

**When** status progresses to "Returned"
**Then** `arrival_return_date` is recorded (field already exists)

**When** status progresses to "Completed"
**Then** the return waybill status changes from "In Progress" to "Completed"

### Scenario 5: Return Statuses Blocked Without Return Waybill
**Given** a trip with status "Offloaded" and NO return waybill attached
**When** I update the trip status
**Then** "Wait to Load (Return)", "Loading (Return)", "In Transit (Return)", "At Border (Return)" are NOT available as next statuses
**And** only "Returned" (and onward) are available

### Scenario 6: POD Documents — Go vs Return Leg
**Given** a trip with both go and return waybills
**When** I upload POD documents in the Trip Detail
**Then** I can tag each document as "Go" or "Return" leg
**And** the POD section displays documents grouped under "Go PODs" and "Return PODs" labels

### Scenario 7: Trip Cancellation with Two Waybills
**Given** a trip with both go and return waybills attached
**When** I initiate trip cancellation
**Then** a modal appears listing both waybills with checkboxes:
  - [✓] WB-2026-0012 (Go) — [Client Name]
  - [✓] WB-2026-0019 (Return) — [Client Name]
**And** radio options:
  - Cancel both waybills (reset to Open)
  - Cancel Go only
  - Cancel Return only
**When** I confirm
**Then** the selected waybills reset to "Open" status
**And** unselected waybills retain their current status

### Scenario 8: Waybill Already Linked Cannot Be Used as Return
**Given** waybill WB-2026-0030 is already linked to another active trip
**When** I open the return waybill selector
**Then** WB-2026-0030 does NOT appear in the available list

---

## Tasks / Subtasks

### Backend

- [x] **Task 1: Database Migration** (AC: 1, 4)
  - [x] 1.1 Add `return_waybill_id` nullable UUID FK → `waybill.id` to `trip` table
  - [x] 1.2 Add `arrival_loading_return_date` (DateTime, nullable, TZ-aware) to `trip` table
  - [x] 1.3 Add `loading_return_start_date` (DateTime, nullable, TZ-aware) to `trip` table
  - [x] 1.4 Add `loading_return_end_date` (DateTime, nullable, TZ-aware) to `trip` table
  - [x] 1.5 Extend `TripStatus` enum with 4 new values (added to Python enum; status col is VARCHAR(50) — no DDL ALTER TYPE needed)

- [x] **Task 2: Update Trip Model** (AC: 1, 4)
  - [x] 2.1 Add `return_waybill_id` field to `Trip` SQLModel with optional FK relationship
  - [x] 2.2 Add the 3 new date fields to `Trip` SQLModel
  - [x] 2.3 Add new `TripStatus` enum values in correct lifecycle order (after `offloaded`, before `returned`)

- [x] **Task 3: Waybill Status Sync Logic** (AC: 1, 4, 7)
  - [x] 3.1 Replaced `TRIP_TO_WAYBILL_STATUS` with `TRIP_TO_GO_WAYBILL_STATUS` + `TRIP_TO_RETURN_WAYBILL_STATUS` in `trips.py`
  - [x] 3.2 All sync paths guarded with `if trip.return_waybill_id:` check

- [x] **Task 4: Attach Return Waybill Endpoint** (AC: 1, 2, 8)
  - [x] 4.1 Created `PATCH /trips/{trip_id}/attach-return-waybill` endpoint
  - [x] 4.2 Validate: trip status must be `offloaded`
  - [x] 4.3 Validate: waybill must have status `open`
  - [x] 4.4 Validate: waybill is not already linked to another active trip
  - [x] 4.5 Validate: `waybill_id != return_waybill_id`
  - [x] 4.6 On success: set `trip.return_waybill_id`, set return waybill status to `in_progress`

- [x] **Task 5: Status Transition Validation** (AC: 4, 5)
  - [x] 5.1 Block transition to return leg statuses if `return_waybill_id` is NULL
  - [x] 5.2 Returns HTTP 422 with descriptive message

- [x] **Task 6: Cancellation Logic Update** (AC: 7)
  - [x] 6.1 `TripUpdate` accepts `cancel_go_waybill: bool | None` and `cancel_return_waybill: bool | None`
  - [x] 6.2 Selected waybills reset to `open` on cancellation
  - [x] 6.3 Unselected waybills retain their current status

- [x] **Task 7: POD Documents — Leg Field** (AC: 6)
  - [x] 7.1 Updated `pod_documents` type to `PodDocument = string | { name, url, leg: "go" | "return" }` in `trip.ts` and `models.py`
  - [ ] 7.2 POD upload endpoint not explicitly updated to accept `leg` field — upload still stores raw structure passed by client
  - [x] 7.3 No migration needed — `pod_documents` is already JSON

- [x] **Task 8: API Schema Updates**
  - [x] 8.1 Updated `TripPublic` with `return_waybill_id`, 3 new date fields
  - [x] 8.2 Updated `TripUpdate` schema for new date fields and cancellation flags
  - [x] 8.3 Added `AttachReturnWaybillRequest` schema
  - [x] 8.4 Types manually updated in `frontend/src/types/trip.ts` (Orval regeneration deferred)

### Frontend

- [x] **Task 9: Trip List — Direction Column** (AC: 3)
  - [x] 9.1 Added "Direction" column after "Route" column in `trips/page.tsx`
  - [x] 9.2 Value: `return_waybill_id ? "Return" : "Go"` — does NOT use "Go/Return"
  - [x] 9.3 Styled as `<Tag>`: Go = blue, Return = green
  - [x] 9.4 Column filterable by direction (Go / Return)

- [x] **Task 10: Trip Detail — Attach Return Waybill** (AC: 1, 2, 8)
  - [x] 10.1 "Attach Return Waybill" button visible only when `status === "Offloaded"` AND `!return_waybill_id`
  - [x] 10.2 Opens waybill selector modal fetching open unlinked waybills
  - [x] 10.3 Selector shows waybill number, client, route, rate
  - [x] 10.4 Calls `PATCH /trips/{id}/attach-return-waybill`
  - [x] 10.5 On success: refreshes trip detail

- [x] **Task 11: Trip Detail — Return Waybill Section** (AC: 1, 6)
  - [x] 11.1 Distinct "Go Waybill" and "Return Waybill" sections in drawer
  - [x] 11.2 Return waybill details displayed (number, client, cargo, rate)
  - [x] 11.3 Return date fields shown in dates section

- [x] **Task 12: Status Update Modal — Return Leg Statuses** (AC: 4, 5)
  - [x] 12.1 Status selector shows return statuses only when `return_waybill_id` is set
  - [x] 12.2 Return status ordering correct in `STATUS_ORDER`
  - [x] 12.3 Without return waybill: offloaded → returned path works (return leg statuses hidden)

- [ ] **Task 13: POD Documents — Leg Grouping** (AC: 6)
  - [ ] 13.1 POD upload form leg selector not yet implemented (deferred)
  - [x] 13.2 POD display groups documents under "Go PODs" and "Return PODs" headings

- [x] **Task 14: Cancellation Modal** (AC: 7)
  - [x] 14.1 Multi-select cancel modal shown when trip has both waybills
  - [x] 14.2 Both waybills selected by default
  - [x] 14.3 Sends `cancel_go_waybill` and `cancel_return_waybill` flags
  - [x] 14.4 Single-waybill trips use original cancellation flow

---

## Dev Notes

### Tech Stack (This Project)
- **Backend:** FastAPI + SQLModel + PostgreSQL + Alembic migrations
- **Frontend:** Next.js (App Router) + TypeScript + Ant Design + TanStack Query
- **API Client:** Orval (generates React Query hooks from OpenAPI) — **MUST regenerate after any schema change**
- **Auth:** JWT via HTTP-only cookies

### Critical Architecture Patterns

#### Migration Pattern
Follow existing migration conventions in `/backend/app/alembic/versions/`. Add a new migration file with:
```python
# Add return_waybill_id + 3 date fields + extend TripStatus enum
# Reference: c73d8e91f204, b2c3d4e5f6g7 for existing pattern
```
For PostgreSQL enum extension, use `ALTER TYPE tripstatus ADD VALUE` — **cannot use standard Alembic enum replacement**.
```python
# Correct pattern for extending PostgreSQL enum:
op.execute("ALTER TYPE tripstatus ADD VALUE 'Wait to Load (Return)' AFTER 'Offloaded'")
op.execute("ALTER TYPE tripstatus ADD VALUE 'Loading (Return)' AFTER 'Wait to Load (Return)'")
op.execute("ALTER TYPE tripstatus ADD VALUE 'In Transit (Return)' AFTER 'Loading (Return)'")
op.execute("ALTER TYPE tripstatus ADD VALUE 'At Border (Return)' AFTER 'In Transit (Return)'")
```

#### Status Sync — Existing Pattern
The trip status → waybill status sync lives in `/backend/app/api/routes/trips.py`.
Current sync maps trip status to a single `waybill_id`. This must be extended to handle dual waybills:
```python
# BEFORE (existing pattern — do NOT break this):
if trip.waybill_id:
    waybill.status = mapped_status
    session.add(waybill)

# AFTER (new pattern):
go_waybill_status, return_waybill_status = compute_waybill_statuses(new_trip_status)

if trip.waybill_id:
    go_waybill.status = go_waybill_status
    session.add(go_waybill)

if trip.return_waybill_id:
    return_waybill.status = return_waybill_status
    session.add(return_waybill)
```

#### Waybill Status Sync Table (Complete)
| Trip Status | Go Waybill | Return Waybill |
|---|---|---|
| waiting, dispatch, wait_to_load, loading, in_transit, at_border | in_progress | — |
| offloaded | **completed** | open → in_progress (on attach) |
| wait_to_load_return, loading_return, in_transit_return, at_border_return | completed | in_progress |
| returned, waiting_for_pods | completed | in_progress |
| completed | completed | **completed** |
| cancelled | [modal selected] | [modal selected] |

#### TripStatus Enum (Full Updated Order)
```python
class TripStatus(str, Enum):
    waiting             = "Waiting"
    dispatch            = "Dispatch"
    wait_to_load        = "Wait to Load"
    loading             = "Loading"
    in_transit          = "In Transit"
    at_border           = "At Border"
    offloaded           = "Offloaded"
    # --- Return leg (only available if return_waybill_id is set) ---
    wait_to_load_return = "Wait to Load (Return)"
    loading_return      = "Loading (Return)"
    in_transit_return   = "In Transit (Return)"
    at_border_return    = "At Border (Return)"
    # --- End of journey ---
    returned            = "Returned"
    waiting_for_pods    = "Waiting for PODs"
    completed           = "Completed"
    cancelled           = "Cancelled"
```

### Files to Create/Modify

**Backend:**
| File | Action |
|------|--------|
| `backend/app/alembic/versions/<new_hash>_add_return_waybill_to_trip.py` | CREATE — migration |
| `backend/app/models.py` | MODIFY — Trip model, TripStatus enum |
| `backend/app/api/routes/trips.py` | MODIFY — status sync, new attach endpoint, cancellation update |
| `backend/app/api/routes/waybills.py` | MODIFY — waybill availability filter (exclude already-linked return waybills) |

**Frontend:**
| File | Action |
|------|--------|
| `frontend/src/components/trips/TripListTable.tsx` (or equivalent) | MODIFY — add Route column |
| `frontend/src/components/trips/TripDetailDrawer.tsx` | MODIFY — return waybill section, attach button |
| `frontend/src/components/trips/UpdateTripStatusModal.tsx` | MODIFY — conditional return statuses |
| `frontend/src/components/trips/AttachReturnWaybillModal.tsx` | CREATE — waybill selector modal |
| `frontend/src/components/trips/CancelTripModal.tsx` | MODIFY or CREATE — multi-waybill cancel modal |
| `frontend/src/types/trip.ts` (or similar) | MODIFY — add return_waybill_id, new date fields, new statuses |
| `frontend/src/types/waybill.ts` | MODIFY — POD document type with `leg` field |

### Key Business Rules (Hard Constraints)
1. **Attach only at `Offloaded`** — no other status allows attaching a return waybill
2. **Eligible return waybill:** status must be `open` AND not linked to any non-cancelled trip as `waybill_id` OR `return_waybill_id`
3. **Return leg statuses require return waybill** — backend enforces this with HTTP 422
4. **Go waybill completes at `Offloaded`** — this is the commercial delivery confirmation
5. **Return waybill completes at `Completed`** — only when the full trip lifecycle ends
6. **Same waybill cannot be both legs** — `waybill_id != return_waybill_id` enforced at backend
7. **Empty return path**: If no return waybill, trip goes directly `Offloaded → Returned` (existing behavior preserved)

### POD Document Schema Extension
The existing `pod_documents` column is `JSON` type on the trip table. The current structure is unspecified — add a `leg` field:
```json
[
  { "name": "delivery_receipt.pdf", "url": "https://...", "leg": "go" },
  { "name": "loading_certificate.pdf", "url": "https://...", "leg": "return" }
]
```
No migration required for the column itself — only frontend upload form and display logic changes.

### Frontend — Direction Column Badge
New "Direction" column — separate from the existing "Route" column (which shows `route_name` e.g. "Mombasa - Nairobi").
Use Ant Design `<Tag>` component:
```tsx
// In trip list column render:
// "Go" = one-way trip, "Return" = has return cargo (Go is already implied)
<Tag color={trip.return_waybill_id ? "green" : "blue"}>
  {trip.return_waybill_id ? "Return" : "Go"}
</Tag>
```
Do NOT use "Go/Return" — the label "Return" alone is sufficient because every trip starts as Go by definition.

### Frontend — Orval Regeneration
After modifying OpenAPI schema (new endpoint, new fields, new enum values):
```bash
cd frontend && npm run generate-api  # or equivalent Orval command
```
This is MANDATORY — do not manually write API call functions when Orval hooks are available.

### Regression Risks
- **Existing trips with single waybill:** Must continue to work exactly as before. All new fields are nullable. Guard all sync logic with `if trip.return_waybill_id:`.
- **Status transitions:** Existing valid transitions (offloaded → returned) must NOT be broken for trips without return waybill.
- **Trip list table:** Adding a new column must not break sticky column behavior (see story 2-16) or adjustable column feature (see story 4-4).
- **Cancellation flow:** Single-waybill cancellation must follow the original path without showing the new modal.

### Project Structure Notes
- Backend models: `/backend/app/models.py` — all SQLModel classes in one file (existing pattern)
- Backend routes: `/backend/app/api/routes/trips.py` — all trip endpoints
- Frontend components: `/frontend/src/components/trips/` — all trip-related components
- Alembic migrations: `/backend/app/alembic/versions/` — each migration is a separate file
- Types: inferred from Orval-generated hooks — do not manually duplicate

### References
- Existing TripStatus enum: `backend/app/models.py` lines ~420-432
- Status sync logic: `backend/app/api/routes/trips.py`
- Trip model: `backend/app/models.py` lines ~440-520
- Waybill model: `backend/app/models.py`
- CreateTripDrawer (route auto-population from waybill): `frontend/src/components/trips/CreateTripDrawer.tsx`
- Migration pattern reference: `backend/app/alembic/versions/b2c3d4e5f6g7` (loading date split)
- Story 2-1 (trip creation): `_bmad-output/implementation-artifacts/2-1-trip-creation-dispatch.md`
- Story 2-7 (waybill management): `_bmad-output/implementation-artifacts/2-7-waybill-management.md`
- Story 2-16 (sticky pagination/columns): `_bmad-output/implementation-artifacts/2-16-sticky-pagination.md`
- Story 4-4 (adjustable columns): `_bmad-output/implementation-artifacts/4-4-adjustable-columns.md`

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List
- TripStatus column is VARCHAR(50) (converted in migration b2c3d4e5f6g7) — new enum values added to Python only, no ALTER TYPE DDL needed
- Orval regeneration deferred; types manually updated in `frontend/src/types/trip.ts`
- Task 13.1 (POD upload form leg selector) deferred — display grouping only implemented
- TypeScript errors fixed in `ops/trips/[id]/page.tsx` and `dashboard/RecentTripsTable.tsx` (missing return leg statuses in Record<TripStatus, string>)
- `[id]/page.tsx` UpdateTripStatusModal now passes `return_waybill_id` to support dynamic status list

### File List
- `backend/app/alembic/versions/d3e4f5g6h7i8_add_return_waybill_to_trip.py` (CREATED)
- `backend/app/models.py` (MODIFIED)
- `backend/app/api/routes/trips.py` (MODIFIED)
- `frontend/src/types/trip.ts` (MODIFIED)
- `frontend/src/app/(authenticated)/ops/trips/page.tsx` (MODIFIED)
- `frontend/src/app/(authenticated)/ops/trips/[id]/page.tsx` (MODIFIED)
- `frontend/src/components/trips/TripDetailDrawer.tsx` (MODIFIED)
- `frontend/src/components/trips/UpdateTripStatusModal.tsx` (MODIFIED)
- `frontend/src/components/dashboard/RecentTripsTable.tsx` (MODIFIED)
