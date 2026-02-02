# Product Requirements Document (PRD): Edupo TMS

## 1. Introduction
Edupo Company Limited requires a custom Transport Management System (TMS) to digitize its logistics fleet operations. The core objective is to move from manual record-keeping to a centralized system that enforces financial discipline through strict approval workflows.

The system will center on **"Profit per Trip"** visibility and a **"Universal Expense Gate"**, ensuring no funds are released without digital Manager approval.

## 2. Goals & Success Metrics
### 2.1 Core Goals
1.  **Financial Discipline:** Force all expenses through a digital "Manager Approval" gate.
2.  **Operational Visibility:** Real-time status of Trucks (Idle vs In Transit) and Profitability per Trip.
3.  **Auditability:** 100% digital paper trail for every released shilling.

### 2.2 Metrics (KPIs)
*   **Gate Velocity:** Time from Expense Request -> Manager Decision (< 2 hours).
*   **System Adoption:** % of Physical Trips logged in System.
*   **Profit Accuracy:** Variance between System Profit and Bank Actuals.

## 3. User Personas
*   **Ops Officer:** Initiates Trips, requests expenses (Fuel/Allowances).
*   **Fleet Manager (Gatekeeper):** Approves/Rejects expenses, manages Truck/Driver registry.
*   **Finance Officer (The Vault):** Pays approved requests, prints vouchers.
*   **Admin:** Manages User Access (RBAC) and System Settings.

## 4. Functional Requirements
(Derived from `epics.md`)

### 4.1 Epic 1: System Foundation
*   **FR-ADMIN-01:** RBAC for Admin, Manager, Ops, Finance.
*   **FR-FLEET-01:** Registry for Trucks (Plate, Make, Status) and Drivers (License, Phone).
*   **FR-AUTH-01:** Secure Login with HTTP-Only Cookies.

### 4.2 Epic 2: Core Logistics Cycle
*   **FR-OPS-01 (Trip):** Create Trip (Truck + Driver + Route). Ensure Truck is "Idle" before dispatch.
*   **FR-OPS-02 (Expenses):** Submit Expense linked to Trip. Status: Pending Manager.
*   **FR-EXP-01 (The Gate):** Manager View. Approve -> Pending Finance. Reject/Return -> Requestor.
*   **FR-FIN-01 (Payment):** Finance View. Mark "Paid" (Cash/M-Pesa).
*   **FR-FIN-02 (Voucher):** Print PDF Voucher *only* after Status is "Paid".
*   **FR-DASH-01:** Real-time "WakaWaka" style tracking of request status.

### 4.3 Epic 3: Maintenance & Office
*   **FR-MAINT-01:** Log Maintenance Events (Garage, Cost) linked to Truck History.
*   **FR-OFFICE-01:** Submit "Office Expenses" (Rent/Utilities) through the same Universal Gate.
*   **FR-ASSET-01:** View Total Cost of Ownership per Truck.

## 5. Non-Functional Requirements
(Derived from `architecture.md`)

### 5.1 Performance
*   **Real-Time:** WebSockets for live status updates (Dashboard counters, Notifications).
*   **Optimistic UI:** Immediate interface feedback for Manager approvals.

### 5.2 Security
*   **Authentication:** JWT via HTTP-Only Cookies (No LocalStorage).
*   **Access:** Closed system (Admin-created users only).
*   **Audit:** Immutable logs for all financial state changes.

### 5.3 Technical Stack
*   **Frontend:** Next.js (TypeScript) + Ant Design (Enterprise UI).
*   **Backend:** FastAPI (Python) + PostgreSQL.
*   **Infrastructure:** Docker Compose (Dual-Stack).

## 6. UX Guidelines
(Derived from `ux-design-specification.md`)

*   **Visual Style:** "Enterprise Dense" (Ant Design ProTable).
*   **Dashboard:** High-level metrics (Cards/Charts) + Real-time Activity Feed.
*   **Module Views:** Dense Tables with Filters/Action Bars for high-volume processing.
*   **Theme:** Professional / Clean (Edupo Branding).

## 7. Roadmap & Phases
*   **Phase 1 (MVP):** Full Trip Cycle, Expense Gate, Voucher Printing, Asset Registry.
*   **Phase 2:** GPS Integration, Advanced Warehouse Inventory.
