---
stepsCompleted: [1, 2, 3]
inputDocuments: ["product-brief-edupo-tms-2026-01-24.md", "architecture.md", "ux-design-specification.md"]
---

# Edupo TMS - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Edupo TMS, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

*   **FR-OPS-01 Trip Management:** Ops shall create Trips (Truck, Driver, Route) and update status (Dispatch, Transit, Idle).
*   **FR-OPS-02 Trip Expenses:** Ops shall apply for expenses (Fuel, Allowances, etc.) linked to specific Trip IDs.
*   **FR-FLEET-01 Registry:** System shall maintain a registry of Trucks and Drivers.
*   **FR-FLEET-02 Maintenance:** System shall log maintenance events.
*   **FR-EXP-01 Universal Gate:** All expenses (Trip or Office) must pass through Manager Approval.
*   **FR-EXP-02 Manager Actions:** Managers shall Approve, Returns (with comment), or Transfer requests.
*   **FR-FIN-01 Payment:** Finance shall view approved requests, check balance, and process payment (Cash/Transfer).
*   **FR-FIN-02 Voucher:** Finance shall print vouchers only *after* payment is released.
*   **FR-ADMIN-01 RBAC:** System shall enforce role-based access for Ops, Manager, Finance, Admin.

### NonFunctional Requirements

*   **NFR-PERF-01 Real-Time:** WebSockets for live status/approval updates.
*   **NFR-SEC-01 Audit:** 100% audit trail for all writes/status changes.
*   **NFR-SEC-02 Access:** Closed system, Admin-managed credentials only.
*   **NFR-UX-01:** Optimistic UI updates for high velocity.

### Additional Requirements

*   **Tech Stack:** Next.js (TS) + Ant Design, FastAPI (Python) + PostgreSQL.
*   **Architecture:** Dual-stack isolation (Frontend/Backend).
*   **UX:** "WakaWaka" node graph visualization for workflow tracking.
*   **UX:** Dense data tables with fixed action bars.
*   **Implementation:** Use `tiangolo/full-stack-fastapi-postgresql` and `create-next-app`.
*   **API Client:** Use Orval to generate React Query hooks from OpenAPI.
*   **State Management:** TanStack Query for all server state.

### FR Coverage Map

### FR Coverage Map

*   **FR-ADMIN-01 RBAC:** Epic 1 - Foundation & Registry
*   **FR-FLEET-01 Registry:** Epic 1 - Foundation & Registry
*   **NFR-SEC-02 Access:** Epic 1 - Foundation & Registry
*   **FR-OPS-01 Trip Management:** Epic 2 - Core Logistics Cycle
*   **FR-OPS-02 Trip Expenses:** Epic 2 - Core Logistics Cycle
*   **FR-EXP-01 Universal Gate:** Epic 2 - Core Logistics Cycle
*   **FR-EXP-02 Manager Actions:** Epic 2 - Core Logistics Cycle
*   **FR-FIN-01 Payment:** Epic 2 - Core Logistics Cycle
*   **FR-FIN-02 Voucher:** Epic 2 - Core Logistics Cycle
*   **NFR-PERF-01 Real-Time:** Epic 2 - Core Logistics Cycle
*   **NFR-UX-01 Optimistic UI:** Epic 2 - Core Logistics Cycle
*   **FR-FLEET-02 Maintenance:** Epic 3 - Maintenance & Office

## Epic List

## Epic List

### Epic 1: System Foundation & Asset Registry
Establish the secure digital environment and onboard the physical assets (Trucks/Drivers) so the business can exist digitally.
**FRs covered:** FR-ADMIN-01, FR-FLEET-01, NFR-SEC-02

### Epic 2: Core Logistics Cycle (Trip & Universal Expense Gate)
Enable the end-to-end MVP loop: Dispatching a truck and processing its costs through the "Universal Gate" to payment.
**FRs covered:** FR-OPS-01, FR-OPS-02, FR-EXP-01, FR-EXP-02, FR-FIN-01, FR-FIN-02, NFR-PERF-01, NFR-UX-01

### Epic 3: Maintenance & Office Overheads
Manage non-trip costs and long-term asset health.
**FRs covered:** FR-FLEET-02

## Epic 1: System Foundation & Asset Registry

Establish the secure digital environment and onboard the physical assets (Trucks/Drivers) so the business can exist digitally.

### Story 1.1: Project Initialization & Scaffold

As a Developer,
I want to initialize the project repository with the dual-stack architecture,
So that the team has a working foundation to build upon.

**Acceptance Criteria:**

**Given** I have the "tiangolo/full-stack-fastapi-postgresql" starter template
**When** I clone and configure it as the `backend/` directory
**And** I initialize a new Next.js app in the `frontend/` directory
**Then** I can run `docker-compose up` to start both the Python Backend and Postgres Database
**And** I can run `npm run dev` to start the Frontend
**And** the Frontend is configured to proxy API requests to the Backend interactively

### Story 1.2: Admin User Management

As a Super Admin,
I want to create the initial staff accounts (Manager, Ops, Finance) and assign their roles,
So that the correct staff can access the system with appropriate permissions.

**Acceptance Criteria:**

**Given** I am logged in as a Super Admin
**When** I fill out the "Create User" form with Username, Password, and Role (Admin, Manager, Ops, Finance)
**Then** a new user is created in the database with the hashed password
**And** the user can log in immediately
**And** I cannot create a user with a duplicate username

### Story 1.3: Secure Authentication

As a System User,
I want to log in securely,
So that I can access my dashboard without exposing my credentials.

**Acceptance Criteria:**

**Given** I am on the Login Page
**When** I enter valid credentials
**Then** I receive an HTTP-Only JWT cookie
**And** I am redirected to the dashboard specific to my role (e.g., /ops, /manager)
**When** I enter invalid credentials
**Then** I see a specific error message "Invalid username or password"
**And** no cookie is set

### Story 1.4: Truck Registry Management

As a Fleet Manager,
I want to register physical trucks in the system,
So that they can be selected for trips.

**Acceptance Criteria:**

**Given** I am a Fleet Manager
**When** I submit the "New Truck" form (Plate Number, Make, Model, Status=Idle)
**Then** the truck is saved to the registry
**And** it appears in the "Available Trucks" dropdown for Ops
**When** I try to register a duplicate Plate Number
**Then** the system prevents it and shows an error

### Story 1.5: Driver Registry Management

As a Fleet Manager,
I want to register verified drivers,
So that they can be assigned to trips.

**Acceptance Criteria:**

**Given** I am a Fleet Manager
**When** I submit the "New Driver" form (Full Name, License Number, Phone)
**Then** the driver is saved to the registry
**And** they appear in the "Available Drivers" dropdown
**And** the default status is "Active"

## Epic 2: Core Logistics Cycle (Trip & Universal Expense Gate)

Enable the end-to-end MVP loop: Dispatching a truck and processing its costs through the "Universal Gate" to payment.

### Story 2.1: Trip Creation & Dispatch

As an Ops Officer,
I want to create and dispatch a new trip,
So that the truck can start its journey and revenue generation.

**Acceptance Criteria:**

**Given** I am an Ops Officer on the "New Trip" page
**When** I select a Truck, Driver, and Route (from defaults or manual)
**Then** I can "Dispatch" the trip
**And** the Trip Status updates to "In Transit"
**And** the Truck Status updates to "In Transit" (unavailable for other trips)

### Story 2.2: Expense Request Submission

As an Ops Officer,
I want to submit expense requests for a specific trip,
So that I can get funds for fuel or allowances.

**Acceptance Criteria:**

**Given** I am viewing a Trip
**When** I submit an "Add Expense" form (Type=Fuel, Amount=500, Description)
**Then** a new Expense Request is created with status "Pending Manager"
**And** it appears immediately in the Manager's "Approval Queue"
**And** the "Total Expenses" for the trip updates (pending state)

### Story 2.3: Manager Approval Workflow (The Gate)

As a General Manager,
I want to approve or reject expense requests,
So that I can control costs and prevent fraud.

**Acceptance Criteria:**

**Given** I am a Manager viewing my "Approval Queue"
**When** I click "Approve" on a request
**Then** the status changes to "Pending Finance"
**When** I click "Return" or "Reject"
**Then** I am forced to enter a comment
**And** the status changes to "Returned" or "Rejected" respectively
**And** the Ops user can see my comment

### Story 2.4: Finance Payment Processing

As a Finance Officer,
I want to marks requests as paid,
So that funds are released to the Ops team.

**Acceptance Criteria:**

**Given** I am a Finance Officer viewing the "Pending Finance" list
**When** I click "Pay" (Select Cash or Transfer)
**Then** the Expense Status changes to "Paid"
**And** the funds are deducted from the company balance (if tracked)
**And** the Ops Officer gets a notification (if applicable)

### Story 2.5: Voucher Printing

As a Finance Officer,
I want to print a payment voucher,
So that there is purely physical evidence of the transaction.

**Acceptance Criteria:**

**Given** I am viewing an Expense Request
**When** the status is "Pending" or "Approved"
**Then** the "Print Voucher" button is DISABLED
**When** the status is "Paid"
**Then** the "Print Voucher" button is ENABLED
**And** clicking it generates a PDF voucher with timestamps of Approval and Payment

### Story 2.6: Real-Time Status Dashboard

As a Manager,
I want to see status changes instantly without refreshing,
So that I can make decisions on the latest data.

**Acceptance Criteria:**

**Given** I am viewing the Dashboard
**When** an Ops Officer submits a request
**Then** it appears in my list within 2 seconds (via WebSocket)
**When** I approve a request
**Then** it vanishes from my "Pending" list instantly (Optimistic UI)

## Epic 3: Maintenance & Office Overheads

Manage non-trip costs and long-term asset health.

### Story 3.1: Maintenance Event Logging

As a Fleet Manager,
I want to log maintenance events and their costs,
So that I can track the total cost of ownership for each truck.

**Acceptance Criteria:**

**Given** I am a Fleet Manager
**When** I submit a "New Maintenance Record" (Truck, Garage, Cost, Description)
**Then** an Expense Request is created with type "Maintenance"
**And** it enters the "Universal Gate" (Status: Pending Manager)
**And** it is linked to the specific Truck's history

### Story 3.2: Office Expense Management

As an Admin or Ops Officer,
I want to submit operational expenses (Rent, Utilities) unrelated to trips,
So that they can be paid through the standard approval channel.

**Acceptance Criteria:**

**Given** I am on the "Office Expenses" page
**When** I submit a request (Category=Rent, Amount=1000, Description)
**Then** it enters the "Universal Gate" (Status: Pending Manager)
**And** Finance can eventually pay it just like a trip expense

### Story 3.3: Asset Health History

As a Fleet Manager,
I want to see the full maintenance history of a truck,
So that I can make informed decisions about repairs or replacement.

**Acceptance Criteria:**

**Given** I am viewing a Truck's Detail Page
**When** I click the "Maintenance History" tab
**Then** I see a table of all past maintenance events and costs
**And** I see a "Total Maintenance Cost" summary


## Epic 7: Visual Design System Migration

Replicate the visual design from `edupo-redesign.jsx` into the production codebase — pixel-perfect match across all screens. Zero functional changes. Only the visual layer is updated.

**Source reference:** `/home/clinton/dev/edupo-tms/edupo-redesign.jsx`
**Themes:** Dark (default) + Light with toggle
**Constraint:** All Ant Design components, routing, auth, permissions, API calls stay untouched

### Story 7.1: Design Tokens & CSS Variables Foundation

As a developer implementing the visual redesign,
I want all design tokens from `edupo-redesign.jsx` extracted into `themeConfig.ts` and `globals.css`,
So that every subsequent visual story has a single source of truth for colors, spacing, and theme values.

### Story 7.2: Theme Toggle Infrastructure

As a user of Edupo TMS,
I want a dark/light theme toggle that persists my preference,
So that I can use the app comfortably in any lighting environment.

### Story 7.3: Login Page Visual Restyle

As a user opening Edupo TMS,
I want the login page to look exactly like the redesign prototype,
So that the app makes a strong first impression with the new visual identity.

### Story 7.4: App Shell — Sidebar & Header Restyle

As a daily user of Edupo TMS,
I want the sidebar and header to look exactly like the redesign prototype,
So that every session starts with the new visual identity.

### Story 7.5: Status Badges Exact Match

As a user scanning data tables,
I want status badges to look exactly like the redesign prototype,
So that status information is visually clear and consistent.

### Story 7.6: KPI / Metric Cards Restyle

As a user viewing the dashboard,
I want KPI metric cards to look exactly like the redesign prototype,
So that key numbers are displayed with the new visual style.

### Story 7.7: Table Visual Styling

As a user reading data tables across all pages,
I want all tables to look exactly like the redesign prototype,
So that data is presented with the new visual style consistently.

### Story 7.8: Page Headers & Action Buttons

As a user on any list page,
I want page headers and action buttons to look exactly like the redesign prototype,
So that navigation and actions are visually consistent with the new design.

### Story 7.9: Global Font (DM Sans) & Scrollbar

As a user of Edupo TMS,
I want the app to use DM Sans font and a minimal scrollbar style,
So that the typography and browser chrome match the redesign exactly.
