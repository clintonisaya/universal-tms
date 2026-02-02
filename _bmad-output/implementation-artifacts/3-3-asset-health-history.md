# Story 3.3: Asset Health History

**Epic:** 3 - Maintenance & Office Overheads
**Story Key:** 3-3-asset-health-history
**Status:** dev-complete

## 1. User Story

**As a** Fleet Manager,
**I want** to see the full maintenance history of a truck,
**So that** I can make informed decisions about repairs.

## 2. Acceptance Criteria (BDD)

### Scenario 1: View History
**Given** I am viewing Truck "KCB 123A"
**When** I click "Maintenance History" tab
**Then** I see a table of past maintenance events (Date, Garage, Cost, Description)
**And** I see a "Total Maintenance Cost" summary at the top

## 3. Technical Requirements

### 🏗️ Architecture & Stack
*   **Backend:** Aggregation query (Sum of expenses where category='Maintenance' and truck_id=X).
*   **Frontend:** Add Tab to Truck Detail page.

### 📂 File Structure
*   `frontend/src/app/fleet/trucks/[id]/page.tsx`

## 4. Implementation Guide

1.  **Backend:**
    *   New Endpoint `GET /trucks/{id}/maintenance-history`.
2.  **Frontend:**
    *   Simple `Table` component.
    *   `Statistic` card for the Total Cost.
