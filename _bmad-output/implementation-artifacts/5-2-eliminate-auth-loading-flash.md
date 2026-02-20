# Story 5.2 — Eliminate Auth Loading Flash Across All Pages

Status: review

## User Story

**As a** user navigating between pages,
**I want** instant page transitions without a loading spinner flash,
**so that** the app feels fast and responsive.

**Priority:** High
**Points:** 3
**Epic:** 5 — Speed & Functionality Quick Fixes

---

## Acceptance Criteria

- [x] **AC 5.2.1** — Remove the per-page `if (authLoading) return <Spin>` guard from ALL authenticated pages (ProtectedLayout already handles this)
- [x] **AC 5.2.2** — Pages that need user role for conditional rendering should check `user` directly (it is guaranteed non-null inside ProtectedLayout)
- [x] **AC 5.2.3** — No visible spinner flash when navigating between authenticated pages
- [x] **AC 5.2.4** — First load still shows the ProtectedLayout loading spinner (no regression)

---

## Technical Notes

~15 page files under `frontend/src/app/(authenticated)/` contain this pattern:

```tsx
const { user, loading: authLoading } = useAuth();
if (authLoading) return <div style={{ minHeight: "100vh", ... }}><Spin size="large" /></div>;
```

- Remove the `authLoading` check and the full-screen Spin fallback from each page
- `ProtectedLayout` already ensures `user` is set before rendering children — the per-page check is redundant
- Keep `useAuth()` calls that use `user.role` or `user.permissions` — just remove the loading guard

### Affected Pages

- `dashboard/page.tsx`
- `dashboard/tasks/page.tsx`
- `fleet/trucks/page.tsx`
- `fleet/trailers/page.tsx`
- `fleet/drivers/page.tsx`
- `fleet/maintenance/page.tsx`
- `ops/tracking/page.tsx`
- `ops/trips/page.tsx`
- `ops/waybills/page.tsx`
- `ops/expenses/page.tsx`
- `office-expenses/page.tsx`
- `manager/approvals/page.tsx`
- `manager/payments/page.tsx`
- `reports/profitability/page.tsx`
- All `settings/*/page.tsx` files

---

## Dev Checklist

- [x] Audit all pages for `authLoading` / `loading: authLoading` pattern
- [x] Remove the loading guard and full-screen Spin from each
- [x] Verify `user` is accessed safely (non-null guaranteed by ProtectedLayout)
- [x] Test first page load — should still show ProtectedLayout spinner
- [x] Test page-to-page navigation — should be instant, no flash

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes

Removed redundant `authLoading` guards from **26 authenticated page files**. The story estimated ~15, but a full audit found 26 files using the pattern (including dynamic routes and settings subpages).

**Changes by category:**

1. **Simple guard removal (12 files):** Removed `loading: authLoading` from `useAuth()`, deleted `if (authLoading) return <Spin>` block, removed unused `Spin` import.

2. **Guard + `isAuthenticated` simplification (5 files):** Additionally changed `const isAuthenticated = !!user && !authLoading` → `const isAuthenticated = !!user`.

3. **Guard + useEffect cleanup (9 files):** Additionally changed `if (!authLoading && user)` → `if (user)` in useEffects, removed `authLoading` from dependency arrays.

4. **Dashboard special case:** Changed `const loading = authLoading || statsLoading` → `const loading = statsLoading`.

**Verification:** `grep authLoading` returns 0 matches across all authenticated pages. Frontend build passes clean.

### File List

- `frontend/src/app/(authenticated)/dashboard/page.tsx`
- `frontend/src/app/(authenticated)/ops/trips/page.tsx`
- `frontend/src/app/(authenticated)/ops/waybills/page.tsx`
- `frontend/src/app/(authenticated)/ops/waybills/new/page.tsx`
- `frontend/src/app/(authenticated)/ops/tracking/page.tsx`
- `frontend/src/app/(authenticated)/ops/expenses/page.tsx`
- `frontend/src/app/(authenticated)/ops/trips/new/page.tsx`
- `frontend/src/app/(authenticated)/ops/trips/[id]/page.tsx`
- `frontend/src/app/(authenticated)/office-expenses/page.tsx`
- `frontend/src/app/(authenticated)/manager/payments/page.tsx`
- `frontend/src/app/(authenticated)/manager/approvals/page.tsx`
- `frontend/src/app/(authenticated)/reports/profitability/page.tsx`
- `frontend/src/app/(authenticated)/fleet/trucks/page.tsx`
- `frontend/src/app/(authenticated)/fleet/trucks/[id]/page.tsx`
- `frontend/src/app/(authenticated)/fleet/trailers/page.tsx`
- `frontend/src/app/(authenticated)/fleet/drivers/page.tsx`
- `frontend/src/app/(authenticated)/fleet/maintenance/page.tsx`
- `frontend/src/app/(authenticated)/fleet/maintenance/new/page.tsx`
- `frontend/src/app/(authenticated)/settings/users/page.tsx`
- `frontend/src/app/(authenticated)/settings/clients/page.tsx`
- `frontend/src/app/(authenticated)/settings/finance/page.tsx`
- `frontend/src/app/(authenticated)/settings/finance/office-expense-types/page.tsx`
- `frontend/src/app/(authenticated)/settings/trip-expenses/page.tsx`
- `frontend/src/app/(authenticated)/settings/transport/vehicle-statuses/page.tsx`
- `frontend/src/app/(authenticated)/settings/transport/locations/page.tsx`
- `frontend/src/app/(authenticated)/settings/transport/cargo-types/page.tsx`
