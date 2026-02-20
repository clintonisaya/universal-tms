# Story 2.26: Border Crossing Tracking

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-26-border-crossing-tracking
**Status:** done
**Date Created:** 2026-02-18

---

## Story

As an **Ops Officer**,
I want to declare which border posts a trip will cross when creating a waybill, then progressively record detailed crossing timestamps when the trip reaches "At Border" status,
So that the business has full audit-level visibility into transit times at each border post for compliance reporting and performance analysis.

As an **Admin / Manager**,
I want to manage a system-level list of border post pairs (Side A / Side B),
So that Ops Officers select from standardised, accurate border names rather than free text.

As an **Ops Officer**,
I want the border sub-form to automatically show the correct side labels based on whether the trip is on the go or return leg,
So that I never have to manually reverse direction — the system flips the labels automatically.

As an **Ops Manager**,
I want to export a comprehensive Excel report from the Control Tower with full waybill details, driver documents, asset info, all border crossing timestamps, and colour-coded status rows,
So that I can share an audit-ready trip dossier with clients, compliance teams, or management without manual assembly.

---

## Acceptance Criteria

### Scenario 1: Admin manages border posts (System Settings)
**Given** I am logged in as Admin or Manager
**When** I navigate to System Settings
**Then** I see a "Border Posts" section listing all configured border pairs
**When** I click "Add Border Post"
**Then** a form appears with: Display Name, Side A Name, Side B Name, Is Active toggle
**When** I enter Display Name "Tunduma / Nakonde", Side A = "Tunduma", Side B = "Nakonde" and save
**Then** the border post is created and immediately available in the waybill border picker

### Scenario 2: Declare borders at waybill creation
**Given** I am creating a new waybill
**When** I reach the "Border Crossings" field
**Then** I see an ordered multi-select showing all active border posts by display name
**When** I select "Tunduma / Nakonde" then "Kasumbalesa 114 / 200" in that order
**Then** both are saved in `waybill_borders` with sequence 1 and 2 respectively
**When** the waybill is created
**Then** the border sequence persists and is shown on the waybill edit form

### Scenario 3: Editing border sequence
**Given** a waybill with 2 borders saved
**When** I edit the waybill
**Then** I can add, remove, or reorder borders
**And** on save the `waybill_borders` records are replaced with the new ordered list

### Scenario 4: Go leg — border auto-pop at "At Border"
**Given** a trip on the go leg linked to a waybill with borders [Tunduma/Nakonde (seq 1), Kasumbalesa 114/200 (seq 2)]
**When** I set trip status to "At Border"
**Then** the UpdateTripStatusModal shows a border crossing sub-form
**And** it auto-selects the first uncompleted border: "Tunduma / Nakonde"
**And** labels show Side A = "Tunduma", Side B = "Nakonde"
**And** I can fill any of the 7 date stamps (all optional, filled progressively)
**When** I save with some dates recorded
**Then** a `trip_border_crossings` record is upserted for trip + border + direction="go"
**When** I set status to "At Border" again later
**Then** it auto-pops the next uncompleted: "Kasumbalesa 114 / 200"
**And** Tunduma/Nakonde is shown as completed (greyed out / checkmark)

### Scenario 5: Return leg — border auto-pop at "At Border (Return)"
**Given** the same trip now on the return leg
**When** I set status to "At Border (Return)"
**Then** the sub-form auto-selects "Kasumbalesa 200 / 114" (reverse order, labels flipped)
**And** labels show Side A = "Kasumbalesa 200", Side B = "Kasumbalesa 114"
**When** I set status to "At Border (Return)" a second time
**Then** it pops "Nakonde / Tunduma" (seq 1, labels flipped)

### Scenario 6: 7 date stamps per crossing event
**Given** a border crossing sub-form is open
**When** I view the form
**Then** I see 7 optional DateTimePicker fields labelled with actual side names:
  1. "Arrived at [Side A]"
  2. "Documents Submitted at [Side A]"
  3. "Documents Cleared at [Side A]"
  4. "Arrived at [Side B]" ← this implicitly = departed Side A
  5. "Documents Submitted at [Side B]"
  6. "Documents Cleared at [Side B]"
  7. "Departed Border Zone"
**And** all 7 are optional — the form can be saved with any combination filled
**When** I save a partial form and return to "At Border" status for the same border later
**Then** the previously recorded dates are pre-filled in the form

### Scenario 7: No borders declared
**Given** a waybill with NO border crossings declared
**When** the trip reaches "At Border" or "At Border (Return)"
**Then** the UpdateTripStatusModal opens normally with current_location input
**And** NO border sub-form appears
**And** no crash or error occurs

### Scenario 8: Trip Detail Drawer — Border Crossings section
**Given** a trip with at least one border crossing record
**When** I open the Trip Detail Drawer
**Then** I see a "Border Crossings" section
**And** each crossing shows: border display name, direction badge (Go / Return), all 7 date fields (blank if not yet filled)
**And** a completion indicator: All 7 filled = "Complete", partial = "In Progress", none started = "Pending"

### Scenario 9: Comprehensive Control Tower Excel export
**Given** I am on the Control Tower page with loaded data
**When** I click "Export Excel"
**Then** an Excel file downloads with:
  - Header row: bold, frozen (top row stays visible on scroll)
  - Row background colour by trip status (see Dev Notes colour table)
  - All existing columns preserved
  - New columns added:
    - Driver: Licence Number, Passport Number, Phone Number
    - Truck: Make, Model (in addition to existing Plate)
    - Trailer: Type (in addition to existing Plate)
    - Go Waybill: full details (WB#, Client, Origin, Destination, Cargo Type, Weight, Description, Risk — NO rate/amount)
    - Return Waybill: same fields (prefixed "Return:")
    - All trip tracking dates (Dispatch, Wait to Load, Load Start, Load End, Offloading, Return Dispatch, Return Load Start, Return Load End, Returned)
    - Border Crossing 1: Border Name, Side A, Side B, all 7 date columns
    - Border Crossing 2 (if exists): same columns
    - Current Location

---

## Tasks / Subtasks

### Backend

- [ ] **Task 1: Database Models & Migration** (AC: 1, 2, 4, 6)
  - [ ] 1.1 Add `BorderPost` SQLModel to `models.py`:
        `id (UUID PK)`, `display_name (str)`, `side_a_name (str)`, `side_b_name (str)`, `is_active (bool, default=True)`, `created_at (datetime TZ)`
  - [ ] 1.2 Add `WaybillBorder` SQLModel (junction table):
        `id (UUID PK)`, `waybill_id (FK→waybill.id, CASCADE DELETE)`, `border_post_id (FK→border_post.id, RESTRICT)`, `sequence (int)`;
        UNIQUE constraints: `(waybill_id, sequence)` and `(waybill_id, border_post_id)`
  - [ ] 1.3 Add `TripBorderCrossing` SQLModel:
        `id (UUID PK)`, `trip_id (FK→trip.id, CASCADE DELETE)`, `border_post_id (FK→border_post.id)`,
        `direction VARCHAR(10) CHECK IN ('go','return')`,
        7 nullable TZ-aware datetime fields: `arrived_side_a_at`, `documents_submitted_side_a_at`, `documents_cleared_side_a_at`,
        `arrived_side_b_at`, `documents_submitted_side_b_at`, `documents_cleared_side_b_at`, `departed_border_at`,
        `created_at`, `updated_at`;
        UNIQUE: `(trip_id, border_post_id, direction)`
  - [ ] 1.4 Add `BorderPostCreate`, `BorderPostUpdate`, `BorderPostPublic`, `BorderPostsPublic` schemas
  - [ ] 1.5 Add `WaybillBorderPublic` schema (includes nested `BorderPostPublic`)
  - [ ] 1.6 Add `TripBorderCrossingCreate`, `TripBorderCrossingUpsert`, `TripBorderCrossingPublic` schemas
  - [ ] 1.7 Create Alembic migration: `CREATE TABLE border_post`, `CREATE TABLE waybill_border`, `CREATE TABLE trip_border_crossing`

- [ ] **Task 2: Border Post CRUD — Settings API** (AC: 1)
  - [ ] 2.1 Add to `backend/app/api/routes/settings.py`:
        `GET /settings/border-posts` — list all (filter `?active_only=true` optional)
        `POST /settings/border-posts` — create (admin/manager role required)
        `PATCH /settings/border-posts/{id}` — update
        `DELETE /settings/border-posts/{id}` — soft delete (`is_active=False`) if crossings exist, hard delete if none

- [ ] **Task 3: Waybill Border Linkage API** (AC: 2, 3)
  - [ ] 3.1 Extend `WaybillCreate` with `border_ids: list[uuid.UUID] | None = None` (ordered, optional)
  - [ ] 3.2 In waybill create endpoint: bulk insert `WaybillBorder` records with `sequence = index + 1`
  - [ ] 3.3 Extend `WaybillUpdate` with `border_ids: list[uuid.UUID] | None = None`
  - [ ] 3.4 In waybill update endpoint: if `border_ids` provided, delete existing `WaybillBorder` records for this waybill then re-insert new ones
  - [ ] 3.5 Add `GET /waybills/{waybill_id}/borders` — returns ordered `WaybillBorderPublic` list
  - [ ] 3.6 Extend `WaybillPublic` to include `borders: list[WaybillBorderPublic] = []` (populated via join or separate fetch)

- [ ] **Task 4: Trip Border Crossing API** (AC: 4, 5, 6, 7)
  - [ ] 4.1 Add `GET /trips/{trip_id}/border-crossings` — returns all `TripBorderCrossingPublic` for the trip, joined with `BorderPostPublic`
  - [ ] 4.2 Add `PUT /trips/{trip_id}/border-crossings/{border_post_id}` — upsert crossing record
        Accepts body: `{ direction: "go" | "return", arrived_side_a_at?, documents_submitted_side_a_at?, documents_cleared_side_a_at?, arrived_side_b_at?, documents_submitted_side_b_at?, documents_cleared_side_b_at?, departed_border_at? }`
        Logic: if existing record for `(trip_id, border_post_id, direction)` → update fields; else → insert
  - [ ] 4.3 Add helper function `get_next_uncompleted_border(trip_id, direction, session) -> BorderPost | None`:
        1. Get `trip.waybill_id` (go) or `trip.return_waybill_id` (return)
        2. Load `WaybillBorder` for that waybill, ordered by `sequence ASC`
        3. For return direction: reverse the list
        4. Return first `border_post` where no `TripBorderCrossing` with `arrived_side_a_at IS NOT NULL` exists for this `(trip_id, border_post_id, direction)`
  - [ ] 4.4 Add `GET /trips/{trip_id}/next-border?direction=go|return` — calls helper, returns `BorderPostPublic | null`
  - [ ] 4.5 Extend `TripPublicDetailed` with `border_crossings: list[TripBorderCrossingPublic] = []`

- [ ] **Task 5: Control Tower Report Extension** (AC: 9)
  - [ ] 5.1 In `reports.py` → `get_waybill_tracking_report`:
        Extend SELECT to include `driver.license_number`, `driver.passport_number`, `driver.phone_number`, `truck.make`, `truck.model`, `trailer.type`
        (these models are already joined — just add fields to the response dict)
  - [ ] 5.2 After main query, fetch border crossings for all trip IDs in result set (bulk fetch, not N+1):
        `SELECT * FROM trip_border_crossing WHERE trip_id IN (...) ORDER BY trip_id, direction, created_at`
        Join with `border_post` to get side names
  - [ ] 5.3 Add `border_crossings: list[dict]` to each row in `report_data` — up to 2 items (go borders) + up to 2 items (return borders), each with all 7 date fields + side label context
  - [ ] 5.4 Add tracking date fields to the report row dict (already on Trip model — just missing from current response):
        `arrival_loading_date`, `loading_start_date`, `loading_end_date`, `arrival_offloading_date`, `offloading_date`,
        `dispatch_return_date`, `arrival_loading_return_date`, `loading_return_start_date`, `loading_return_end_date`

### Frontend

- [ ] **Task 6: System Settings — Border Posts UI** (AC: 1)
  - [ ] 6.1 Locate the existing Settings page (check `frontend/src/app/(authenticated)/settings/` or `/admin/`)
  - [ ] 6.2 Add "Border Posts" tab following the same pattern as existing tabs (Country, City, Cargo Types, etc.)
  - [ ] 6.3 Render table: columns = Display Name, Side A, Side B, Active, Actions (Edit, Deactivate)
  - [ ] 6.4 "Add Border Post" button → modal form: Display Name (auto-populate as "{Side A} / {Side B}"), Side A Name, Side B Name, Is Active toggle
  - [ ] 6.5 Edit row → same modal pre-filled
  - [ ] 6.6 Deactivate → confirm → PATCH `is_active: false`
  - [ ] 6.7 Add `useBorderPosts(enabled?)` and border post mutations to `frontend/src/hooks/useApi.ts`

- [ ] **Task 7: Waybill Form — Ordered Border Picker** (AC: 2, 3)
  - [ ] 7.1 Locate waybill create/edit form (likely `CreateWaybillModal.tsx` or `waybills/page.tsx`)
  - [ ] 7.2 Fetch active border posts using `useBorderPosts()`
  - [ ] 7.3 Add "Border Crossings" Ant Design `<Select mode="multiple">` field showing `display_name` values
  - [ ] 7.4 Selected borders shown as draggable tags (or up/down buttons) to control sequence order
        Simplest approach: use Ant Design DnD or simple index-based reorder buttons
  - [ ] 7.5 On submit: send `border_ids` as ordered `uuid[]` array
  - [ ] 7.6 On waybill edit: pre-fill with existing borders in saved sequence order
  - [ ] 7.7 Add `WaybillBorder` and `BorderPost` TypeScript types to `frontend/src/types/`

- [ ] **Task 8: Trip Status Modal — Border Crossing Sub-Form** (AC: 4, 5, 6, 7)
  - [ ] 8.1 In `UpdateTripStatusModal.tsx`, when selected status is `"At Border"` or `"At Border (Return)"`:
    - [ ] 8.1a Call `GET /trips/{trip_id}/next-border?direction={go|return}` to get the next uncompleted border
    - [ ] 8.1b If border returned: show sub-form with 7 DatePicker fields labelled with actual side names
          Direction determines label flip: go → `{side_a_name}` / `{side_b_name}`; return → `{side_b_name}` / `{side_a_name}`
    - [ ] 8.1c Pre-fill existing dates: call `GET /trips/{trip_id}/border-crossings` and find matching record
    - [ ] 8.1d If no border returned (waybill has no borders, or all completed): show only existing `current_location` input — no crash
  - [ ] 8.2 On form submit: first call `PUT /trips/{trip_id}/border-crossings/{border_post_id}` with dates + direction, then proceed with normal status PATCH
  - [ ] 8.3 Add `useTripBorderCrossings(tripId)` and `useNextBorder(tripId, direction)` hooks to `useApi.ts`
  - [ ] 8.4 Add `TripBorderCrossing` TypeScript type with all 7 date fields

- [ ] **Task 9: Trip Detail Drawer — Border Crossings Section** (AC: 8)
  - [ ] 9.1 In `TripDetailDrawer.tsx`, add "Border Crossings" collapsible `<Collapse>` section
  - [ ] 9.2 Fetch `border_crossings` from `TripPublicDetailed` response (already in endpoint after Task 4.5)
  - [ ] 9.3 For each crossing, render a card with:
        - Header: border `display_name` + direction badge (Go/Return)
        - Completion status badge: All 7 filled = green "Complete", any filled = amber "In Progress", none = grey "Pending"
        - Date rows: each of the 7 fields with label (using actual side names) and formatted datetime or "—"
  - [ ] 9.4 If no crossings: show "No border crossings recorded"

- [ ] **Task 10: Control Tower — Comprehensive Excel Export** (AC: 9)
  - [ ] 10.1 Update `TrackingRow` interface in `tracking/page.tsx` to include:
        `driver_license`, `driver_passport`, `driver_phone`, `truck_make`, `truck_model`, `trailer_type`
        `tracking_dates: {...}` (all trip date fields)
        `border_crossings: BorderCrossingExport[]` (up to N borders with 7 dates each)
  - [ ] 10.2 Update backend `get_waybill_tracking_report` response shape to include all these fields (Task 5)
  - [ ] 10.3 In `handleExport`, build expanded column list:
        Trip block, Go Waybill block, Return Waybill block, Driver block, Assets block, Tracking Dates block, Border 1 block, Border 2 block (if present), Location
  - [ ] 10.4 Apply ExcelJS row colour fill using `STATUS_ROW_COLORS` map (see Dev Notes)
  - [ ] 10.5 Bold header row: `worksheet.getRow(1).font = { bold: true }`
  - [ ] 10.6 Freeze header row: `worksheet.views = [{ state: 'frozen', ySplit: 1 }]`

---

## Dev Notes

### Tech Stack
- **Backend:** FastAPI + SQLModel + PostgreSQL + Alembic
- **Frontend:** Next.js App Router + TypeScript + Ant Design + TanStack Query
- **TripStatus:** VARCHAR(50) column — no `ALTER TYPE` DDL needed when adding new enum values
- **Excel Export:** ExcelJS (already installed — used in `tracking/page.tsx`)
- **Auth:** JWT HTTP-only cookies; admin/manager-only endpoints use `CurrentUser` dependency + role check

### New Database Tables (SQL Reference)

```sql
-- Border post master data
CREATE TABLE border_post (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(255) NOT NULL,   -- "Tunduma / Nakonde"
    side_a_name  VARCHAR(255) NOT NULL,   -- "Tunduma" (go-direction first contact)
    side_b_name  VARCHAR(255) NOT NULL,   -- "Nakonde" (return-direction first contact)
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Waybill ↔ border ordered junction
CREATE TABLE waybill_border (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waybill_id     UUID NOT NULL REFERENCES waybill(id) ON DELETE CASCADE,
    border_post_id UUID NOT NULL REFERENCES border_post(id) ON DELETE RESTRICT,
    sequence       INTEGER NOT NULL,
    UNIQUE (waybill_id, sequence),
    UNIQUE (waybill_id, border_post_id)
);

-- Per-trip crossing event with 7 progressive date stamps
CREATE TABLE trip_border_crossing (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id        UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    border_post_id UUID NOT NULL REFERENCES border_post(id),
    direction      VARCHAR(10) NOT NULL CHECK (direction IN ('go', 'return')),
    -- Side A timestamps (go: exit side; return: entry side labels are flipped)
    arrived_side_a_at              TIMESTAMPTZ,
    documents_submitted_side_a_at  TIMESTAMPTZ,
    documents_cleared_side_a_at    TIMESTAMPTZ,
    -- Side B timestamps ("Arrived Side B" = implicitly "Departed Side A")
    arrived_side_b_at              TIMESTAMPTZ,
    documents_submitted_side_b_at  TIMESTAMPTZ,
    documents_cleared_side_b_at    TIMESTAMPTZ,
    -- Final departure from border zone
    departed_border_at             TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (trip_id, border_post_id, direction)
);
```

### SQLModel Pattern (Follow Existing in models.py)

```python
class BorderPostBase(SQLModel):
    display_name: str = Field(min_length=1, max_length=255)
    side_a_name: str  = Field(min_length=1, max_length=255)
    side_b_name: str  = Field(min_length=1, max_length=255)
    is_active: bool   = Field(default=True)

class BorderPost(BorderPostBase, table=True):
    __tablename__ = "border_post"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )

class WaybillBorder(SQLModel, table=True):
    __tablename__ = "waybill_border"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    waybill_id: uuid.UUID     = Field(foreign_key="waybill.id")
    border_post_id: uuid.UUID = Field(foreign_key="border_post.id")
    sequence: int

class TripBorderCrossing(SQLModel, table=True):
    __tablename__ = "trip_border_crossing"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    trip_id: uuid.UUID        = Field(foreign_key="trip.id")
    border_post_id: uuid.UUID = Field(foreign_key="border_post.id")
    direction: str            = Field(max_length=10)   # "go" | "return"
    arrived_side_a_at:             datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    documents_submitted_side_a_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    documents_cleared_side_a_at:   datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    arrived_side_b_at:             datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    documents_submitted_side_b_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    documents_cleared_side_b_at:   datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    departed_border_at:            datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    updated_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
```

### Directional Flip Logic

```python
def get_side_labels(border: BorderPost, direction: str) -> tuple[str, str]:
    """Returns (side_a_display_label, side_b_display_label) for rendering."""
    if direction == "go":
        return border.side_a_name, border.side_b_name
    else:
        return border.side_b_name, border.side_a_name   # Flipped for return
```

### Next Uncompleted Border Algorithm

```python
def get_next_uncompleted_border(
    trip_id: uuid.UUID,
    direction: str,   # "go" | "return"
    session: Session
) -> BorderPost | None:
    # 1. Get relevant waybill_id from trip
    trip = session.get(Trip, trip_id)
    waybill_id = trip.waybill_id if direction == "go" else trip.return_waybill_id
    if not waybill_id:
        return None

    # 2. Load ordered waybill borders
    borders_stmt = (
        select(WaybillBorder, BorderPost)
        .join(BorderPost, BorderPost.id == WaybillBorder.border_post_id)
        .where(WaybillBorder.waybill_id == waybill_id)
        .order_by(WaybillBorder.sequence.asc())
    )
    borders = session.exec(borders_stmt).all()
    if not borders:
        return None

    # 3. Reverse order for return leg
    if direction == "return":
        borders = list(reversed(borders))

    # 4. Load completed crossings for this trip + direction
    completed_stmt = (
        select(TripBorderCrossing.border_post_id)
        .where(TripBorderCrossing.trip_id == trip_id)
        .where(TripBorderCrossing.direction == direction)
        .where(TripBorderCrossing.arrived_side_a_at.isnot(None))
    )
    completed_ids = {row for row in session.exec(completed_stmt).all()}

    # 5. Return first not-yet-started border
    for _, border in borders:
        if border.id not in completed_ids:
            return border
    return None   # All borders completed
```

### ExcelJS Row Colour Fill (Control Tower Export)

```typescript
const STATUS_ROW_COLORS: Record<string, string> = {
  "In Transit":            "D9F2DC",   // Green
  "In Transit (Return)":   "D9F2DC",
  "Offloading":            "D9F2DC",
  "Offloading (Return)":   "D9F2DC",
  "Loading":               "FFF3CD",   // Gold
  "Loading (Return)":      "FFF3CD",
  "Wait to Load":          "FFF3CD",
  "Wait to Load (Return)": "FFF3CD",
  "Dispatch":              "FFF3CD",
  "Dispatch (Return)":     "FFF3CD",
  "At Border":             "FFE0B2",   // Orange
  "At Border (Return)":    "FFE0B2",
  "Not Dispatched":        "DDEEFF",   // Light Blue
  "Waiting":               "DDEEFF",
  "Returned":              "EDE7F6",   // Purple
  "Waiting for PODs":      "EDE7F6",
  "Cancelled":             "FFCDD2",   // Red
  "Completed":             "F5F5F5",   // Light Grey
};

// Apply after addRow():
const tripStatusColor = STATUS_ROW_COLORS[row.trip_status] ?? "FFFFFF";
excelRow.eachCell({ includeEmpty: true }, (cell) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${tripStatusColor}` },
  };
});

// Header row: bold + freeze
worksheet.getRow(1).font = { bold: true };
worksheet.views = [{ state: "frozen", ySplit: 1 }];
```

### Existing Settings API Router Pattern

Settings master data (Country, City, CargoType, Client, etc.) lives in `backend/app/api/routes/settings.py`. Add border post CRUD there under `/settings/border-posts`. Check that router for the role-guard pattern used (likely `current_user.role in [UserRole.admin, UserRole.manager]`).

### Existing Frontend Settings Page Pattern

Look for the settings/admin page with existing tabs. Ant Design `<Tabs>` pattern is likely used. Add a new `<TabPane key="border-posts">` tab following the exact same component structure as existing tabs (likely a table + modal pattern).

### Waybill Form Location — Check Before Touching

The waybill create form may be in multiple locations:
- `frontend/src/components/waybills/CreateWaybillDrawer.tsx` or `CreateWaybillModal.tsx`
- `frontend/src/app/(authenticated)/ops/waybills/page.tsx`

Read both before editing. The border picker goes into the create AND edit form.

### Upsert Pattern for Border Crossings

The crossing record is upserted (not always new):
```python
# In PUT /trips/{trip_id}/border-crossings/{border_post_id}
existing = session.exec(
    select(TripBorderCrossing)
    .where(TripBorderCrossing.trip_id == trip_id)
    .where(TripBorderCrossing.border_post_id == border_post_id)
    .where(TripBorderCrossing.direction == body.direction)
).first()

if existing:
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(existing, field, value)
    existing.updated_at = datetime.now(timezone.utc)
    session.add(existing)
else:
    crossing = TripBorderCrossing(
        trip_id=trip_id,
        border_post_id=border_post_id,
        **body.model_dump()
    )
    session.add(crossing)

session.commit()
```

### Driver Fields Already Available in Tracking Report Joins

`get_waybill_tracking_report` in `reports.py` already joins `Driver` via:
```python
.outerjoin(Driver, Driver.id == Trip.driver_id)
```
Just add these fields to the response dict — no new joins needed:
```python
"driver_license": driver.license_number if driver else None,
"driver_passport": driver.passport_number if driver else None,
"driver_phone": driver.phone_number if driver else None,
```

Truck `make` and `model`, Trailer `type` are similarly available from existing joins.

### Important: Avoid N+1 for Border Crossings in Report

When extending `get_waybill_tracking_report`, bulk-fetch all border crossings in one query:
```python
trip_ids = [str(row[0].id) for row in trip_results]
crossings_stmt = (
    select(TripBorderCrossing, BorderPost)
    .join(BorderPost, BorderPost.id == TripBorderCrossing.border_post_id)
    .where(TripBorderCrossing.trip_id.in_(trip_ids))
    .order_by(TripBorderCrossing.trip_id, TripBorderCrossing.direction)
)
all_crossings = session.execute(crossings_stmt).all()

# Group by trip_id for O(1) lookup
from collections import defaultdict
crossings_by_trip: dict[str, list] = defaultdict(list)
for crossing, border in all_crossings:
    crossings_by_trip[str(crossing.trip_id)].append((crossing, border))
```

### Status Rename from Story 2.25 Continuation

**CRITICAL:** "Offloaded" was renamed to "Offloading" during Story 2.25 work. Current `TripStatus` enum:
- `offloading = "Offloading"` ← was "Offloaded"
- `dispatch_return = "Dispatch (Return)"` ← NEW
- `offloading_return = "Offloading (Return)"` ← NEW
- `dispatch_return_date` field exists on `Trip` model

**Do not reference "Offloaded" anywhere.** The attach-return-waybill button condition is `trip.status === "Offloading"`.

### TanStack Query Hooks to Add to `useApi.ts`

```typescript
// Border posts
export const useBorderPosts = (activeOnly = true, enabled = true) =>
  useQuery({
    queryKey: ["border-posts", activeOnly],
    queryFn: () => apiClient.get(`/settings/border-posts?active_only=${activeOnly}`).then(r => r.data),
    enabled,
  });

// Trip border crossings (for detail drawer)
export const useTripBorderCrossings = (tripId: string | null) =>
  useQuery({
    queryKey: ["trip-border-crossings", tripId],
    queryFn: () => apiClient.get(`/trips/${tripId}/border-crossings`).then(r => r.data),
    enabled: !!tripId,
  });

// Next border for status modal
export const useNextBorder = (tripId: string | null, direction: "go" | "return") =>
  useQuery({
    queryKey: ["next-border", tripId, direction],
    queryFn: () => apiClient.get(`/trips/${tripId}/next-border?direction=${direction}`).then(r => r.data),
    enabled: !!tripId,
  });
```

### Migration Filename Convention
```
backend/app/alembic/versions/<hash>_add_border_crossing_tables.py
```
Use a random 12-char hex string for hash (see existing migration filenames for pattern).
`down_revision` = the most recent migration in the versions folder.

### Regression Risks
- **Waybill without borders**: "At Border" modal must NOT crash — check `next_border is None` and gracefully fall back to plain current_location input
- **Existing trips**: No `waybill_borders` records → `get_next_uncompleted_border` returns `None` → no change to existing behavior
- **`WaybillCreate` change**: `border_ids` is optional/nullable — all existing waybill creation flows unaffected
- **Control Tower**: The backend report must return all existing fields unchanged; only add new ones
- **Excel export**: All previous columns must remain; new columns appended after existing ones

### Project Structure Notes

```
backend/app/
  models.py                         ← ADD BorderPost, WaybillBorder, TripBorderCrossing
  alembic/versions/<hash>_*.py      ← CREATE migration
  api/routes/
    settings.py                     ← ADD border post CRUD
    waybills.py                     ← MODIFY create/update with border_ids
    trips.py                        ← ADD border-crossings + next-border endpoints
    reports.py                      ← MODIFY tracking report with new fields + border data

frontend/src/
  hooks/useApi.ts                   ← ADD useBorderPosts, useTripBorderCrossings, useNextBorder
  types/trip.ts                     ← ADD BorderPost, WaybillBorder, TripBorderCrossing types
  app/(authenticated)/
    settings/page.tsx               ← ADD Border Posts tab (check exact path)
  components/
    waybills/CreateWaybillDrawer.tsx (or Modal) ← ADD border picker
    trips/UpdateTripStatusModal.tsx  ← ADD border sub-form for At Border statuses
    trips/TripDetailDrawer.tsx       ← ADD Border Crossings section
  app/(authenticated)/ops/tracking/page.tsx ← MODIFY Excel export
```

### References
- Existing trip tracking dates: `backend/app/models.py` lines ~524–537 (Trip DB model)
- Existing master data pattern: `backend/app/models.py` lines ~760–912 (Country, City, CargoType, Client)
- Status sync logic: `backend/app/api/routes/trips.py`
- Existing settings routes: `backend/app/api/routes/settings.py`
- Control Tower report: `backend/app/api/routes/reports.py` → `get_waybill_tracking_report()`
- Control Tower frontend: `frontend/src/app/(authenticated)/ops/tracking/page.tsx`
- UpdateTripStatusModal: `frontend/src/components/trips/UpdateTripStatusModal.tsx`
- TripDetailDrawer: `frontend/src/components/trips/TripDetailDrawer.tsx`
- ExcelJS usage example: existing `handleExport` in `tracking/page.tsx`
- Story 2.25 (return waybill): `_bmad-output/implementation-artifacts/2-25-return-waybill-trip-linkage.md`
- Story 2.11 (admin settings structure): `_bmad-output/implementation-artifacts/2-11-admin-settings.md`
- Story 2.8 (transport master data pattern): `_bmad-output/implementation-artifacts/2-8-transport-master-data.md`

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
None — all files passed syntax/type checks clean.

### Completion Notes List
- Task 4 (trips.py border crossing endpoints) was already complete from previous session
- Task 5 (reports.py extension): Added `from collections import defaultdict`, imported `BorderPost` and `TripBorderCrossing`, bulk-fetched crossings via one query after main trip query, added driver_license/passport/phone, truck_make/model, trailer_type, all tracking dates, border_crossings list to each row
- Task 6 (Settings UI): Created full Border Posts CRUD page at `settings/transport/border-posts/page.tsx` with auto-fill display_name, active/inactive filter, admin/manager write guard
- Task 7 (Waybill Form): Added border picker to `CreateWaybillDrawer.tsx` — multi-select + ordered tag list with up/down reorder arrows; `border_ids` sent on submit
- Task 8 (Status Modal): Added `fetchBorderData()` on status change; 7-date sub-form with directional label flip for At Border / At Border (Return); upsert called before trip PATCH in handleSubmit
- Task 9 (Detail Drawer): Added `fetchBorderCrossings()` + new "Border Crossings" tab with collapsible cards showing 7 dates, completion badge
- Task 10 (Excel Export): Row colour fills by status, bold+frozen header row, full column expansion (driver docs, truck details, trailer type, tracking dates, dynamic border crossing columns)

### File List
- `backend/app/models.py` — Added BorderPost, WaybillBorder, TripBorderCrossing models and schemas
- `backend/app/alembic/versions/f5g6h7i8j9k0_add_border_crossing_tables.py` — Migration
- `backend/app/api/routes/border_posts.py` — Created (CRUD for border posts)
- `backend/app/api/routes/waybills.py` — Modified (border_ids in create/update + GET borders endpoint)
- `backend/app/api/routes/trips.py` — Modified (3 border crossing endpoints)
- `backend/app/api/routes/reports.py` — Modified (extended tracking report)
- `backend/app/api/main.py` — Modified (added border_posts router)
- `frontend/src/hooks/useApi.ts` — Modified (added useBorderPosts, useTripBorderCrossings, useNextBorder, invalidateBorderPosts)
- `frontend/src/app/(authenticated)/settings/transport/border-posts/page.tsx` — Created
- `frontend/src/components/waybills/CreateWaybillDrawer.tsx` — Modified (border picker)
- `frontend/src/components/trips/UpdateTripStatusModal.tsx` — Modified (border sub-form)
- `frontend/src/components/trips/TripDetailDrawer.tsx` — Modified (border crossings tab)
- `frontend/src/app/(authenticated)/ops/tracking/page.tsx` — Modified (TrackingRow types + enhanced Excel export)
