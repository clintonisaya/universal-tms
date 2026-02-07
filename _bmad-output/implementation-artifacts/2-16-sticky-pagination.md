# Story 2.16: Sticky Pagination for Data Tables

Status: ready-for-dev

## Story

As a **System User** (Admin, Ops, Finance),
I want **the pagination controls (Next/Prev, Page Size) to stick to the bottom of the visible screen**,
so that **I can change pages or view the count without scrolling to the very bottom of long lists (50+ items).**

## Acceptance Criteria

1.  **Sticky Pagination Behaviour**:
    *   For all data tables in the system (Trips, Expenses, Waybills, etc.), the pagination bar must remain visible at the bottom of the viewport or table container.
    *   If the table is longer than the screen height, the pagination should be **"sticky" at the bottom** of the window (floating) until the user scrolls to the end of the table.
    *   Alternatively (and often better for layouts), the Table consists of a scrollable body with a fixed height (calculated to fit screen) and the pagination is always visible at the footer.
    *   **User Preference**: "stick below... so i don't have to scroll to bottom". A floating/sticky footer bar is the specific request.

2.  **Global Application**:
    *   This change must apply to **all** tables in the application.
    *   Target components include but are not limited to:
        *   `ExpensesPage`
        *   `RecentTripsTable`
        *   `TripsPage`
        *   `WaybillsPage`
        *   `LocationsPage`
        *   `UserManagementPage` (Settings)

3.  **Visual Interaction**:
    *   The sticky pagination bar should have a background (e.g., white or off-white) and a subtle shadow (top-shadow) so it stands out against the table content scrolling behind it.
    *   It should not obstruct the last row of data when the user *does* scroll to the bottom.

## Tasks / Subtasks

- [ ] **Technical Analysis & Prototyping**
    - [ ] Determine best approach:
        *   *Option A (CSS)*: Apply `position: sticky; bottom: 0;` to `.ant-table-pagination` via global CSS. Cost-effective for global coverage.
        *   *Option B (AntD Prop)*: Use `<Table sticky />` prop. (Ant Design 4/5 supports sticky header/scrollbar, check if it handles pagination).
        *   *Option C (Layout)*: Change page layouts to Flex/Grid where the Table takes `flex: 1` and has `scroll={{ y: 'auto' }}`. This is the most robust "App-like" feel but requires editing every page file.

- [ ] **Implementation (Global CSS Approach recommended for "All Tables")**
    - [ ] Update `src/app/globals.css` (or equivalent theme file):
        - [ ] Target `.ant-table-pagination` (right aligned usually) and `.ant-table-pagination-left`.
        - [ ] Add `position: sticky; bottom: 0; z-index: 100; background: white; padding: 10px; box-shadow: 0 -2px 10px rgba(0,0,0,0.05);`.
        - [ ] Ensure it works within the `DashboardLayout`.
    - [ ] **Constraint Check**: Verify if `DashboardLayout` scroll container is the `window` or a `div`. If it's a `div`, sticky needs to differ or that div needs to be the scrolling parent.

- [ ] **Refinement**
    - [ ] Test on long tables (Trips, Expenses).
    - [ ] Adjust `bottom` offset if there's a footer or padding.

## Dev Notes

- **Ant Design Internal Classes**: The class is usually `.ant-table-pagination.ant-pagination`.
- **Layout Context**: The `DashboardLayout` uses a Sidebar and Header. The detailed pages are usually inside a `Content` area. If the `Content` area scrolls, `sticky` works relative to it (if configured right) or `fixed` might be needed (careful with width).
- **Recommendation**: Try `sticky` in CSS first. It's the least intrusive.

### References
- User Request: "pagination filter to stick below the for every table so i don't have to scroll to bottom"
- Ant Design Docs: Table `sticky` prop or Pagination customization.
