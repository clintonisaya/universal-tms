# Story 5.1 — Add Manager & Finance Navigation to Sidebar

## User Story

**As a** manager or finance user,
**I want** to see my role-specific pages in the sidebar menu,
**so that** I can discover and navigate to Approvals, Payments, and Vouchers without relying on dashboard card clicks.

**Priority:** Critical
**Points:** 2
**Epic:** 5 — Speed & Functionality Quick Fixes

---

## Acceptance Criteria

- [ ] **AC 5.1.1** — A "Manager" menu group appears in the sidebar between "Office Expenses" and "Reports" with icon `AuditOutlined` or `CheckSquareOutlined`
- [ ] **AC 5.1.2** — Manager group contains: "Approvals" (`/manager/approvals`) gated by `expenses:approve` permission, "Payments" (`/manager/payments`) gated by `expenses:pay` permission
- [ ] **AC 5.1.3** — A "Finance" menu group appears (or Vouchers is added under an existing group) containing: "Vouchers" (`/finance/vouchers`) gated by `finance:vouchers` or appropriate permission
- [ ] **AC 5.1.4** — Manager group auto-expands when pathname starts with `/manager`
- [ ] **AC 5.1.5** — Menu items are hidden for users without the required permissions (existing `filterMenuItems` logic applies)
- [ ] **AC 5.1.6** — Selected state highlights correctly when on `/manager/approvals`, `/manager/payments`, `/finance/vouchers`

---

## Technical Notes

- **File:** `frontend/src/components/dashboard/DashboardLayout.tsx`
- Add entries to `allMenuItems` array (lines 41-98)
- Add keys to `getSelectedKeys()` array (lines 185-205)
- Add pathname check to `getOpenKeys()` (lines 214-224)
- Check what permissions these pages currently expect and match the `requires` array

---

## Dev Checklist

- [ ] Add Manager menu group to `allMenuItems`
- [ ] Add Finance/Vouchers menu entry
- [ ] Update `getSelectedKeys()` with new paths
- [ ] Update `getOpenKeys()` for `/manager` and `/finance` prefixes
- [ ] Verify permission gates match existing page-level checks
- [ ] Test with admin, manager, finance, and ops roles
