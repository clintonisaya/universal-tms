# Story 2.11: Global Admin & Settings Module

**Epic:** 2 - Core Logistics Cycle (and System Foundation)
**Story Key:** 2-11-admin-settings
**Status:** ready-for-dev
**Reference:** UX Design Specification Revision 6

## 1. User Story

**As an** Administrator (or Super User),
**I want** a centralized "Settings" module to manage Master Data (Location, Cargo, Vehicle Status) and Users,
**So that** I can configure the system dynamics and manage access without requiring developer intervention.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Managing Master Data (e.g., Cargo Types)
**Given** I am an Admin on the "Settings > General" page
**When** I click "Add Cargo Type"
**And** I enter "Copper Cathodes"
**Then** the new type appears in the list
**And** it immediately becomes available in the "Waybill Creation" cargo dropdown.

### Scenario 2: Managing Locations (Hierarchy)
**Given** I am on the "Settings > Locations" tab
**When** I add a new City "Tunduma" linked to Country "Tanzania"
**Then** it is saved with the correct relationship
**And** acts as a valid destination for Tribes/Waybills.

### Scenario 3: User Management (Visuals)
**Given** I am on the "User Management" page
**Then** I see the header "User Management" with a "Back" button
**And** I see a table with columns: "Name", "Username / Email", "Role", "Status", "Actions"
**And** the "Role" column shows colored badges (e.g., Admin is Red)
**And** the "Actions" column contains icons for Edit, Reset Password (Key), and Delete.

### Scenario 4: Creating a User
**When** I click the blue "+ Add User" button
**And** I fill in details (Name, Username, Role: "Finance")
**Then** the user is created
**And** the table refreshes showing the new user.

### Scenario 4: Security & Access
**Given** I am a "Manager"
**When** I try to access "Settings"
**Then** I can view/edit Master Data
**But** I CANNOT access the "Users" tab (Admin only).

## 3. Technical Requirements

### 🎨 UI Components (Ant Design Pro)
*   **Layout:** `Layout` with a secondary sidebar or tabs for Settings subsections.
*   **Components:**
    *   `ProList` or `EditableProTable` for simple key-value pairs (Cargo Types, Statuses).
    *   `ModalForm` for creating/editing complex entities (Users, Locations).
    *   `ProCard` to group related settings.

### 🏗️ Data Model & API
*   **Endpoints:**
    *   `GET/POST/PUT/DELETE /api/v1/cargo-types`
    *   `GET/POST/PUT/DELETE /api/v1/vehicle-statuses`
    *   `GET/POST/PUT/DELETE /api/v1/countries` & `/cities`
    *   `GET/POST/PUT/DELETE /api/v1/users` (Admin only)
*   **RBAC:** Middleware must enforce `admin` role for `/users` endpoints.

## 4. Tasks / Subtasks

- [x] Backend: Master Data API
    - [x] Create `CargoType` CRUD endpoints
    - [x] Create `VehicleStatus` CRUD endpoints
    - [x] Create `Country` & `City` CRUD endpoints
    - [x] Ensure RBAC permissions (Admin/Manager access)
- [x] Backend: User Management API
    - [x] Create `User` CRUD endpoints (Create, List, Disable)
    - [x] Implement `Reset Password` endpoint (Admin override)
- [x] Frontend: Settings Layout
    - [x] Create `app/settings/layout.tsx` (Tabs: General, Users)
- [x] Frontend: Master Data Pages
    - [x] Implement `EditableProTable` for Cargo Types
    - [x] Implement `EditableProTable` for Vehicle Statuses
    - [x] Implement Location Management (Country/City)
- [x] Frontend: User Management Page
    - [x] Implement User List (ProTable)
    - [x] Implement "Add User" Modal
    - [x] Implement "Reset Password" Action

## 5. Dev Notes

*   **Pattern:** Use `EditableProTable` for "Inline Edit" feel where possible (e.g., fixing a typo in a Cargo Type).
*   **Security:** User creation should probably set a temporary password or default one that must be changed.
*   **State:** Invalidating `queryKey` ['cargoTypes'] is critical after adding a new type so it updates globally.

## 6. References
*   [UX Design Spec Revision 6](file:///C:/Users/IT/Documents/GitHub/edupo-tms/_bmad-output/planning-artifacts/ux-design-specification.md#revision-6-global-admin--settings-module)
