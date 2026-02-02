---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: ["User Chat: Project Brief", "User Chat: Target User Update", "User Upload: WakaWaka Workflow Images"]
date: 2026-01-24
author: Clinton
---

# Product Brief: edupo-tms

## Executive Summary

Edupo Company Limited requires a custom Transport Management System (TMS) to digitize its logistics fleet operations. The core objective is to move from manual record-keeping to a centralized system that enforces financial discipline through strict approval workflows and provides granular visibility into business performance. The system will center on calculating the exact "Profit per Trip" and "Profit per Day," supported by a rigorous **"Universal Expense Gate"** (Applicant → Manager → Finance) that blocks all funds and printing of vouchers until approvals are secured.

---

## Core Vision

### Problem Statement
Edupo currently operates manually, leading to operational opacity and financial blind spots. There is no automated way to calculate net profit per trip or link specific expenses (fuel, tolls, allowances) to specific revenue events.

### Problem Impact
*   **Financial Leakage:** Without a digital audit trail, expenses are processed without oversight.
*   **Operational Blindness:** Management lacks real-time visibility into truck status (Dispatch, Transit, Idle) and maintenance history.
*   **Inefficiency:** Inability to measure asset utilization efficiency (Profit/Day).

### Why Existing Solutions Fall Short
The current "manual record-keeping" approach fails because it relies on trust and paper, offering no enforcement of approval hierarchies and no real-time data aggregation for decision-making.

### Proposed Solution
A web-based Transport Management System featuring centralized control and visualized tracking:
*   **Core Logic:** **Zero-Trust Universal Expense Gate**. Every cost (Trip or Office) must be approved by a Manager before Finance processes it.
*   **Visual Workflow:** A "Tracking" view similar to the provided reference (WakaWaka), showing exactly where a request sits in the chain (e.g., "Submit" -> "Project Manager" -> "Cash/Transfer") with timestamps and handler names.
*   **Data Structure:**
    *   **Trip:** Central unit for Profitability (Revenue - Expenses).
    *   **Truck:** Central unit for Maintenance and Asset Health.

### Key Differentiators
1.  **Enforced Financial Discipline:** The "Print" function for payment vouchers is strictly disabled until Manager approval is secured.
2.  **Granular Profit Metrics:** Distinct calculation of "Profit per Trip" (Revenue focus) vs. "Profit per Day" (Efficiency focus).
3.  **Role-Specific Workflows:** Strict separation of duties with visual audit trails showing "Accept Time", "Finish Time", and "Approval Opinion" for every node.

## Target Users

### Primary Users

#### 1. Operations Officer (The Applicant)
*   **Role:** Manages the fleet logistics and trip creation.
*   **Motivation:** Wants to get trucks moving quickly and efficiently.
*   **Pain Point:** Being blamed for delays when funds aren't released; fear of "missing" requests.
*   **Key Interaction:** Fills out the "Payable Request Form" (Trip #, Amount, Type) and hits "Submit". Watches the "Tracking" graph for progress.

#### 2. Project Manager (The Gatekeeper)
*   **Role:** The pivot point in the "Universal Expense Gate".
*   **Motivation:** Preventing fraud, controlling costs, and ensuring trip profitability.
*   **Pain Point:** Constant interruptions from Ops and fear of approving fraudulent expenses.
*   **Key Interaction:** Receives "Smart Alerts" (SMS/Push for urgent Truck items; Badge for Office items). Views request details. Hits "Approve" or "Reject" (with reason). *Cannot edit amounts—must reject to force correction.*

#### 3. Finance Officer (The Vault)
*   **Role:** Final check and payment releaser.
*   **Motivation:** Accurate reconciliation, audit trails, and bank balance management.
*   **Pain Point:** Missing receipts and unclear authorization chains.
*   **Key Interaction:** Sees a queue of *only* Manager-approved requests. Checks bank balance. Process payment (Cash/Transfer). *The "Print Voucher" button is only enabled for this role after payment release.*

### Secondary Users

#### 4. General Manager (The Observer)
*   **Role:** High-level strategic oversight.
*   **Motivation:** Maximizing "Profit per Day" and Asset Utilization.
*   **Key Interaction:** Views the "Dashboard" for red flags (Low Profit/Trip, Idle Trucks) and "Reconciliation Reports". Does not participate in daily transactional approvals.

#### 5. Admin (The Architect)
*   **Role:** System configuration and User Management.
*   **Interaction:** Sets up RBAC roles, Expense Types, and System Variables.

### User Journey: The "Expense" Lifecycle (Visualized)
1.  **Request:** Ops submits "Fuel for Trip 101" ($500). State: *Submitted*.
2.  **Gate 1 (Smart Alert):** Manager gets SMS (if urgent truck item). Checks Trip 101 profitability context. Approves. State: *Manager Approved*.
3.  **Gate 2:** Finance sees approved request. Checks cash flow. Pays. State: *Completed*.
4.  **Audit:** Print button enables for Finance. Voucher created with timestamps of all 3 steps.

### Notification Strategy
*   **Smart Priority:**
    *   **Urgent (Truck Expenses):** Push/SMS notifications to Manager to prevent fleet downtime.
    *   **Routine (Office Expenses/Rent):** In-App Badge/Email Digest to reduce notification fatigue.

## Success Metrics

### Business Objectives (Why we are building this)
*   **Profit Visibility:** Accurately calculate Profit = (Rate - Expenses) per trip based on verified data.
*   **Efficiency:** Increase "Profit per Day" by optimizing dispatching (Manual inputs vs. Calendar Days).
*   **Cost Control:** 100% of expenses must pass through the digital approval workflow (Zero Leakage).

### Key Performance Indicators (KPIs)

#### 1. Operational KPIs (The Pulse)
*   **Gate Velocity:** Average time from "Request Submitted" to "Manager Decision". (Target: < 2 hours for Urgent/Truck items).
*   **System Adoption:** % of Physical Trips and Trucks that exist in the system. (Since there is no GPS, this monitors if staff are actually using the tool).
*   **Rejection Rate:** % of requests rejected by Managers. (High rate = Ops needs training on expense policies).

#### 2. Financial KPIs (The Bottom Line)
*   **Profit per Trip:** Net earnings per specific haul.
*   **Profit per Day:** Net earnings divided by trip duration (The "Efficiency" Metric).
*   **Days to Close:** Time taken to reconcile verified actuals vs. released funds after a trip ends.

#### 3. Risk & Compliance KPIs
*   **Voided Vouchers:** Number of vouchers cancelled *after* printing. (High number = Security/Fraud Risk).

## MVP Scope

### Core Modules & Features

#### 1. Operations Module (The Daily Grind)
*   **Trip Management:** Create Trip (Select Truck/Driver/Route), Update Status (Dispatch/Transit/Idle).
*   **Trip Expenses:** Apply for fuel/allowances linked to a specific Trip ID.

#### 2. Fleet Management Module (The Assets)
*   **Truck Registry (Inventory):** List of all trucks with status and basic specs.
*   **Driver Registry:** List of all drivers with license details and contact info.
*   **Maintenance Log:** Basic recording of maintenance events (Date, Truck, Type, Cost) linked to expenses.

#### 3. Finance Module (The Control)
*   **Universal Expense Gate:** Central dashboard for Managers to Approve/Reject *all* requests (Trip or Office).
*   **Payment Processing:** Finance view to release funds for approved items.
*   **Office Expenses:** Independent form for non-trip costs (Rent, Utilities).
*   **Voucher Printing:** Secure generation after payment.

### Out of Scope for MVP (Phase 2)
*   **Spare Parts Inventory:** Warehouse stock management is excluded.
*   **GPS Integration:** No automated location tracking.
*   **Driver Mobile App:** Ops/Drivers will not have a dedicated app; they use the web portal.
*   **Multi-Currency:** System assumes single operating currency for MVP.

### Future Vision
*   **Phase 2:** Integrate GPS API to automate "Status" updates (Geofencing).
*   **Phase 3:** Predictive Maintenance based on Mileage (from GPS).
*   **Phase 4:** Driver Performance Scoring based on Profit/Day.
