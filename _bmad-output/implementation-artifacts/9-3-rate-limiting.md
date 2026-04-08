# Story 9.3: API Rate Limiting

**Epic:** 9 - Security Hardening
**Story Key:** 9-3-rate-limiting
**Status:** review

## 1. User Story

**As a** System Administrator,
**I want** rate limiting on API endpoints,
**So that** the system is protected from brute force attacks, credential stuffing, and abuse.

## 2. Acceptance Criteria

### Scenario 1: Login endpoint rate limited
**Given** a client sends multiple failed login attempts
**When** the threshold is exceeded (e.g., 5 attempts per minute)
**Then** subsequent requests receive `429 Too Many Requests`
**And** the response includes a `Retry-After` header

### Scenario 2: General API rate limiting
**Given** a client sends a high volume of API requests
**When** the per-minute threshold is exceeded
**Then** requests are throttled with `429 Too Many Requests`

### Scenario 3: Rate limits are configurable
**Given** rate limit thresholds need adjustment
**When** environment variables are updated
**Then** the new limits take effect on restart

## 3. Tasks/Subtasks

- [x] **Task 1:** Install and configure rate limiting
  - [x] 1.1: Add `slowapi` to backend dependencies
  - [x] 1.2: Create rate limiter instance in `backend/app/core/limiter.py`
  - [x] 1.3: Add `SlowAPIMiddleware` to `backend/app/main.py`
  - [x] 1.4: Add rate limit config vars to settings (e.g., `RATE_LIMIT_LOGIN`, `RATE_LIMIT_DEFAULT`)

- [x] **Task 2:** Apply rate limits to sensitive endpoints
  - [x] 2.1: Add aggressive limit to `POST /login/access-token` (e.g., 5/minute)
  - [x] 2.2: Add limit to `POST /signup` (if enabled)
  - [x] 2.3: Add default limit to all other routes (e.g., 100/minute)

- [x] **Task 3:** Handle rate limit responses
  - [x] 3.1: Verify 429 response includes proper headers
  - [x] 3.2: Write test: exceeding login rate limit returns 429
  - [x] 3.3: Write test: normal usage stays within limits

## 4. Dev Notes

- Finding #6 from QA scan (Critical)
- `slowapi` is the standard rate limiting library for FastAPI
- Login endpoint is the highest priority target
- This is an internal system so limits can be more generous than public APIs

## 5. Status

- Status: review

## 6. Dev Agent Record

### Implementation Plan
- Used `slowapi` (standard FastAPI rate limiting library) backed by in-memory storage
- Login endpoint gets aggressive 5/minute limit; signup gets same; all other routes get 100/minute default
- Custom 429 handler includes `Retry-After` header per AC
- Rate limits configurable via `RATE_LIMIT_LOGIN` and `RATE_LIMIT_DEFAULT` env vars

### Completion Notes
- All 3 tasks and 9 subtasks completed
- `slowapi` added to both `pyproject.toml` and `requirements.txt`
- Rate limiter instance created in `app/core/limiter.py` with default limit from settings
- Custom exception handler in `main.py` returns 429 with `Retry-After` header
- Login and signup endpoints decorated with `@limiter.limit()`
- Tests created but not executed (per user request — dev environment in cloud)

### Debug Log
- No circular import issues — `limiter.py` → `config.py` has no reverse dependency
- slowapi requires `Request` parameter in route function signature for `@limiter.limit()` to work

## 7. File List

- `backend/pyproject.toml` — added `slowapi` dependency
- `backend/requirements.txt` — added `slowapi==0.1.9`
- `backend/app/core/limiter.py` — new file, rate limiter instance
- `backend/app/core/config.py` — added `RATE_LIMIT_LOGIN` and `RATE_LIMIT_DEFAULT` settings
- `backend/app/main.py` — added rate limiter state and custom 429 exception handler
- `backend/app/api/routes/login.py` — added `@limiter.limit()` to login endpoint
- `backend/app/api/routes/users.py` — added `@limiter.limit()` to signup endpoint
- `backend/tests/api/routes/test_rate_limiting.py` — new file, rate limiting tests

## 8. Change Log

- 2026-04-08: Initial implementation — installed slowapi, configured rate limiting on login/signup/global, added 429 handler with Retry-After header
