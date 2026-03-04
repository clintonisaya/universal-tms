# Story 6.1 — Fix Back Button Navigation App-Wide

## User Story

**As a** user navigating deep into the app,
**I want** the Back button to take me to the previous page I was on,
**so that** my navigation flow feels natural instead of always jumping to Dashboard.

**Priority:** High
**Points:** 3
**Epic:** 6 — Navigation & Error Recovery

---

## Acceptance Criteria

- [ ] **AC 6.1.1** — All Back buttons use `router.back()` instead of `router.push("/dashboard")`
- [ ] **AC 6.1.2** — If there is no browser history (direct URL access), Back falls back to a sensible parent: fleet pages to `/fleet/trucks`, ops pages to `/ops/trips`, settings pages to `/settings/users`, reports to `/dashboard`
- [ ] **AC 6.1.3** — The back fallback logic is extracted into a shared utility: `useSmartBack()` hook
- [ ] **AC 6.1.4** — Office Expenses page gets a Back button (currently missing one, unlike every other page)

---

## Technical Notes

### Create Shared Hook

**New file:** `frontend/src/hooks/useSmartBack.ts`

```tsx
import { useRouter, usePathname } from "next/navigation";

function getFallback(pathname: string): string {
  if (pathname.startsWith("/fleet")) return "/fleet/trucks";
  if (pathname.startsWith("/ops")) return "/ops/trips";
  if (pathname.startsWith("/settings")) return "/settings/users";
  if (pathname.startsWith("/manager")) return "/dashboard";
  if (pathname.startsWith("/finance")) return "/dashboard";
  if (pathname.startsWith("/reports")) return "/dashboard";
  return "/dashboard";
}

export function useSmartBack() {
  const router = useRouter();
  const pathname = usePathname();

  return () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(getFallback(pathname));
    }
  };
}
```

### Affected Pages (~20)

Every page with an `<ArrowLeftOutlined>` back button. Replace:
```tsx
onClick={() => router.push("/dashboard")}
```
with:
```tsx
const goBack = useSmartBack();
// ...
onClick={goBack}
```

### Add Missing Back Button

**File:** `office-expenses/page.tsx` — add a Back button in the page header to match the pattern used on all other pages.

---

## Dev Checklist

- [ ] Create `useSmartBack` hook
- [ ] Replace hardcoded `router.push("/dashboard")` on all Back buttons
- [ ] Add Back button to Office Expenses page
- [ ] Test: navigate Trips → Trip Detail → Back (should go to Trips, not Dashboard)
- [ ] Test: direct URL access to `/fleet/trucks/123` → Back (should go to `/fleet/trucks`)
- [ ] Test: first visit with no history → Back uses fallback
