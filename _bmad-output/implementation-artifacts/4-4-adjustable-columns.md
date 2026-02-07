# Story 4.4: Adjustable Table Column Widths

**Epic:** 4 - Dashboard Enhancements & UX Refinements  
**Story Key:** 4-4-adjustable-columns  
**Status:** ready-for-dev

## 1. User Story

**As a** System User (any role),  
**I want** to adjust the width of table columns by dragging the column borders,  
**So that** I can customize my view to see the data that matters most to me without horizontal scrolling.

## 2. Context & Background

### Problem Statement
The system has many data tables (19+ instances) with varying column widths. Users working on high-resolution displays (like Clinton's 2560x1600) need:
- **Flexibility**: Ability to widen important columns (e.g., "Description", "Route")
- **Density Control**: Ability to narrow less important columns (e.g., "Status" badges)
- **Persistence**: Column widths should be remembered per table per user

### Solution Vision
Implement **resizable columns** across ALL tables in the system with:
1. **Visual Feedback**: Resize cursor on hover over column borders
2. **Drag to Resize**: Smooth column width adjustment
3. **Persistence**: Save column widths to localStorage per user per table
4. **Reset Option**: Allow users to reset to default widths

### Integration with Story 2-18
Story 2-18 standardized table format (checkbox + numbering columns). This story adds **column resizing** to that standardized format.

## 3. Acceptance Criteria (BDD)

### Scenario 1: Column Resize Indication
**Given** I am viewing any data table  
**When** I hover my cursor over the border between two column headers  
**Then** the cursor changes to a resize cursor (↔️)  
**And** visual feedback indicates the column is resizable

### Scenario 2: Resize Column by Dragging
**Given** I hover over a column border  
**When** I click and drag the border to the left or right  
**Then** the column width adjusts smoothly as I drag  
**And** adjacent columns adjust accordingly  
**And** the table maintains proper layout without breaking

### Scenario 3: Minimum Column Width
**Given** I am resizing a column  
**When** I try to make it narrower than the minimum width (e.g., 80px)  
**Then** the column stops resizing at the minimum width  
**And** I cannot make it any narrower

### Scenario 4: Column Width Persistence
**Given** I have resized columns in a table (e.g., Trips table)  
**When** I refresh the page or navigate away and return  
**Then** the column widths are restored to my custom settings  
**And** other tables maintain their own independent widths

### Scenario 5: Reset to Default Widths
**Given** I have customized column widths  
**When** I click a "Reset Column Widths" option (e.g., in table toolbar or right-click menu)  
**Then** all columns return to their default widths  
**And** my custom settings are cleared from storage

### Scenario 6: Fixed Columns Not Resizable
**Given** I am viewing a table with fixed-width columns (e.g., "No." checkbox column, "Actions" column)  
**When** I hover over their borders  
**Then** the resize cursor does NOT appear  
**And** I cannot resize these columns

## 4. Technical Requirements

### 🏗️ Architecture & Stack
- **Frontend Library**: Ant Design `Table` with custom resize logic OR `react-resizable-panels`/`react-resizable` wrapper
- **Storage**: localStorage for column width persistence
- **State Management**: React state for current widths + localStorage sync

### 📂 Implementation Strategy

**Option A: Ant Design Built-in** (Recommended)
- Use Ant Design `Table`'s `resizable` prop (if available in version)
- Simpler integration with existing tables

**Option B: Custom Implementation**
- Wrap table headers with resize handlers
- Track mouse drag offsets
- Update column widths dynamically

**Decision**: Use **Ant Design Pro Components** (`ProTable`) which has built-in column resizing via `resizable` column prop.

### 🎨 Column Configuration

Each table column should support:
```typescript
{
  title: 'Trip Number',
  dataIndex: 'tripNumber',
  width: 150,              // Default width
  resizable: true,         // Enable resizing
  minWidth: 80,           // Minimum width
  maxWidth: 500,          // Optional maximum width
}
```

**Fixed Columns (NOT resizable):**
- "No." column (checkbox + numbering) - Fixed at 80px
- "Actions" column - Fixed at 120px

### 💾 Persistence Strategy

**localStorage Key Format:**
```typescript
`edupo_column_widths_${userId}_${tableKey}`
```

**Example:**
```typescript
localStorage.setItem(
  'edupo_column_widths_user123_trips_table',
  JSON.stringify({
    tripNumber: 180,
    route: 250,
    driver: 150,
    status: 120,
  })
);
```

**Load on Mount:**
```typescript
useEffect(() => {
  const savedWidths = localStorage.getItem(`edupo_column_widths_${userId}_${tableKey}`);
  if (savedWidths) {
    setColumnWidths(JSON.parse(savedWidths));
  }
}, [userId, tableKey]);
```

**Save on Resize:**
```typescript
const handleColumnResize = (columnKey: string, newWidth: number) => {
  const newWidths = { ...columnWidths, [columnKey]: newWidth };
  setColumnWidths(newWidths);
  localStorage.setItem(
    `edupo_column_widths_${userId}_${tableKey}`,
    JSON.stringify(newWidths)
  );
};
```

### 🔧 Utility/Helper Function

Create reusable hook for column width management:

**`useResizableColumns.ts`:**
```typescript
import { useState, useEffect } from 'react';

export const useResizableColumns = (
  tableKey: string,
  defaultColumns: ColumnType[]
) => {
  const userId = getCurrentUserId(); // From auth context
  const storageKey = `edupo_column_widths_${userId}_${tableKey}`;
  
  const [columns, setColumns] = useState(defaultColumns);

  // Load saved widths on mount
  useEffect(() => {
    const savedWidths = localStorage.getItem(storageKey);
    if (savedWidths) {
      const widths = JSON.parse(savedWidths);
      const updatedColumns = defaultColumns.map(col => ({
        ...col,
        width: widths[col.dataIndex] || col.width,
      }));
      setColumns(updatedColumns);
    }
  }, []);

  // Save widths on resize
  const handleResize = (index: number) => (e: any, { size }: any) => {
    setColumns((prev) => {
      const nextColumns = [...prev];
      nextColumns[index] = {
        ...nextColumns[index],
        width: size.width,
      };
      
      // Save to localStorage
      const widths = nextColumns.reduce((acc, col) => ({
        ...acc,
        [col.dataIndex]: col.width,
      }), {});
      localStorage.setItem(storageKey, JSON.stringify(widths));
      
      return nextColumns;
    });
  };

  const resetWidths = () => {
    localStorage.removeItem(storageKey);
    setColumns(defaultColumns);
  };

  return { columns, handleResize, resetWidths };
};
```

### 📋 Implementation Scope

Apply to **ALL 19+ tables** (from Story 2-18):

**Dashboard & Components:**
- `RecentTripsTable.tsx`
- `TripDetailDrawer.tsx`

**Operations Module:**
- Trips, Waybills, Expenses, Tracking tables

**Fleet Management:**
- Trucks, Trailers, Drivers, Maintenance tables

**Settings & Admin:**
- Users, Locations, Cargo Types, Vehicle Statuses, Finance tables

**Manager & Finance:**
- Approvals, Payments, Office Expenses tables

## 5. Implementation Guide

### Phase 1: Create Reusable Hook
1. **Create useResizableColumns Hook**:
   - Implement column width state management
   - Add localStorage persistence logic
   - Create reset functionality

### Phase 2: Update Table Components
1. **For Each Table**:
   - Import `useResizableColumns` hook
   - Pass `tableKey` (unique identifier per table)
   - Add `resizable: true` to column definitions
   - Set `minWidth` for each column
   - Mark fixed columns as `resizable: false`

2. **Add Reset Button**:
   - Add "Reset Column Widths" button to table toolbar
   - Wire to `resetWidths()` function

### Phase 3: Testing & Validation
1. **Test resizing behavior on all tables**
2. **Verify persistence across page refreshes**
3. **Test with different user accounts**
4. **Verify minimum width enforcement**

## 6. Tasks

### Core Implementation
- [ ] **1. Create Reusable Hook** <!-- id: 6.1 -->
    - [ ] [IMPL] Create `frontend/src/hooks/useResizableColumns.ts`
    - [ ] [IMPL] Implement column width state management
    - [ ] [IMPL] Add localStorage load/save logic
    - [ ] [IMPL] Implement `resetWidths()` function
    - [ ] [IMPL] Add TypeScript types for column configuration

- [ ] **2. Update Dashboard Tables** <!-- id: 6.2 -->
    - [ ] [IMPL] Update `RecentTripsTable.tsx`
    - [ ] [IMPL] Update `TripDetailDrawer.tsx` (Expense History)

- [ ] **3. Update Operations Tables** <!-- id: 6.3 -->
    - [ ] [IMPL] Update Trips page table (`ops/trips/page.tsx`)
    - [ ] [IMPL] Update Waybills table (`ops/waybills/page.tsx`)
    - [ ] [IMPL] Update Expenses table (`ops/expenses/page.tsx`)
    - [ ] [IMPL] Update Tracking table (`ops/tracking/page.tsx`)

- [ ] **4. Update Fleet Tables** <!-- id: 6.4 -->
    - [ ] [IMPL] Update Trucks table (`fleet/trucks/page.tsx`)
    - [ ] [IMPL] Update Trailers table (`fleet/trailers/page.tsx`)
    - [ ] [IMPL] Update Drivers table (`fleet/drivers/page.tsx`)
    - [ ] [IMPL] Update Maintenance table (`fleet/maintenance/page.tsx`)
    - [ ] [IMPL] Update Truck Detail Maintenance History table

- [ ] **5. Update Settings Tables** <!-- id: 6.5 -->
    - [ ] [IMPL] Update Users table (`settings/users/page.tsx`)
    - [ ] [IMPL] Update Locations table (`settings/transport/locations/page.tsx`)
    - [ ] [IMPL] Update Cargo Types table (`settings/transport/cargo-types/page.tsx`)
    - [ ] [IMPL] Update Vehicle Statuses table (`settings/transport/vehicle-statuses/page.tsx`)
    - [ ] [IMPL] Update Finance settings table

- [ ] **6. Update Manager & Finance Tables** <!-- id: 6.6 -->
    - [ ] [IMPL] Update Approvals table (`manager/approvals/page.tsx`)
    - [ ] [IMPL] Update Payments table (`manager/payments/page.tsx`)
    - [ ] [IMPL] Update Office Expenses table

- [ ] **7. Add Reset Functionality** <!-- id: 6.7 -->
    - [ ] [IMPL] Add "Reset Column Widths" button to table toolbars
    - [ ] [IMPL] Wire reset button to `resetWidths()` function
    - [ ] [IMPL] Add confirmation modal for reset action

### Testing & Validation
- [ ] **8. Manual Testing** <!-- id: 6.8 -->
    - [ ] [TEST] Resize columns in Trips table → verify smooth dragging
    - [ ] [TEST] Refresh page → verify widths persisted
    - [ ] [TEST] Reset widths → verify return to defaults
    - [ ] [TEST] Log out/in → verify widths still persisted
    - [ ] [TEST] Try to resize below minimum width → verify blocked
    - [ ] [TEST] Try to resize fixed columns (No., Actions) → verify blocked
    - [ ] [TEST] Test on different tables → verify independent width storage
    - [ ] [TEST] Test with different user accounts → verify user-specific storage

## 7. UX Specifications

### Visual Feedback
- **Resize Cursor**: Use CSS `cursor: col-resize` on hover over column borders
- **Drag Handle**: Subtle vertical line indicator on hover (optional)
- **Smooth Transition**: No jerky movements during resize

### Reset Button
- **Placement**: Table toolbar (top-right)
- **Icon**: ↻ Reset icon
- **Tooltip**: "Reset column widths to default"
- **Confirmation**: Optional modal: "Reset all column widths to default?"

### Minimum Widths by Column Type
- **Checkbox/Number Column**: Fixed 80px
- **Status Badges**: Min 100px
- **Text Fields (Short)**: Min 120px (e.g., "Amount", "Date")
- **Text Fields (Long)**: Min 150px (e.g., "Description", "Route")
- **Actions Column**: Fixed 120-150px

## 8. Dependencies & Integration Points

**Depends On:**
- Story 2-18 (Standardize Tables) - Works with standardized table format

**Integrates With:**
- All existing table components across the system
- User authentication (for user-specific persistence)

## 9. Acceptance Testing Checklist

**Pre-Launch Validation:**
- [ ] All 19+ tables have resizable columns
- [ ] Resize cursor appears on hover over column borders
- [ ] Columns resize smoothly on drag
- [ ] Minimum widths enforced
- [ ] Fixed columns (No., Actions) NOT resizable
- [ ] Column widths persist after page refresh
- [ ] Column widths persist after logout/login
- [ ] Each table has independent width settings
- [ ] Reset button restores default widths
- [ ] No layout breaking with extreme widths
- [ ] Works on different screen resolutions

## 10. Dev Agent Record

### File List
**Frontend (New):**
- `frontend/src/hooks/useResizableColumns.ts`

**Frontend (Modified - All 19+ table files):**
- `frontend/src/components/dashboard/RecentTripsTable.tsx`
- `frontend/src/components/trips/TripDetailDrawer.tsx`
- `frontend/src/app/ops/trips/page.tsx`
- `frontend/src/app/ops/waybills/page.tsx`
- `frontend/src/app/ops/expenses/page.tsx`
- `frontend/src/app/ops/tracking/page.tsx`
- `frontend/src/app/fleet/trucks/page.tsx`
- `frontend/src/app/fleet/trailers/page.tsx`
- `frontend/src/app/fleet/drivers/page.tsx`
- `frontend/src/app/fleet/maintenance/page.tsx`
- `frontend/src/app/fleet/trucks/[id]/page.tsx`
- `frontend/src/app/settings/users/page.tsx`
- `frontend/src/app/settings/transport/locations/page.tsx`
- `frontend/src/app/settings/transport/cargo-types/page.tsx`
- `frontend/src/app/settings/transport/vehicle-statuses/page.tsx`
- `frontend/src/app/settings/finance/page.tsx`
- `frontend/src/app/manager/approvals/page.tsx`
- `frontend/src/app/manager/payments/page.tsx`
- `frontend/src/app/office-expenses/page.tsx`

### Change Log
- 2026-02-04: Story created by Business Analyst (Mary) based on Clinton's request for adjustable column widths system-wide
- Pending: Implementation by Dev Agent
