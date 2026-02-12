# Story 2.24: Dynamic Role-Based Access Control (RBAC)

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-24-dynamic-permissions
**Status:** in-progress

## 1. User Story

**As a** Super Admin or Manager,
**I want** to configure specific permissions for each user,
**So that** I can control exactly which features they can see and which operations they can perform (e.g., creating trips, approving expenses).

## 2. Acceptance Criteria (BDD)

### Scenario 1: Assigning Permissions
**Given** I am a Manager or Admin editing a User "John Ops"
**When** I open the "Permissions" tab in the user edit modal
**And** I select "View Trips" and "Create Trips" but deselect "Delete Trips"
**Then** the user "John Ops" is saved with these specific permissions.

### Scenario 2: Enforcing View Permissions (Frontend)
**Given** "John Ops" does NOT have "View Reports" permission
**When** he logs in
**Then** he does NOT see the "Reports" link in the sidebar
**And** if he navigates to `/reports` directly, he is shown a 403 Forbidden page.

### Scenario 3: Enforcing Operation Permissions (Backend)
**Given** "John Ops" has "View Trips" but NOT "Delete Trips" permission
**When** he tries to click the "Delete" button on a trip
**Then** the button is either hidden or disabled
**And** if he calls the `DELETE /api/v1/trips/{id}` API directly
**Then** the backend returns a 403 Forbidden error.

### Scenario 4: Manager Access to Settings
**Given** I am a Manager
**When** I navigate to Settings
**Then** I can now see the "User Management" tab (previously Admin only)
**But** I can only edit users with equal or lower roles (Ops, Driver, etc.), not other Admins.

## 3. Technical Requirements

### 🏗️ Data Model
*   **User Model:** Add `permissions` column (JSON/Array of strings).
*   **Permission Constants:** Define a standard list of permissions (e.g., `trips:read`, `trips:write`, `expenses:approve`).

### 🔐 Backend
*   Update `User` model and schemas.
*   Update `GET /users` and `PATCH /users/{id}` to handle permissions.
*   Create a `PermissionChecker` dependency or utility.
*   Update critical routes (`trips`, `expenses`, `reports`) to check specific permissions.

### 🎨 Frontend
*   **User Management:** Add a generic "Permissions" selector (Checkbox Group or Transfer list) to the User Form.
*   **AuthContext:** Include `permissions` in the user session.
*   **ProtectedLayout:** Filter navigation menu based on permissions.
*   **Components:** Add a `Can` component (e.g., `<Can permission="trips:delete"><Button ... /></Can>`).

## 4. Tasks

- [ ] **Task 1: Backend Data Model**
    - [ ] Add `permissions` column to `User` model (JSON type).
    - [ ] Create migration.
    - [ ] Define `PERMISSIONS` constant list.
    - [ ] Update `UserCreate` and `UserUpdate` schemas.

- [ ] **Task 2: Backend Logic & API**
    - [ ] Update `users.py` router to allow Managers to list/edit users.
    - [ ] Update `trips.py` to check `trips:create`, `trips:edit`, `trips:delete`.
    - [ ] Update `expenses.py` to check `expenses:approve`, `expenses:pay`.

- [ ] **Task 3: Frontend Permissions UI**
    - [ ] Update `User` type definition.
    - [ ] Update `AddUserModal` / `EditUserModal` to include a Permissions selector.
    - [ ] Fetch available permissions list (or hardcode on frontend if static).

- [ ] **Task 4: Frontend Enforcement**
    - [ ] Update `AuthContext` to expose `hasPermission(permission: string)`.
    - [ ] Create `PermissionGuard` or `Can` component.
    - [ ] Update `Sidebar` to filter items based on permissions.
    - [ ] Protect routes in `ProtectedLayout`.

## 5. Permissions List (Initial)
*   `dashboard:view`
*   `trips:view`, `trips:create`, `trips:edit`, `trips:delete`
*   `expenses:view`, `expenses:create`, `expenses:approve`, `expenses:pay`
*   `tracking:view`
*   `reports:view`
*   `settings:view`, `settings:users:view`, `settings:users:edit`
*   `master_data:view`, `master_data:edit`
