# Story 4.6: Trip Summary Enhancement (Dashboard & Trip Page)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **Operations Manager**,
I want to see the **waybill rate**, **waybill risk level**, and **location update time** in both the **dashboard's recent trip summary** and the **main Trip page**,
so that I can quickly assess trip profitability, risk exposure, and current status from any view without navigating to waybill details.

## Scope

This story enhances trip information display in **TWO locations**:
1. **Dashboard** - Recent Trips table (summary view, limited to 5 trips)
2. **Trip Page** - `/ops/trips` table (full list view with all trips)

Both tables will receive the same new columns with consistent formatting and RBAC rules.

## Acceptance Criteria

### AC1: Display Waybill Rate (Admin/Manager Only) - Both Views
**Given** I am viewing the Recent Trips table on the **Dashboard** OR the Trip table on the **Trip Page**  
**And** my role is **admin** or **manager**  
**When** a trip has an associated waybill with a rate  
**Then** the rate should be displayed in a dedicated `Rate` column  
**And** the rate should be formatted as currency with the appropriate symbol (TZS/USD based on the system base currency)  
**And** if no waybill or rate exists, display "-" or "N/A"  
**And** if my role is not admin or manager, the Rate column should not be visible
**And** the column formatting and behavior should be identical in both views

### AC2: Display Waybill Risk Level (All Roles) - Both Views
**Given** I am viewing the Recent Trips table on the **Dashboard** OR the Trip table on the **Trip Page**  
**When** a trip has an associated waybill with a risk level  
**Then** the risk level should be displayed in a dedicated `Risk` column  
**And** the risk should be displayed as a badge with appropriate color coding (e.g., Low=green, Medium=orange, High=red)  
**And** if no waybill or risk data exists, display "-" or "N/A"  
**And** this column should be visible to **all roles** (not restricted)
**And** the risk badge colors and formatting should be identical in both views

### AC3: Display Location Update Time (All Roles) - Both Views
**Given** I am viewing the Recent Trips table on the **Dashboard** OR the Trip table on the **Trip Page**  
**When** looking at the timestamp column  
**Then** I should see a `Last Updated` column showing the most recent location/status update time  
**And** on the **Dashboard**, the `created_at` field should be replaced by this column  
**And** on the **Trip Page**, the `Last Updated` column should be added (Start Date column remains)  
**And** the timestamp should be formatted as relative time (e.g., "2 hours ago") with tooltip showing absolute time  
**And** this column should be visible to **all roles** (not restricted)

### AC4: Consistent Trip Status Colors - Dashboard Only
**Given** I am viewing the Recent Trips table on the **Dashboard**  
**When** each trip has a status indicator  
**Then** the status badge colors must match exactly with the Trip page status colors:
- Waiting: default (gray)
- Dispatch: purple
- Loading: gold  
- In Transit: blue
- At Border: purple
- Offloaded: cyan
- Returned: geekblue
- Waiting for PODs: orange
- Completed: green
- Cancelled: red
**And** this status column should be visible to **all roles**
**Note**: The Trip Page already has correct status colors defined

### AC5: Data Accuracy and Real-time Updates
**Given** the dashboard uses WebSocket connections for real-time updates  
**When** a trip's status, location, or waybill data is updated  
**Then** the Recent Trips table should reflect the changes within 2 seconds  
**And** the location update timestamp should refresh automatically  
**And** rate and risk columns (if visible to user) should update when waybill data changes

### AC6: Role-Based Column Visibility
**Given** I am viewing the Recent Trips table on the dashboard  
**When** my user role is checked  
**Then** if I am an **admin** or **manager**, I should see the `Rate` column  
**And** if I am any other role (ops, finance, driver), the Rate column should be hidden  
**And** the `Location Update Time`, `Risk`, and `Status` columns should be visible to **all roles**  
**And** the table should render gracefully without the Rate column for unauthorized roles

## Tasks / Subtasks

### Dashboard Recent Trips Table
- [ ] Update RecentTripsTable component structure (AC: #1, #2, #3, #4, #6)
  - [ ] Add `Rate` column to display waybill rate (admin/manager only)
  - [ ] Add `Risk` column to display waybill risk level with colored badges (all roles)
  - [ ] Replace `Created At` column with `Location Update Time` column (all roles)
  - [ ] Implement STATUS_COLORS constant matching Trip page (all roles)
  - [ ] Update column rendering logic for new fields
  - [ ] Implement role-based conditional column rendering for Rate column using useAuth hook

### Trip Page Table
- [ ] Update Trip page table component structure (AC: #1, #2, #3, #6)
  - [ ] Add `Rate` column to display waybill rate (admin/manager only)
  - [ ] Add `Risk` column to display waybill risk level with colored badges (all roles)
  - [ ] Add `Last Updated` column showing location/status update time (all roles)
  - [ ] Keep existing `Start Date` column (do not replace)
  - [ ] Update column rendering logic for new fields
  - [ ] Implement role-based conditional column rendering for Rate column using useAuth hook
  - [ ] Ensure status colors remain consistent (already defined in STATUS_COLORS)
  
### Backend & Data
- [ ] Backend API enhancement (AC: #1, #2, #3)
  - [ ] Modify `/api/v1/dashboard/recent-trips` endpoint to include waybill rate, risk, and location_update_time
  - [ ] Modify `/api/v1/trips` endpoint to include waybill rate, risk, and location_update_time
  - [ ] Ensure proper joins with waybill table for rate and risk data
  - [ ] Add risk level enum/field to waybill schema if not exists
  - [ ] Calculate or fetch location_update_time from trip status/location logs
  
### Frontend Data & Types
- [ ] Frontend data fetching (AC: #5)
  - [ ] Update TanStack Query hook `useRecentTrips` type definitions
  - [ ] Update TanStack Query hook for trips list type definitions
  - [ ] Ensure WebSocket updates trigger cache invalidation for both views
  - [ ] Regenerate API types from OpenAPI spec after backend changes
  
### Styling & Formatting
- [ ] Styling and formatting (AC: #1, #2, #3)
  - [ ] Create or reuse currency formatting utility for rate display
  - [ ] Create or reuse relative time formatting for location updates
  - [ ] Create getRiskColor utility for risk badge color mapping
  - [ ] Ensure consistent styling between Dashboard and Trip Page tables
 
### Testing
- [ ] Testing (AC: All)
  - [ ] Unit tests for column rendering with new fields (both Dashboard and Trip Page)
  - [ ] Integration tests for API endpoint changes (both endpoints)
  - [ ] Visual regression testing for status colors (Dashboard only)
  - [ ] RBAC testing: verify Rate column visibility by role (both views)
  - [ ] Manual testing: verify colors and formatting match between dashboard and trip page
  - [ ] Real-time update testing: verify WebSocket triggers update both tables

## Dev Notes

**CRITICAL**: This story enhances trip information display in **TWO locations**:

1. **Dashboard Recent Trips Table** - Summary view (5 most recent trips)
2. **Trip Page (`/ops/trips`) Table** - Full list view (all trips with pagination)

The primary goals are:
1. Add financial visibility (waybill rate) - **ADMIN/MANAGER ONLY** - Both views
2. Add risk awareness (waybill risk level) - **ALL ROLES** - Both views
3. Improve operational awareness (last location update time) - **ALL ROLES** - Both views
4. Ensure visual consistency (status colors) - **ALL ROLES** - Dashboard only (Trip page already correct)

### Role-Based Access Control (RBAC)

**Critical Security Requirement**: The `Rate` column contains sensitive financial data and MUST only be visible to admin and manager roles. The `Risk`, `Location Update Time`, and `Status` columns are operational data visible to all roles.

**Implementation Pattern** (from dashboard/page.tsx lines 62-69):
```typescript
// Use the existing canSee helper function
const FULL_ACCESS_ROLES = ["admin", "manager"];

function canSee(role: string | undefined, allowedRoles: string[]): boolean {
  if (!role) return false;
  if (FULL_ACCESS_ROLES.includes(role)) return true;
  return allowedRoles.includes(role);
}
```

**Column Visibility Logic**:
- Status Column with colors: **ALWAYS VISIBLE** (all roles)
- Location Update Time Column: **ALWAYS VISIBLE** (all roles)
- Risk Column: **ALWAYS VISIBLE** (all roles)
- Rate Column: **CONDITIONAL** - Only render if `user.role === "admin" || user.role === "manager"`
- Other columns (Driver, Destination, etc.): **ALWAYS VISIBLE** (all roles)

**React Implementation**:
```typescript
const { user } = useAuth();
const showFinancialData = canSee(user?.role, []); // Admin/Manager only

// In columns definition
const columns = [
  // ... always visible columns
  {
    title: "Risk",
    dataIndex: "waybillRisk",
    render: (risk) => <Tag color={getRiskColor(risk)}>{risk}</Tag>
  },
  // ... conditionally show Rate for admin/manager
  ...(showFinancialData ? [{
    title: "Rate",
    dataIndex: "waybillRate",
    render: (rate) => formatCurrency(rate)
  }] : []),
  // ... more columns
];
```

### Architecture Patterns

Per **Architecture.md**:
- **State Management**: Use TanStack Query (v5) - NO `useEffect` for data fetching
- **API Client**: Orval-generated hooks from OpenAPI spec
- **Case Conversion**: Backend returns `snake_case`, frontend converts to `camelCase`
- **Real-time**: WebSockets for live updates (already implemented for dashboard)

### Source Tree Components

#### Frontend Files to Modify:

**Dashboard:**
1. **RecentTripsTable Component** (Location TBD - check if exists in `components/dashboard/`)
   - Add new columns (Rate, Risk, Location Update Time)
   - Remove Created At column
   - Import and apply STATUS_COLORS from Trip page

2. **`frontend/src/app/(authenticated)/dashboard/page.tsx`** (Lines 1-392)
   - Already imports `useRecentTrips` hook (line 12)
   - WebSocket integration already in place (lines 136-217)
   - May need type updates for new fields

**Trip Page:**
3. **`frontend/src/app/(authenticated)/ops/trips/page.tsx`** (Lines 1-290)
   - Main trips table with STATUS_COLORS already defined (lines 38-49)
   - Add new columns (Rate, Risk, Last Updated) to existing table
   - Implement role-based column visibility for Rate
   - Keep existing Start Date column (don't replace)

**Shared:**
4. **`frontend/src/components/dashboard/` directory**
   - Current components: DashboardLayout, MetricCard, ProfitTrendChart, etc.
   - Need to locate or create RecentTripsTable component

5. **`frontend/src/hooks/useApi.ts`**
   - Update `useRecentTrips` TypeScript interfaces
   - Update trips list hook interfaces
   - Ensure return types include `waybill_rate`, `waybill_risk`, and `location_update_time`

#### Backend Files to Modify:
1. **Trip API Endpoints** (`backend/app/api/v1/trips.py` or similar)
   - Modify endpoint for recent trips that returns dashboard data
   - Modify main trips list endpoint for Trip page
   - Add JOIN with waybill table to fetch rate and risk
   - Include `location_update_time` or calculate from status updates

2. **Pydantic Schemas** (`backend/app/schemas/trip.py` or `dashboard.py`)
   - Add `waybill_rate` field (Optional[Decimal])
   - Add `waybill_risk` field (Optional[str] or enum)
   - Add `location_update_time` or `status_update_time` field (datetime)
   - Update both TripResponse schema and DashboardTripResponse schema if separate
   - Regenerate OpenAPI spec after changes

### Testing Standards

Per **Architecture.md**:
- Testing framework: (Need to discover what's in use - Jest for frontend likely)
- Backend: Python pytest (assumed based on FastAPI)
- Manual browser testing required for visual validation

**Critical Test**: Visual comparison of status colors between Dashboard Recent Trips and `/ops/trips` page

### Project Structure Notes

Per **Architecture.md** (lines 134-160):
```
frontend/
├── src/
│   ├── app/(authenticated)/dashboard/page.tsx  ← Dashboard page
│   ├── components/dashboard/                    ← Dashboard components
│   ├── hooks/useApi.ts                          ← API hooks
│   └── types/trip.ts                            ← Type definitions
```

### Implementation Sequence

1. **Backend First** (Schema-driven development per Architecture.md line 106):
   - Update Pydantic models (add rate, risk, location_update_time)
   - Modify BOTH API endpoints (dashboard recent trips + main trips list)
   - Add waybill joins and risk field if needed
   - Regenerate `openapi.json`
   
2. **Frontend Auto-sync**:
   - Run `npm run generate:api` to update types
   - TypeScript will show exactly what needs updating in both components
   
3. **Component Updates**:
   - **Dashboard**: Locate/create RecentTripsTable, add columns, import STATUS_COLORS
   - **Trip Page**: Add columns to existing table (lines 90-180), implement RBAC for Rate
   - Create shared utilities (formatCurrency, getRiskColor, formatRelativeTime)
   - Implement role-based rendering for Rate column in both views

4. **Validation**:
   - Test real-time updates via WebSocket for both tables
   - Compare status colors visually (Dashboard should match Trip Page)
   - Test RBAC: login as different roles, verify Rate column visibility
   - Verify Risk badges use consistent colors in both views

### References

- **Trip Status Colors**: [frontend/src/app/(authenticated)/ops/trips/page.tsx](file:///c:/Users/IT/Documents/GitHub/edupo-tms/frontend/src/app/(authenticated)/ops/trips/page.tsx#L38-L49)
- **Dashboard Page**: [frontend/src/app/(authenticated)/dashboard/page.tsx](file:///c:/Users/IT/Documents/GitHub/edupo-tms/frontend/src/app/(authenticated)/dashboard/page.tsx)
- **Architecture**: [_bmad-output/planning-artifacts/architecture.md](file:///c:/Users/IT/Documents/GitHub/edupo-tms/_bmad-output/planning-artifacts/architecture.md)
- **UX Spec**: [_bmad-output/planning-artifacts/ux-design-specification.md](file:///c:/Users/IT/Documents/GitHub/edupo-tms/_bmad-output/planning-artifacts/ux-design-specification.md)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Frontend build: PASS (no TypeScript errors)
- Backend model import: PASS (TripPublic has waybill_rate, waybill_currency, waybill_risk_level, location_update_time)
- Backend trips route: PASS (9 routes loaded)

### Completion Notes List

1. **Backend**: Added `waybill_rate`, `waybill_currency`, `waybill_risk_level`, `location_update_time` to `TripPublic` schema. Modified `read_trips` endpoint to batch-fetch waybills and enrich trip data. `location_update_time` is calculated as the most recent tracking milestone date (dispatch, loading, offloading, etc.), falling back to `start_date`.
2. **Frontend types**: Added 4 new optional fields to `Trip` interface in `types/trip.ts`.
3. **RecentTripsTable**: Created new component at `components/dashboard/RecentTripsTable.tsx` with STATUS_COLORS matching Trip page, Risk badges (color-coded), Rate column (admin/manager only via RBAC), Last Updated column (relative time with tooltip), and row actions.
4. **Trip page**: Added Risk, Rate (RBAC), and Last Updated columns to `/ops/trips` table. Rate column conditionally rendered for admin/manager roles only.
5. **Shared utilities**: `getRiskColor`, `formatCurrency`, `formatRelativeTime` defined locally in both components (duplicated intentionally to avoid premature abstraction — can be extracted to shared util if a third use case appears).

### File List

- `backend/app/models.py` — Added 4 enrichment fields to TripPublic
- `backend/app/api/routes/trips.py` — Modified read_trips to JOIN waybill, enrich response
- `frontend/src/types/trip.ts` — Added waybill_rate, waybill_currency, waybill_risk_level, location_update_time
- `frontend/src/components/dashboard/RecentTripsTable.tsx` — NEW: Dashboard recent trips component
- `frontend/src/components/dashboard/__tests__/RecentTripsTable.test.tsx` — Updated tests for new columns
- `frontend/src/app/(authenticated)/ops/trips/page.tsx` — Added Risk, Rate, Last Updated columns
