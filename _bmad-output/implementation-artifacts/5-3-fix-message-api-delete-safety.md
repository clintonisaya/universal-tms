# Story 5.3 — Fix Message API Pattern & Delete Safety

## User Story

**As a** user performing actions across the app,
**I want** consistent feedback toasts and confirmation dialogs on all destructive actions,
**so that** I never accidentally lose data and never see rendering glitches.

**Priority:** High
**Points:** 3
**Epic:** 5 — Speed & Functionality Quick Fixes

---

## Acceptance Criteria

- [ ] **AC 5.3.1** — All pages use `const { message } = App.useApp()` hook pattern instead of static `import { message } from "antd"`
- [ ] **AC 5.3.2** — Pages not wrapped in `<App>` are wrapped appropriately (or use the existing App wrapper from the layout)
- [ ] **AC 5.3.3** — Exchange Rate delete button has a `Popconfirm` with `title="Delete Exchange Rate"`, `description="Are you sure you want to delete this rate?"`, `okButtonProps={{ danger: true }}`
- [ ] **AC 5.3.4** — No hydration warnings in browser console related to `message` API

---

## Technical Notes

### Message Pattern Fix — 7 Pages

| Page | File |
|------|------|
| Drivers | `fleet/drivers/page.tsx` |
| Trailers | `fleet/trailers/page.tsx` |
| Clients | `settings/clients/page.tsx` |
| Cargo Types | `settings/transport/cargo-types/page.tsx` |
| Vehicle Statuses | `settings/transport/vehicle-statuses/page.tsx` |
| Exchange Rates | `settings/finance/page.tsx` |
| Trip Expense Types | `settings/trip-expenses/page.tsx` |

For each page:
1. Replace `import { message } from "antd"` → add `App` to the import
2. Use `const { message } = App.useApp()` inside the component
3. Wrap return JSX in `<App>` if not already wrapped

### Exchange Rate Delete Confirmation

**File:** `settings/finance/page.tsx`
- Find the delete `Button` in the Actions column
- Wrap it in `<Popconfirm>` matching the pattern used on all other settings pages:
```tsx
<Popconfirm
  title="Delete Exchange Rate"
  description="Are you sure you want to delete this rate?"
  onConfirm={() => handleDelete(rate)}
  okText="Yes"
  cancelText="No"
  okButtonProps={{ danger: true }}
>
  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
</Popconfirm>
```

---

## Dev Checklist

- [ ] Fix message import on all 7 pages
- [ ] Add `<App>` wrapper where needed
- [ ] Add Popconfirm to Exchange Rate delete
- [ ] Test toast messages work correctly on all 7 pages
- [ ] Check browser console for hydration warnings
