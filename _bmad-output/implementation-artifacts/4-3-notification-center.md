# Story 4.3: Notification Center & Toast Integration

**Epic:** 4 - Dashboard Enhancements & UX Refinements  
**Story Key:** 4-3-notification-center  
**Status:** dev-complete

## 1. User Story

**As a** System User (any role),  
**I want** to receive toast notifications for new tasks and view notification history in a notification center,  
**So that** I stay informed of important events even when I'm not actively looking at the to-do list, and can review what I missed.

## 2. Context & Background

### Problem Statement
Story 4-2 implemented the Universal To-Do Center, but users need:
- **Awareness**: Instant alerts when new tasks require attention
- **History**: Ability to see "what happened while I was away"
- **Navigation**: Quick path from notification to the relevant task

### Solution Vision
Create a **dual notification system**:
1. **Toast Notifications**: Temporary popups for real-time awareness
2. **Notification Center**: Persistent bell icon with dropdown history

Both systems are **independent of the to-do list** but integrate with it for navigation.

### Key Requirements (from Clinton)
- ✅ Nice-to-have feature (not critical)
- ✅ Toast notifications sufficient (no browser push)
- ✅ Notifications independent of tasks
- ✅ Clicking notification opens to-do with specific task highlighted

## 3. Acceptance Criteria (BDD)

### Scenario 1: Toast Notification on New Task
**Given** I am logged in and on the dashboard  
**When** a new task is created that requires my action (via WebSocket)  
**Then** a toast notification appears in the bottom-right corner  
**And** it shows contextual message: "[Requester] submitted [Type] expense ([Amount] TZS)"  
**And** the toast auto-dismisses after 5 seconds  
**And** I can click the toast to open the to-do list with that task highlighted

### Scenario 2: Bell Icon Badge Update
**Given** I have 3 unread notifications  
**When** a new notification arrives  
**Then** the bell icon badge updates from "3" to "4"  
**And** the badge is gold/red colored to grab attention  
**When** I have 0 unread notifications  
**Then** the badge is hidden or shows "0"

### Scenario 3: Viewing Notification History
**Given** I have received several notifications  
**When** I click the bell icon in the dashboard header  
**Then** a dropdown opens showing the last 10 notifications  
**And** unread notifications are displayed in bold with a gold dot  
**And** read notifications are displayed in gray text  
**And** each notification shows: icon, message, timestamp (relative time)

### Scenario 4: Clicking Notification to Navigate
**Given** I open the notification center dropdown  
**When** I click on a specific notification  
**Then** the to-do list drawer opens  
**And** the table scrolls to the relevant task  
**And** the task row is highlighted with gold background for 2 seconds  
**And** the notification is marked as "read"  
**And** the bell badge count decrements by 1

### Scenario 5: Notification Persistence
**Given** I receive 5 notifications  
**When** I refresh the page or log out and back in  
**Then** all 5 notifications are still visible in the notification center  
**And** their read/unread status is preserved  
**And** notifications older than 7 days are auto-removed

### Scenario 6: Empty Notification State
**Given** I have no notifications  
**When** I click the bell icon  
**Then** I see an empty state message: "No notifications yet"  
**And** a friendly icon (e.g., 🔔)

### Scenario 7: Contextual Toast Messages
**Given** different types of tasks are created  
**When** I receive notifications for each type  
**Then** I see role-specific contextual messages:
- Manager: "John Ops submitted Fuel expense (500 TZS)"
- Finance: "3 expenses ready for payment"
- Ops: "Your Fuel expense was returned by Manager Jane"

## 4. Technical Requirements

### 🏗️ Architecture & Stack
- **Backend**: No changes required (uses existing WebSocket events from Story 2.6 & 4.2)
- **Frontend**: 
  - New `NotificationCenter` component (bell icon + dropdown)
  - New `useNotifications` custom hook (CRUD operations)
  - Toast enhancement (contextual messages)
  - To-do list modification (accept `highlightTaskId` prop)
- **Storage**: localStorage for notification persistence (last 50 notifications)
- **State Management**: TanStack Query for notification state

### 📂 File Structure
**Frontend (All New or Modified):**
- `frontend/src/components/layout/NotificationCenter.tsx` (New - bell icon + dropdown)
- `frontend/src/hooks/useNotifications.ts` (New - notification CRUD hook)
- `frontend/src/types/notification.ts` (New - type definitions)
- `frontend/src/components/dashboard/ToDoList.tsx` (Modify - add highlighting)
- `frontend/src/components/layout/DashboardLayout.tsx` (Modify - add NotificationCenter to header)
- `frontend/src/app/dashboard/page.tsx` (Modify - enhance toast handlers)

### 🔄 Data Flow

**Notification Lifecycle:**
```
1. WebSocket Event (task_created/task_updated)
   ↓
2. useNotifications hook receives event
   ↓
3. Creates notification object → localStorage
   ↓
4. [Parallel Actions]
   - Show toast notification (5 sec display)
   - Update bell badge count
   ↓
5. User clicks notification in dropdown
   ↓
6. Navigate to to-do list with highlightTaskId
   ↓
7. Mark notification as read → localStorage
```

### 📋 Notification Data Model

```typescript
interface Notification {
  id: string;                    // Unique ID (UUID)
  type: 'task_created' | 'task_updated' | 'task_removed';
  taskId: string;                // Reference to the task
  taskType: 'expense_approval' | 'payment_processing' | 'expense_correction';
  message: string;               // Contextual message
  requester?: string;            // Name of person who triggered event
  amount?: number;               // For financial tasks
  currency?: string;             // For financial tasks
  timestamp: string;             // ISO 8601 timestamp
  read: boolean;                 // Read status
  metadata?: Record<string, any>; // Additional context
}
```

### 🎨 UI/UX Specifications

#### NotificationCenter Component (Bell Icon + Dropdown)

**Header Placement:**
- Location: Top-right of dashboard header (between To-Do button and user profile)
- Icon: 🔔 Bell icon (Ant Design `BellOutlined`)
- Badge: Shows unread count (gold `#faad14` when > 0)

**Dropdown Design:**
- Component: Ant Design `Dropdown` with custom `Menu`
- Max Height: 400px (scrollable if > 10 notifications)
- Width: 350px
- Position: Anchored to bell icon

**Notification Item Structure:**
```
[Icon] [Message]               [Time]
       [Unread Dot (if unread)]
```

**Visual States:**
- **Unread**: Bold text, gold dot (⚫), white background
- **Read**: Gray text (#8c8c8c), no dot, light gray background on hover
- **Hover**: Light blue background (#f0f5ff)

**Empty State:**
- Icon: 🔔 (larger, centered)
- Message: "No notifications yet"
- Subtext: "You'll see updates here when tasks require your attention"

#### Toast Notifications

**Design:**
- Component: Ant Design `message` or `notification`
- Position: Bottom-right corner
- Duration: 5 seconds auto-dismiss
- Clickable: Yes (opens to-do with highlight)

**Message Templates:**
```typescript
const toastMessages = {
  expense_approval: (data) => 
    `${data.requester} submitted ${data.expenseType} expense (${data.amount} ${data.currency})`,
  payment_processing: (data) => 
    `${data.count} expense${data.count > 1 ? 's' : ''} ready for payment`,
  expense_correction: (data) => 
    `Your ${data.expenseType} expense was returned by ${data.manager}`,
};
```

**Icon by Type:**
- `expense_approval`: 💼
- `payment_processing`: 💰
- `expense_correction`: ⚠️

#### To-Do List Highlighting

**Enhancement to ToDoList Component:**
- Accept new prop: `highlightTaskId?: string`
- On mount/update: If `highlightTaskId` provided:
  1. Scroll table to that row
  2. Apply gold background (`#fff7e6`) to row
  3. After 2 seconds, fade background back to white

**Implementation:**
```typescript
// ToDoList.tsx
const ToDoList = ({ highlightTaskId }: { highlightTaskId?: string }) => {
  useEffect(() => {
    if (highlightTaskId) {
      const row = document.getElementById(`task-${highlightTaskId}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.backgroundColor = '#fff7e6';
        setTimeout(() => {
          row.style.transition = 'background-color 1s ease';
          row.style.backgroundColor = 'transparent';
        }, 2000);
      }
    }
  }, [highlightTaskId]);
};
```

### 🔐 Security & Data Management

**localStorage Strategy:**
- Key: `edupo_notifications_${userId}`
- Max Size: 50 notifications (FIFO queue)
- Auto-cleanup: Remove notifications older than 7 days on load
- No sensitive data stored (only references to task IDs)

**Privacy:**
- Notifications cleared on logout
- No cross-user notification leakage
- Notification content sanitized before display

## 5. Implementation Guide

### Phase 1: Notification Data Layer
1. **Create Notification Type Definitions**:
   - Define `Notification` interface in `types/notification.ts`
   - Export helper types for notification creation

2. **Create useNotifications Hook**:
   - CRUD operations: `addNotification`, `markAsRead`, `getUnreadCount`, `getAll`
   - localStorage integration with auto-cleanup
   - TanStack Query integration for reactivity

### Phase 2: NotificationCenter Component
1. **Build Bell Icon + Badge**:
   - Use Ant Design `Badge` + `BellOutlined`
   - Query unread count from useNotifications
   - Display badge only when count > 0

2. **Build Dropdown Menu**:
   - Ant Design `Dropdown` with custom content
   - Map notifications to menu items
   - Handle click to navigate + mark as read
   - Implement empty state

### Phase 3: Toast Integration
1. **Enhance Socket Listeners**:
   - In `dashboard/page.tsx`, add toast handlers for WebSocket events
   - Use contextual message templates
   - Make toasts clickable (open to-do with highlight)

2. **Create Notification on Event**:
   - When WebSocket event arrives, create notification via useNotifications
   - Show toast simultaneously

### Phase 4: To-Do List Highlighting
1. **Add highlightTaskId Prop**:
   - Modify `ToDoList.tsx` to accept optional `highlightTaskId`
   - Implement scroll + highlight logic

2. **Integrate with NotificationCenter**:
   - When notification clicked, pass `taskId` to `ToDoList`
   - Open drawer and trigger highlight

### Phase 5: Layout Integration
1. **Add to DashboardLayout**:
   - Insert `NotificationCenter` component in header (next to profile)
   - Ensure proper spacing and alignment

## 6. Tasks

### Frontend Implementation
- [x] **1. Notification Type Definitions** <!-- id: 6.1 -->
    - [x] [IMPL] Create `frontend/src/types/notification.ts`
    - [x] [IMPL] Define `Notification` interface with all fields
    - [x] [IMPL] Export helper types and constants

- [x] **2. useNotifications Hook** <!-- id: 6.2 -->
    - [x] [IMPL] Create `frontend/src/hooks/useNotifications.ts`
    - [x] [IMPL] Implement localStorage CRUD operations
    - [x] [IMPL] Add auto-cleanup logic (7 days, max 50 items)
    - [x] [IMPL] Integrate with useSyncExternalStore for reactivity (replaced TanStack Query — not installed)
    - [x] [IMPL] Export: `addNotification`, `markAsRead`, `markAllRead`, `unreadCount`, `notifications`

- [x] **3. NotificationCenter Component** <!-- id: 6.3 -->
    - [x] [IMPL] Create `frontend/src/components/layout/NotificationCenter.tsx`
    - [x] [IMPL] Implement bell icon with badge (Ant Design)
    - [x] [IMPL] Build dropdown menu with notification list
    - [x] [IMPL] Style unread vs read notifications
    - [x] [IMPL] Implement empty state design
    - [x] [IMPL] Handle click to navigate + mark as read

- [x] **4. Toast Notification Enhancement** <!-- id: 6.4 -->
    - [x] [IMPL] Update `frontend/src/app/dashboard/page.tsx` socket listeners
    - [x] [IMPL] Create contextual message templates by task type
    - [x] [IMPL] Make toasts clickable (navigate to to-do)
    - [x] [IMPL] Trigger `addNotification` on WebSocket events

- [x] **5. To-Do List Highlighting** <!-- id: 6.5 -->
    - [x] [IMPL] Modify `frontend/src/components/dashboard/ToDoList.tsx`
    - [x] [IMPL] Add `highlightTaskId` prop
    - [x] [IMPL] Implement scroll-to-row logic
    - [x] [IMPL] Add gold background highlight with fade transition
    - [x] [IMPL] Add `id` attribute to table rows for targeting

- [x] **6. Layout Integration** <!-- id: 6.6 -->
    - [x] [IMPL] Update `frontend/src/components/layout/DashboardLayout.tsx`
    - [x] [IMPL] Add `NotificationCenter` to header (between to-do and profile)
    - [x] [IMPL] Ensure proper spacing and responsive behavior

### Testing & Validation
- [ ] **7. Manual Testing** <!-- id: 6.7 -->
    - [ ] [TEST] Create new expense → verify toast appears
    - [ ] [TEST] Verify bell badge increments
    - [ ] [TEST] Open notification dropdown → verify list displays
    - [ ] [TEST] Click notification → verify to-do opens with highlight
    - [ ] [TEST] Verify notification marked as read after click
    - [ ] [TEST] Refresh page → verify notifications persist
    - [ ] [TEST] Test with multiple notification types (approval, payment, returned)
    - [ ] [TEST] Verify empty state when no notifications

- [ ] **8. Edge Cases** <!-- id: 6.8 -->
    - [ ] [TEST] Test with 50+ notifications → verify FIFO queue
    - [ ] [TEST] Test with notifications older than 7 days → verify auto-cleanup
    - [ ] [TEST] Test logout → verify notifications cleared for security
    - [ ] [TEST] Test clicking toast vs clicking dropdown notification

## 7. Dependencies & Integration Points

**Depends On:**
- Story 2.6 (Real-Time Dashboard) - Uses existing WebSocket infrastructure
- Story 4.2 (Dashboard To-Do) - Integrates with to-do list for navigation

**Integrates With:**
- Existing socket listeners in dashboard
- To-do list drawer component
- Dashboard layout header

## 8. UX Notes from Sally (Party Mode Discussion)

- Notification Center placement in header keeps action items top-of-mind
- Gold highlighting provides satisfying visual feedback when navigating from notification
- Persistent history addresses "what did I miss" anxiety
- Toast + Bell combination balances immediacy with discoverability

## 9. Architecture Notes from Winston (Party Mode Discussion)

- No backend changes required - leverages existing WebSocket events
- localStorage keeps it simple - no need for notification database table
- Read-only notification center doesn't compete with to-do list for actions
- Clean separation: Notifications = awareness, To-Do = actions

## 10. Acceptance Testing Checklist

**Pre-Launch Validation:**
- [ ] Toast appears when new task created
- [ ] Toast message is contextual and accurate
- [ ] Bell badge shows correct unread count
- [ ] Notification dropdown displays last 10 items
- [ ] Unread notifications visually distinct from read
- [ ] Clicking notification opens to-do with highlight
- [ ] Task row highlights with gold background
- [ ] Notification marked as read after navigation
- [ ] Badge count decrements correctly
- [ ] Notifications persist across page refresh
- [ ] Notifications cleared on logout
- [ ] Empty state shows when no notifications
- [ ] Old notifications auto-cleanup after 7 days
- [ ] Max 50 notifications enforced (FIFO)

## 11. Dev Agent Record

### File List
**Frontend (New):**
- `frontend/src/types/notification.ts`
- `frontend/src/hooks/useNotifications.ts`
- `frontend/src/components/layout/NotificationCenter.tsx`

**Frontend (Modified):**
- `frontend/src/components/dashboard/ToDoList.tsx`
- `frontend/src/components/layout/DashboardLayout.tsx`
- `frontend/src/app/dashboard/page.tsx`

### Change Log
- 2026-02-04: Story created by Business Analyst (Mary) during Party Mode discussion with Clinton, Sally (UX), Winston (Architect), and Amelia (Dev)
- Requirements derived from: Toast sufficient, notifications independent of tasks, to-do with specific highlighting
- 2026-02-04: Implementation complete by Dev Agent (Amelia)
  - Used `useSyncExternalStore` instead of TanStack Query (not in project deps) for cross-component reactivity
  - Used custom DOM events (`notifications-changed`, `notification-click`) for decoupled communication between layout header and dashboard page
  - Build passes clean with zero TypeScript errors
