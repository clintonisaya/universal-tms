# Story 1.3: Secure Authentication

**Epic:** 1 - System Foundation & Asset Registry
**Story Key:** 1-3-secure-authentication
**Status:** review

## 1. User Story

**As a** System User,
**I want** to log in securely,
**So that** I can access my dashboard without exposing my credentials.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Successful Login
**Given** I am on the Login Page
**When** I enter valid credentials (username/password)
**Then** I receive a `200 OK` response
**And** an HTTP-Only `access_token` cookie is set
**And** I am redirected to my role-based dashboard

### Scenario 2: Invalid Login
**Given** I am on the Login Page
**When** I enter incorrect credentials
**Then** I see an error message "Invalid username or password"
**And** NO cookie is set

### Scenario 3: Protected Route Access
**Given** I am NOT logged in
**When** I try to visit `/ops/dashboard`
**Then** I am redirected to `/login`

## 3. Technical Requirements

### 🏗️ Architecture & Stack
*   **Auth Protocol:** OAuth2 with Password Flow (adapted for Cookies).
*   **Token:** JWT (JSON Web Token) containing `sub` (username) and `role`.
*   **Transport:** **HTTP-Only Cookie** (Strict SameSite) for security (NOT localStorage).
*   **Backend:** `python-jose` for JWT encoding/decoding. `fastapi.security`.

### 🛠️ API Endpoints
*   `POST /login/access-token` (Standard OAuth form data).
*   `POST /login/test-token` (To verify current user).
*   `POST /logout` (Clear cookie).

### 📂 File Structure
*   `backend/app/core/security.py` (JWT logic)
*   `backend/app/api/login.py`
*   `frontend/src/app/login/page.tsx`
*   `frontend/src/middleware.ts` (Next.js Middleware for checking auth cookie presence/redirection).

## 4. Tasks/Subtasks

- [x] **Task 1:** Backend - Add role claim to JWT token
  - [x] 1.1: Modify create_access_token() to accept optional role parameter
  - [x] 1.2: Update login endpoint to pass user.role to token creation
  - [x] 1.3: Add tests verifying role is present in token payload

- [x] **Task 2:** Backend - Implement HTTP-Only cookie authentication
  - [x] 2.1: Create set_auth_cookie() and clear_auth_cookie() helper functions
  - [x] 2.2: Update /login/access-token to set HTTP-Only cookie (keep JSON response for backward compat)
  - [x] 2.3: Create POST /logout endpoint that clears the cookie
  - [x] 2.4: Create get_current_user_from_cookie() dependency (merged into get_token_from_header_or_cookie)
  - [x] 2.5: Add tests for cookie-based login, logout, and protected routes

- [x] **Task 3:** Frontend - Create Login Page
  - [x] 3.1: Create /login/page.tsx with Ant Design Card + Form
  - [x] 3.2: Style login page (centered card, gradient background)
  - [x] 3.3: Implement form submission with error handling
  - [x] 3.4: Redirect to /dashboard on successful login (+ placeholder dashboard)

- [x] **Task 4:** Frontend - Implement Auth Context & Middleware
  - [x] 4.1: Create AuthProvider context in /contexts/AuthContext.tsx
  - [x] 4.2: Add /api/me endpoint call to fetch current user (uses /login/test-token)
  - [x] 4.3: Create middleware.ts to protect routes (redirect to /login if no cookie)
  - [x] 4.4: Create placeholder /dashboard page for redirect target

## 5. Implementation Guide

1.  **Backend:**
    *   Setup `Access Token` creation logic.
    *   Endpoints should set `response.set_cookie(key="access_token", value=token, httponly=True)`.
2.  **Frontend:**
    *   Create a beautiful Login Form (Ant Design `Card` + `Form`).
    *   Handle the API call. Note: Browser handles cookies automatically; Front-end code just needs to handle the redirect on success.
    *   Implement `AuthProvider` context to hold current user state.

## 6. Dev Agent Record

### Implementation Summary
- Added `role` claim to JWT token payload for RBAC support
- Implemented dual authentication: Bearer header (backward compat) + HTTP-Only cookie
- Cookie settings: `httponly=true`, `samesite=strict`, `secure=true` (in non-local)
- Created `/logout` endpoint to clear auth cookie
- Built login page with Ant Design (gradient background, centered card)
- Created AuthProvider context for client-side auth state
- Implemented Next.js middleware for route protection

### Tests Created
- `test_access_token_contains_role_claim` - verifies role in JWT for regular users
- `test_access_token_contains_role_for_superuser` - verifies admin role in JWT
- `test_login_sets_httponly_cookie` - verifies cookie is set on login
- `test_logout_clears_cookie` - verifies cookie is cleared on logout
- `test_cookie_auth_access_protected_route` - verifies cookie-based auth works
- `test_invalid_login_no_cookie` - verifies no cookie on failed login

### Decisions Made
- Kept Bearer token auth alongside cookie auth for API compatibility
- Used `/login/test-token` as the user info endpoint (existing)
- Middleware redirects unauthenticated users to `/login` with `callbackUrl` param

## 7. File List

### Modified Files
- `backend/app/core/security.py` - Added role param, cookie helpers
- `backend/app/api/routes/login.py` - Cookie setting, logout endpoint
- `backend/app/api/deps.py` - Dual auth (header + cookie) dependency
- `backend/tests/api/routes/test_login.py` - 6 new auth tests
- `frontend/src/app/layout.tsx` - Added AuthProvider wrapper

### Created Files
- `frontend/src/app/login/page.tsx` - Login page component
- `frontend/src/app/dashboard/page.tsx` - Dashboard placeholder
- `frontend/src/contexts/AuthContext.tsx` - Auth state management
- `frontend/src/middleware.ts` - Route protection middleware

## 8. Change Log
- 2026-01-25: Story implementation started
- 2026-01-25: Task 1 - Added role claim to JWT token
- 2026-01-25: Task 2 - Implemented HTTP-Only cookie authentication
- 2026-01-25: Task 3 - Created Login Page with Ant Design
- 2026-01-25: Task 4 - Implemented Auth Context & Middleware
- 2026-01-25: All 73 backend tests passing, frontend builds successfully
- 2026-01-25: Story marked for review
