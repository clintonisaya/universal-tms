# Story 6.3 — Unify Approval Workflow & Migrate to TanStack Query

## User Story

**As a** manager or finance user,
**I want** a single clear entry point for my pending tasks with instant page loads,
**so that** I don't waste time checking multiple pages and waiting for loading spinners.

**Priority:** High
**Points:** 5
**Epic:** 6 — Navigation & Error Recovery

---

## Acceptance Criteria

- [ ] **AC 6.3.1** — A "My Tasks" item appears in the sidebar (below Dashboard, above Fleet) with a `CheckSquareOutlined` icon, linking to `/dashboard/tasks`, visible to all authenticated users
- [ ] **AC 6.3.2** — Dashboard "Pending Approvals" metric card click navigates to `/dashboard/tasks` (already does this — verify no regression)
- [ ] **AC 6.3.3** — `/manager/approvals` page data fetching is migrated from manual `useState + useEffect + fetch` to TanStack Query hooks (`useManagerApprovals` in `useApi.ts`)
- [ ] **AC 6.3.4** — `/manager/payments` page data fetching is migrated to TanStack Query hooks (`useManagerPayments` in `useApi.ts`)
- [ ] **AC 6.3.5** — Both pages show cached data instantly on revisit (stale-while-revalidate) with background refresh
- [ ] **AC 6.3.6** — Mutations (approve, reject, return, pay) use `useMutation` with `onSuccess` cache invalidation
- [ ] **AC 6.3.7** — The ToDoWidget badge count in the dashboard header remains accurate after mutations (invalidate `todoCount` query key on success)

---

## Technical Notes

### Sidebar Change

**File:** `frontend/src/components/dashboard/DashboardLayout.tsx`

Add to `allMenuItems` BEFORE the "fleet" group:

```tsx
{
  key: "/dashboard/tasks",
  icon: <CheckSquareOutlined />,
  label: "My Tasks",
},
```

Import `CheckSquareOutlined` from `@ant-design/icons`.

### TanStack Query Migration — Manager Approvals

**File:** `frontend/src/app/(authenticated)/manager/approvals/page.tsx`

Replace:
```tsx
const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
const [loading, setLoading] = useState(true);

const fetchExpenses = useCallback(async () => {
  setLoading(true);
  // ... fetch logic
  setLoading(false);
}, []);

useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
```

With TanStack Query hooks from `useApi.ts`.

### TanStack Query Migration — Manager Payments

**File:** `frontend/src/app/(authenticated)/manager/payments/page.tsx`

Same migration pattern as Approvals.

### Add to useApi.ts

**File:** `frontend/src/hooks/useApi.ts`

```tsx
export const queryKeys = {
  ...existing,
  managerApprovals: ["managerApprovals"] as const,
  managerPayments: ["managerPayments"] as const,
};

export function useManagerApprovals(enabled = true) {
  return useQuery({
    queryKey: queryKeys.managerApprovals,
    queryFn: () => apiFetch<ExpenseRequest[]>("/api/v1/expenses/?status=pending_manager"),
    enabled,
    staleTime: 30_000,
  });
}

export function useManagerPayments(enabled = true) {
  return useQuery({
    queryKey: queryKeys.managerPayments,
    queryFn: () => apiFetch<ExpenseRequest[]>("/api/v1/expenses/?status=pending_finance"),
    enabled,
    staleTime: 30_000,
  });
}
```

### Mutation Pattern

For approve/reject/return/pay actions, use `useMutation`:

```tsx
const approveMutation = useMutation({
  mutationFn: (id: string) => apiFetch(`/api/v1/expenses/${id}/approve`, { method: "POST" }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.managerApprovals });
    queryClient.invalidateQueries({ queryKey: queryKeys.todoCount });
    message.success("Expense approved");
  },
});
```

---

## Dev Checklist

- [ ] Add "My Tasks" sidebar item
- [ ] Add query keys to `useApi.ts`
- [ ] Add `useManagerApprovals` hook
- [ ] Add `useManagerPayments` hook
- [ ] Migrate `/manager/approvals` page to use hooks
- [ ] Migrate `/manager/payments` page to use hooks
- [ ] Convert mutations to `useMutation` with cache invalidation
- [ ] Verify todoCount badge updates after approve/reject/pay
- [ ] Test stale-while-revalidate: visit page, navigate away, come back — should show cached data instantly
- [ ] Test mutation optimistic flow: approve → list updates → no full page reload
