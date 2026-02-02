---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7]
inputDocuments: ["product-brief-edupo-tms-2026-01-24.md", "ux-design-specification.md"]
workflowType: 'architecture'
project_name: 'Edupo TMS'
user_name: 'Clinton'
date: '2026-01-25'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
*   **Universal Expense Gate:** All financial actions require Manager Approval (Double-Ledger Logic).
*   **Non-GPS Tracking:** Vehicle Logic is state-based (Manual Check-ins), not Geolocation-based.
*   **Role-Based Access:** Distinct Views for Ops Officer (Mobile/Form), Manager (Dashboard), Finance (Ledger).

**Non-Functional Requirements:**
*   **Real-Time Updates:** WebSockets required for "Live Logic" (e.g., Truck Status changes).
*   **High Velocity:** Optimistic Updates for Manager App.
*   **Auditability:** 100% of actions must be traceable (Postgres Audit Trails).

**Scale & Complexity:**
*   **Primary Domain:** Logistics & Financial Control (Enterprise).
*   **Complexity Level:** High (Real-time state sync, strict financial governance).
*   **Estimated Components:** ~15 (Auth, Trips, Expenses, Vehicles, Audit, Reports, Notifs, etc.).

### Technical Constraints & Dependencies
*   **Frontend:** **Next.js (TS)** + **Ant Design (AntD)**.
    *   *Rationale:* Matches UX Spec and User Preference for "Enterprise Dense" UI.
*   **Backend:** **FastAPI (Python)** + Celery + Redis.
    *   *Rationale:* User Preference for Python backend performance and scalability.
*   **Data Layer:** PostgreSQL (Foreign Keys, Transactions).
*   **Infra:** Docker + Nginx + Cloudflare.

### Cross-Cutting Concerns Identified
*   **AntD SSR Compatibility:** Next.js App Router requires specific setup (`@ant-design/nextjs-registry`) to work correctly with Ant Design's CSS-in-JS.
*   **Type Sharing:** Since Frontend is TS and Backend is Python, we cannot share types directly. We must use **OpenAPI/Swagger** generation to keep them in sync.
*   **State Management:** TanStack Query is critical for bridging the gap between AntD's controlled components and the API state.

## Starter Template Evaluation

### Dual-Stack Architecture
Since we have a decoupled architecture, we require two distinct starters.

### 1. Backend: FastAPI (Python)
**Selected Starter:** `tiangolo/full-stack-fastapi-postgresql`
*   **Why:** Maintained by Sebastián Ramírez (FastAPI creator). Includes Docker, Postgres, Redis, Celery, and Traefik out of the box.
*   **Modification:** We will strictly use the `/backend` services from this stack.

### 2. Frontend: Next.js + Ant Design
**Selected Starter:** **Custom `create-next-app` Setup**
*   **Why:** Most AntD starters are outdated. We need Next.js 14 App Router compliance.
*   **Initialization Command:**
    ```bash
    npx create-next-app@latest edupo-frontend --typescript --tailwind --eslint
    npm install antd @ant-design/nextjs-registry @ant-design/cssinjs
    ```
*   **Key Pattern:** We will implement the `AntdRegistry` provider to handle CSS-in-JS injection for Server Side Rendering.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
*   **Auth Model:** Closed System (Username/Password) managed by Admins.
*   **State Sync:** TanStack Query + OpenAPI Generation.
*   **Real-Time:** Native FastAPI WebSockets.

### Authentication & Security
*   **Model:** **Closed Enterprise System.**
    *   No public signup. Users are created manually by Admins (Role: `General Manager`, `Super Admin`) via the Dashboard.
    *   **Credentials:** `Username` + `Password` (No email magic links).
    *   **Reset Flow:** Manual Admin Reset (as seen in screenshots), not self-service email recovery.
*   **Mechanism:** JWT (Stateless) with HTTP-Only Cookies.
*   **RBAC:** Strict Middleware enforcement based on `role` claim in JWT (`admin`, `manager`, `ops`, `finance`, `driver`).

### Data Architecture
*   **Database:** PostgreSQL 16 (Relational).
*   **ORM:** **SQLAlchemy (Async)**.
*   **Audit Logic:** `system_audit_log` table captures ALL writes. Triggers are too hidden; we will use **Service Layer Hooks** to log audit events explicitly.

### API & Communication Patterns
*   **REST API:** Primary communication for CRUD.
*   **WebSockets:** For "Live Truck Status" and "Approval Notifications".
*   **Client Generation:** **Orval**. We will generate React Query hooks directly from `openapi.json` to ensure type safety between Python and TypeScript.

### Frontend Architecture
*   **State Management:** **TanStack Query (v5)**.
    *   *Rule:* No `useEffect` for data fetching. All server state is managed via Query Keys.
*   **Component Library:** Ant Design (v5) with "Compact Algorithm".
*   **Layout:** `Ant Design ProLayout` for the collapsible sidebar and breadcrumbs.

## Implementation Patterns & Consistency Rules

### Critical Conflict Strategy: "The Case Bridge"
*   **Conflict:** Python (Backend) uses `snake_case`, JavaScript (Frontend) uses `camelCase`.
*   **Resolution:** API responses are sent as `snake_case`. The Frontend API Client (Orval/Axios) **must** strictly convert to `camelCase` upon reception (and vice versa for requests).
*   **Why:** Ensures Python developers and React developers effectively speak their native languages without linter violations.

### Schema-First Development
*   **Rule:** Frontend Agents/Developers are **FORBIDDEN** from manually defining API interfaces.
*   **Workflow:**
    1.  Backend Agent updates Pydantic Models.
    2.  System generates `openapi.json`.
    3.  Frontend Agent runs `npm run generate:api`.
    4.  Result: TypeScript types are fully synchronized.

### Error Handling Consistency
*   **Standard Error Shape:**
    ```json
    {
      "code": "ERROR_CODE_UPPERCASE",
      "message": "Human readable message",
      "details": { "field": "reason" }
    }
    ```
*   **Frontend Behavior:** Global QueryClient allows `401` to trigger logout, `403` to show Forbidden, and `500` to show Toast-Error.

### Naming Conventions
*   **Database:** `users`, `trip_logs` (Plural, snake_case).
*   **API Endpoints:** `/api/v1/trips` (Plural Nouns).
*   **React Components:** `TripCard.tsx` (PascalCase).
*   **Variables/Functions:** `getTripList` (camelCase).

## Project Structure & Boundaries

### Directory Tree
```text
edupo-tms/
├── backend/                  # FastAPI (Python)
│   ├── app/
│   │   ├── api/v1/          # Endpoints
│   │   │   ├── users.py
│   │   │   └── trips.py
│   │   ├── core/            # Config, Security
│   │   ├── models/          # SQLAlchemy Tables
│   │   ├── schemas/         # Pydantic Models
│   │   └── services/        # Business Logic
│   ├── alembic/             # DB Migrations
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/                 # Next.js (TypeScript)
│   ├── src/
│   │   ├── app/             # App Router
│   │   │   ├── (auth)/      # Login Layout
│   │   │   └── (dashboard)/ # App Layout
│   │   ├── components/      # AntD Components
│   │   ├── services/
│   │   │   └── api/         # Orval Generated Client
│   │   └── lib/             # NextAuth, Utils
│   ├── next.config.mjs
│   └── package.json
└── docker-compose.yml        # Orchestration
```

### Key Boundaries
*   **The "Orval Wall":** `frontend/src/services/api` is READ-ONLY. It is generated from `backend/openapi.json`.
*   **The "Service Layer":** Backend Logic lives in `services/`, not `api/`. API routes should only handle Request/Response parsing.
*   **The "Model Barrier":** Pydantic Models (`schemas/`) define the Public API contract. SQLAlchemy Models (`models/`) define the Database Table. They are almost never 1:1 mapped (Models contain relationships, Schemas contain flattened response fields).

## Architecture Validation Results

### Coherence Validation ✅
*   **Decision Compatibility:** The specific choice of **OpenAPI-driven Client Generation** is the glue that makes the FastAPI/Next.js split viable without massive friction.
*   **Structure Alignment:** The `backend/` vs `frontend/` split accurately reflects the deployable units (Docker containers).

### Implementation Readiness ✅
*   **Decision Completeness:** High. We know the Stack, the Auth, the State, and the Directory Structure.
*   **Gap Analysis:**
    *   *Minor Gap:* We haven't defined the exact Socket.IO event schema yet (this belongs in API Design, not Architecture).
    *   *Resolved:* We have a clear pattern for where it lives (`backend/app/schemas/socket_events.py`).

### Checklists
*   **✅ Requirements Analysis:** 100% Covered.
*   **✅ Architectural Decisions:** 100% Covered.
*   **✅ Implementation Patterns:** Defined (Case Bridge, Schema-First).
*   **✅ Project Structure:** Defined (Dual Root).

### Architecture Readiness Assessment
**Overall Status:** READY FOR IMPLEMENTATION
**Confidence Level:** High
