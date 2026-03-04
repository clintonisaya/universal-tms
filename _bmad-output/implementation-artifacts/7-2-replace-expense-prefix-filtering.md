# Story 7.2 — Replace Expense Number Prefix Filtering with Reliable Field

## User Story

**As a** developer maintaining the expense system,
**I want** trip expenses and office expenses distinguished by a reliable field instead of a fragile number prefix check,
**so that** the filtering never silently breaks when the numbering format changes.

**Priority:** High
**Points:** 3
**Epic:** 7 — Expense System Reliability

---

## Acceptance Criteria

- [ ] **AC 7.2.1** — `/ops/expenses` page filters expenses by a reliable field (e.g., `trip_id` presence) instead of `!expense_number?.startsWith("EX")`
- [ ] **AC 7.2.2** — `/office-expenses` page filters expenses by a reliable field instead of `expense_number?.startsWith("EX")`
- [ ] **AC 7.2.3** — Old prefix-based filtering code is removed entirely
- [ ] **AC 7.2.4** — The filtering logic is documented with a comment explaining the distinction
- [ ] **AC 7.2.5** — Existing data displays correctly under the new filtering (no regressions)

---

## Technical Notes

### Current Fragile Filtering

**Trip Expenses** (`ops/expenses/page.tsx`):
```tsx
// Current — fragile prefix check
const tripExpenses = expenses.filter(e => !e.expense_number?.startsWith("EX"));
```

**Office Expenses** (`office-expenses/page.tsx`):
```tsx
// Current — fragile prefix check
const officeExpenses = expenses.filter(e => e.expense_number?.startsWith("EX"));
```

The code comments mention "both old EXP- and new EX- formats" — confirming the format has already changed once.

### Recommended Fix — Use `trip_id` Field

The `ExpenseRequest` model already has a `trip_id` field:
- **Trip expenses:** `trip_id` is NOT null (linked to a trip)
- **Office expenses:** `trip_id` IS null (standalone office expense)

This is a reliable, semantic distinction that doesn't depend on numbering format.

**New filtering:**

```tsx
// Trip Expenses page — show only expenses linked to a trip
const tripExpenses = expenses.filter(e => e.trip_id != null);

// Office Expenses page — show only standalone expenses (no trip)
const officeExpenses = expenses.filter(e => e.trip_id == null);
```

### Alternative — Server-Side Scope Parameter

If preferred, add a `scope` query parameter to the backend API:

```
GET /api/v1/expenses?scope=trip     → returns only expenses with trip_id
GET /api/v1/expenses?scope=office   → returns only expenses without trip_id
```

This moves filtering to the server and reduces data transferred. However, the client-side `trip_id` check is simpler and requires no backend changes.

---

## Dev Checklist

- [ ] Verify `trip_id` field exists in the expense API response and TypeScript type
- [ ] Update trip expenses filter in `ops/expenses/page.tsx`
- [ ] Update office expenses filter in `office-expenses/page.tsx`
- [ ] Remove all `startsWith("EX")` / `startsWith("EXP")` filtering code
- [ ] Add explanatory comments to the new filter logic
- [ ] Test with existing data — verify trip expenses show on trip page, office expenses show on office page
- [ ] Test edge case: expense with trip_id but unusual number format still shows correctly
