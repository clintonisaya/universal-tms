# Development Setup Guide

## Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) 20+
- [uv](https://docs.astral.sh/uv/) for Python package management

## Quick Start

### 1. Clone and configure

```bash
git clone <repo-url> && cd nablafleet-tms
cp .env.example .env
# Edit .env — at minimum change SECRET_KEY, POSTGRES_PASSWORD, FIRST_SUPERUSER_PASSWORD
```

### 2. Start with Docker Compose

```bash
docker compose up
```

This starts:
- **PostgreSQL** on `localhost:5433`
- **FastAPI backend** on `localhost:8000` (with hot reload)

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

## Running Tests

### Backend tests

```bash
cd backend
uv sync
source .venv/bin/activate
pytest
```

Or via Docker:

```bash
docker compose exec backend bash scripts/tests-start.sh
```

### Frontend tests

```bash
cd frontend
npm test
```

## Database Migrations

Migrations run automatically on `docker compose up`. To create a new migration:

```bash
docker compose exec backend bash
alembic revision --autogenerate -m "Description of change"
alembic upgrade head
```

## Pre-commit Hooks

This repo uses [pre-commit](https://pre-commit.com/) to run ruff, mypy, and ESLint automatically before each commit.

### Setup

```bash
pip install pre-commit
pre-commit install
```

The hooks run automatically on `git commit`. To run them manually against all files:

```bash
pre-commit run --all-files
```

**Hooks configured** (`.pre-commit-config.yaml`):
- **ruff** — Python linting + formatting (`backend/`)
- **mypy** — Python type checking (`backend/app/`)
- **eslint** — Frontend linting (`frontend/src/`)
- **trailing-whitespace / end-of-file-fixer / check-yaml / check-large-files** — general housekeeping

## Linting

### Backend

```bash
cd backend
source .venv/bin/activate
ruff check .
mypy app/
```

### Frontend

```bash
cd frontend
npm run lint
```

## Project Structure

```
nablafleet-tms/
├── backend/              # FastAPI + SQLModel backend
│   ├── app/
│   │   ├── api/routes/   # API endpoint handlers
│   │   ├── core/         # Config, security, DB setup
│   │   ├── crud.py       # Database operations
│   │   ├── models.py     # SQLModel table definitions
│   │   └── main.py       # FastAPI app entry point
│   └── tests/
├── frontend/             # Next.js 16 frontend
│   └── src/
│       ├── app/          # Next.js pages (App Router)
│       ├── components/   # React components
│       ├── hooks/        # Custom hooks (useApi, etc.)
│       ├── contexts/     # React contexts (Auth, Theme)
│       └── types/        # TypeScript interfaces
├── .env.example          # Environment variable template
├── docker-compose.yaml   # Local dev stack
└── development.md        # This file
```
