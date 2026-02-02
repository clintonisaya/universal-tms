# Story 2.6: Real-Time Status Dashboard

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-6-real-time-status-dashboard
**Status:** ready-for-dev

## 1. User Story

**As a** Manager,
**I want** to see status changes instantly (Optimistic UI + Live Updates),
**So that** I don't have to keep refreshing the page.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Live Update
**Given** I am on the Dashboard
**When** Ops submits a new expense (on another computer)
**Then** my "Pending Requests" count increments automatically within 2 seconds
**And** a toast notification appears: "New Expense Request from Ops"

### Scenario 2: Optimistic UI
**Given** I approve a request
**When** I click "Approve"
**Then** the UI updates to "Approved" *immediately* (before server response)
**And** if the server fails, it reverts and shows an error

## 3. Technical Requirements

### 🏗️ Architecture & Stack
*   **Communication:** WebSockets (Socket.IO or raw WebSockets).
*   **Library:** `fastapi-socketio` (Backend) + `socket.io-client` (Frontend).
*   **State:** TanStack Query `onSuccess` invalidation + Optimistic Updates.

### 📂 File Structure
*   `backend/app/main.py` (Mount SocketIO app).
*   `frontend/src/lib/socket.tsx` (Context Provider).

## 4. Implementation Guide

1.  **Backend:**
    *   Install `python-socketio`.
    *   Emit event `expense_created` when POST /expenses is called.
2.  **Frontend:**
    *   Wrap app in `SocketProvider`.
    *   In the Dashboard component, `useSocket().on('expense_created', () => queryClient.invalidateQueries(['expenses']))`.
    *   For Optimistic UI: Use TanStack Query `onMutate` to update the cache instantly.

## 5. Visual Design Requirements (Revision 1)

**Reference:** `ux-design-specification.md` (Revision 1)
**Design Target:** Enterprise Density Dashboard (Dark Sidebar, Light Content, Card Widgets).

### Layout & Theme
*   **Sidebar:** Dark Navy theme. Menu items: Dashboard (Active), Inventory, Operations, Management, Office Expenses.
*   **Content Area:** Light Gray (`#f5f7fa`) background using `Ant Design ProLayout` structure.

### Widgets (Top Row)
*   **Implementation:** Create a reusable `MetricCard` component.
*   **Data Points:**
    1.  **Total Trucks:** Count (+trend).
    2.  **Completed Trips:** Count (+trend).
    3.  **Trucks In Transit:** Count (Highlighted/Active status). *Live Update Source*.
    4.  **Active Alerts:** Count (Critical). *Live Update Source*.
    5.  **Avg. Profit/Day:** Currency Display.

### Charts (Middle Row)
*   **Profit Trend:** Line Chart (Recharts or Ant Design Charts). Curve interpolation.
*   **Vehicle Utilization:** Stacked Bar Chart. Colors: Orange (Idle), Navy (Transit), Teal (Border), Blue (Maintenance).

### Recent Activity (Bottom Row)
*   **Table:** `ProTable` (AntD).
*   **Columns:** Driver (Avatar+Name), Destination, Status (Pill), Profit (Green Text).
*   **Interaction:** Row click -> Navigate to Trip Detail.

## 6. Tasks

### Frontend Implementation
- [x] **1. Project Structure & Layout** <!-- id: 6.1 -->
    - [x] [IMPL] Install `antd`, `@ant-design/pro-components`, `@ant-design/plots` (or recharts)
    - [x] [IMPL] Create `DashboardLayout` component (Sidebar + Header)
    - [x] [IMPL] Configure Ant Design theme (Colors, Typography)

- [x] **2. Dashboard UI Components** <!-- id: 6.2 -->
    - [x] [IMPL] Create `MetricCard` component
    - [x] [IMPL] Create `ProfitTrendChart` component
    - [x] [IMPL] Create `UtilizationChart` component
    - [x] [IMPL] Create `RecentTripsTable` component with mocked data first

- [x] **3. Real-time Integration** <!-- id: 6.3 -->
    - [x] [IMPL] Create `SocketProvider` context
    - [x] [IMPL] Integrate WebSocket events to update `MetricCard` (Active Alerts, In Transit)
    - [x] [IMPL] Implement Optimistic UI updates for "Approve" action in table

## 7. Dev Agent Record

### File List
*   `backend/requirements.txt`
*   `backend/app/main.py`
*   `backend/app/core/socket.py`
*   `frontend/src/lib/socket.tsx`
*   `frontend/src/components/dashboard/MetricCard.tsx`
*   `frontend/src/components/dashboard/ProfitTrendChart.tsx`
*   `frontend/src/components/dashboard/UtilizationChart.tsx`
*   `frontend/src/components/dashboard/RecentTripsTable.tsx`
*   `frontend/src/components/dashboard/DashboardLayout.tsx`
*   `frontend/src/components/layout/ProtectedLayout.tsx`
*   `frontend/src/app/dashboard/layout.tsx`
*   `frontend/src/app/dashboard/page.tsx`
*   `frontend/src/app/fleet/layout.tsx`
*   `frontend/src/app/ops/layout.tsx`
*   `frontend/src/app/login/page.tsx`
*   `frontend/src/app/page.tsx`
*   `frontend/src/middleware.ts`
*   `frontend/src/contexts/AuthContext.tsx`
*   `frontend/src/components/dashboard/__tests__/DashboardLayout.test.tsx`
*   `frontend/vitest.config.ts`

### Change Log
*   2026-01-27: Implemented WebSocket backend infrastructure (Socket.IO).
*   2026-01-27: Created Frontend SocketProvider and Dashboard Components.
*   2026-01-27: Assembled Dashboard Page with real-time listeners and Optimistic UI.
*   2026-01-27: Fixed test configuration and passed all tests.
*   2026-01-27: Fixed socket.ts → socket.tsx (JSX syntax required .tsx extension).
*   2026-01-27: Updated DashboardLayout sidebar navigation to link to implemented pages (Fleet: /fleet/trucks, /fleet/drivers, /fleet/trailers; Ops: /ops/trips). Disabled unimplemented routes.
*   2026-01-27: Added ProtectedLayout component for auth-protected routes with persistent sidebar.
*   2026-01-27: Created layouts for /fleet and /ops routes to include sidebar on all pages.
*   2026-01-27: Enhanced middleware auth protection - redirects unauthenticated users to /login with callbackUrl.
*   2026-01-27: Updated login page to handle callbackUrl for redirect after successful login.
