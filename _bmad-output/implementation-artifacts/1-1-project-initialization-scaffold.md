# Story 1.1: Project Initialization & Scaffold

**Epic:** 1 - System Foundation & Asset Registry
**Story Key:** 1-1-project-initialization-scaffold
**Status:** ready-for-dev

## 1. User Story

**As a** Developer,
**I want** to initialize the project repository with the dual-stack architecture (FastAPI + Next.js),
**So that** the team has a working foundation to build upon.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Backend Initialization
**Given** I have the official `tiangolo/full-stack-fastapi-postgresql` starter template (commit `13a7c7c`)
**When** I clone it into the project root
**And** I configure the `.env` files for development
**Then** the directory structure under `backend/` matches the starter template
**And** the `frontend/` directory from the template is REMOVED (we will create a custom one)

### Scenario 2: Frontend Initialization
**Given** an empty `frontend/` directory
**When** I run `npx create-next-app@latest . --typescript --tailwind --eslint`
**And** I install Ant Design dependencies (`antd`, `@ant-design/nextjs-registry`, `@ant-design/cssinjs`)
**Then** a new Next.js 14+ App Router project is created
**And** it builds successfully with `npm run build`

### Scenario 3: Container Orchestration
**Given** the backend and frontend are initialized
**When** I configure `docker-compose.yml` (or `docker-compose.dev.yml`)
**Then** I can run `docker-compose up` to start:
    - Postgres 16 Database
    - FastAPI Backend (port 8000)
    - Traefik / Proxy (port 80)
    - Adminer (optional, port 8080)
**And** the Next.js frontend is accessible on host port 3000

## 3. Technical Requirements

### 🏗️ Architecture Compliance

*   **Dual-Stack Structure:**
    *   `backend/` -> FastAPI (Python 3.10+)
    *   `frontend/` -> Next.js (Node 20+)
    *   `project-root` -> Docker Compose orchestration
*   **Database:** PostgreSQL 16
*   **API Client Generation:** Install `orval` in frontend (but do not generate yet - just setup package.json).

### 🛠️ Library & Framework Requirements

*   **Backend:**
    *   `fastapi`
    *   `sqlmodel` (or `sqlalchemy` + `pydantic`)
    *   `alembic` for migrations
*   **Frontend:**
    *   `next` (App Router)
    *   `antd` (v5+)
    *   `tailwindcss` (for utility classes)

### 📂 File Structure Requirements

```text
edupo-tms/
├── backend/                # Cloned from tiangolo/full-stack-fastapi-postgresql
│   ├── app/
│   │   ├── main.py
│   │   └── ...
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/               # Custom Next.js App
│   ├── src/
│   │   ├── app/
│   │   │   └── page.tsx    # "Hello World"
│   ├── package.json
│   └── next.config.mjs
└── docker-compose.yml      # Orchestrates Backend + DB
```

## 4. Implementation Guide for Dev Agent

1.  **Backend Setup:**
    *   Do NOT blindly copy all files. Focus on the `backend/` folder and `docker-compose.yml` from the starter.
    *   Remove the `frontend` folder that comes with the Tiangolo starter (it uses Vue/React, we want a fresh Next.js one).
2.  **Frontend Setup:**
    *   Use `npx create-next-app` as specified.
    *   Ensure `AntdRegistry` component is created in `frontend/src/lib/AntdRegistry.tsx` to handle SSR styling (Google "Ant Design Next.js App Router Registry").
3.  **Integration:**
    *   Update `next.config.mjs` to proxy `/api/v1` requests to `http://backend:8000` (or the proper docker service name) during development to avoid CORS issues.

## 5. Development Validation

*   **Run Check:** `docker-compose up -d` -> All containers healthy.
*   **Frontend Check:** Visit `http://localhost:3000` -> See Next.js default page.
*   **Backend Check:** Visit `http://localhost:8000/docs` -> See Swagger UI.
