# Story 2.10: Comprehensive Waybill Tracking (Control Tower)

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-10-waybill-tracking
**Status:** ready-for-dev
**Reference:** `WakaWaka` Screenshot (Rich Table)

## 1. User Story

**As an** Ops Manager,
**I want** a "WakaWaka-style" Control Tower dashboard with high-density data and quick filters,
**So that** I can track every specific detail (Mileage, Fuel, Borders) and filter by specific entities (Truck, Driver, Client) without page reloads.

## 2. Acceptance Criteria (BDD)

### Scenario 1: The "Rich" Grid View
**Given** I am on the "Waybill Tracking" page
**When** I view the list
**Then** I see the following specific columns:
    1.  **Status Plls:** Waybill Status (Blue/Green), Trip Status (Yellow "In Operation").
    2.  **IDs:** Waybill Number, Trip Number (Clickable Links).
    3.  **Entity Info:** Client, Cargo Type, Cargo Weight.
    4.  **Route Info:** Transportation Route (Origin-Dest), Destination, Border.
    5.  **Asset Info:** Truck No, Trailer No, Driver Name.
    6.  **Metrics:** Vehicle Mileage, Fuel Consumption (Estimated).
    7.  **Risk:** Risk Level (High/Medium/Low).

### Scenario 2: Advanced Filtering (The Top Bar)
**Given** I am on the dashboard
**Then** I see **Tabs** at the top:
    - `All` | `Loading` | `Tracking` | `Received` | `Cancel` | `POD Collected`
**And** I see a **Search Row** with multiple inputs:
    - [Search Waybill #] [Search Trip #] [Search Truck No] [Search Trailer No] [Search Client] [Search Driver]
**When** I type in "Search Truck No"
**Then** the table updates instantly (or on clicking "Query").

### Scenario 3: Excel Export
**When** I click "Export", I get the exact "Rich" view in Excel format.

## 3. Technical Requirements

### 🎨 UI Components (Ant Design Pro)
*   **Component:** `ProTable` with `search={false}` (Custom Search Bar).
*   **Search Bar:** A custom `Form` row above the table with 6 inputs.
*   **Density:** `size="small"` (Compact Mode) is MANDATORY.
*   **Pagination:** 100 items per page (as seen in screenshot "1 to 100").

### 🏗️ Data Model & Read Optimization
*   **Backend:** Requires a joined DTO (`WaybillTrackingDTO`).
*   **Fields:**
    *   `waybill_status` (Enum)
    *   `trip_status` (Enum)
    *   `border_location` (Derived from last check-in)
    *   `mileage` (Calculated distance)
    *   `fuel_consumption` (mileage * avg_consumption)

## 4. Tasks / Subtasks

- [ ] Validated Backend Dashboard Query
    - [ ] Create `WaybillTrackingDTO` with all required fields (15+)
    - [ ] Optimize Join Query (Waybill -> Trip -> Truck -> Driver)
- [ ] Frontend: Control Tower Page (AntD ProTable)
    - [ ] Implement Custom Search Bar (6 Inputs)
    - [ ] Implement Status Tabs (Segmented Control)
    - [ ] Implement High-Density Table (Columns matching screenshot)
    - [ ] **NEW**: Enable Horizontal Scrolling (`scroll={{ x: 'max-content' }}`)
    - [ ] **NEW**: Enable Resizable Columns
    - [ ] Add "Export" functionality
