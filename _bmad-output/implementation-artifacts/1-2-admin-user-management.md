# Story 1.2: Admin User Management

**Epic:** 1 - System Foundation & Asset Registry
**Story Key:** 1-2-admin-user-management
**Status:** review

## 1. User Story

**As a** Super Admin,
**I want** to create the initial staff accounts (Manager, Ops, Finance) and assign their roles,
**So that** the correct staff can access the system with appropriate permissions.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Create New User
**Given** I am logged in as a Super Admin
**And** I am on the "User Management" page
**When** I fill out the "Create User" form with:
    - Username: "ops_user"
    - Password: "securePassword123"
    - Role: "Ops"
**Then** a new user is created in the database
**And** the password is securely hashed (never stored plain)
**And** the user appears in the User List

### Scenario 2: Duplicate Prevention
**Given** a user "ops_user" already exists
**When** I try to create another user with username "ops_user"
**Then** I receive a "Username already exists" error
**And** the user is NOT created

### Scenario 3: Role Assignment
**Given** the configured roles are Admin, Manager, Ops, Finance
**When** I select "Finance" from the Role dropdown
**Then** the created user has the `FINANCE` permission scope

## 3. Tasks/Subtasks

- [x] **Task 1:** Add UserRole enum to models (Admin, Manager, Ops, Finance)
  - [x] 1.1: Create UserRole enum in models.py
  - [x] 1.2: Add role field to User model with default
  - [x] 1.3: Update UserCreate, UserUpdate, UserPublic schemas to include role
  - [x] 1.4: Create Alembic migration for role field

- [x] **Task 2:** Replace email with username in User model
  - [x] 2.1: Update models.py to use username instead of email
  - [x] 2.2: Update crud.py with get_user_by_username
  - [x] 2.3: Update authenticate function to use username
  - [x] 2.4: Update all API routes to use username
  - [x] 2.5: Update login route to use username
  - [x] 2.6: Update config.py to use FIRST_SUPERUSER as username
  - [x] 2.7: Update migration to replace email with username

- [x] **Task 3:** Update user creation endpoint
  - [x] 3.1: Ensure only superusers can create users (already exists)
  - [x] 3.2: Validate role is one of the allowed values (enum validation)

- [x] **Task 4:** Add tests for role-based user creation
  - [x] 4.1: Test creating user with each role type
  - [x] 4.2: Test duplicate username rejection
  - [x] 4.3: Test new user can log in immediately
  - [x] 4.4: Test invalid role rejection

## 4. Dev Agent Record

### Implementation Plan
1. Created UserRole enum with four roles: admin, manager, ops, finance
2. Replaced email field with username field throughout the codebase
3. Updated all CRUD functions to use username
4. Updated API routes to use username instead of email
5. Simplified login to just username/password (removed email recovery)
6. Created Alembic migration to replace email column with username column
7. Updated all tests to use username

### Completion Notes
- UserRole enum implemented with four roles as specified in FR-ADMIN-01
- Authentication now uses username instead of email
- Password hashing uses Argon2 (secure)
- Duplicate username check returns 400 error
- Pydantic enum validation automatically rejects invalid roles (422 error)
- First superuser created on init with username from FIRST_SUPERUSER env var

## 5. File List

### Modified Files
- backend/app/models.py (replaced email with username, added UserRole enum)
- backend/app/crud.py (replaced get_user_by_email with get_user_by_username)
- backend/app/api/routes/users.py (updated all email refs to username)
- backend/app/api/routes/login.py (simplified, removed password recovery)
- backend/app/core/config.py (removed email settings, FIRST_SUPERUSER is now username)
- backend/app/core/db.py (updated to use username for init)
- backend/app/utils.py (simplified, removed email functionality)
- backend/tests/conftest.py (updated to use username)
- backend/tests/utils/user.py (updated to use username)
- backend/tests/utils/utils.py (added random_username, removed random_email)
- .env (FIRST_SUPERUSER changed from email to username)
- .env.example (updated to reflect username)

### Created Files
- backend/app/alembic/versions/a1b2c3d4e5f6_add_role_to_user.py
- backend/tests/api/routes/test_user_roles.py

## 6. Change Log
- 2026-01-25: Story created for implementation
- 2026-01-25: Implemented UserRole enum and role field
- 2026-01-25: Replaced email with username throughout backend
- 2026-01-25: Created migration for username + role columns
- 2026-01-25: Updated all tests for username-based auth
- 2026-01-25: Story completed and marked for review
