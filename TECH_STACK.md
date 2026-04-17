# TECH_STACK.md

# Technology Stack

This document defines the full technology stack and framework choices for the SQL Dump Data Migration Platform.

## FRONTEND

The frontend is responsible for UI, routing, job monitoring, review workflows, and export controls.

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Data Fetching & Server State:** TanStack Query
- **Validation:** Zod

## BACKEND

The backend handles API orchestration, service wiring, file handling, and coordination with workers.

- **Language:** Python
- **Framework:** FastAPI
- **Validation & Settings:** Pydantic
- **Database Toolkit:** SQLAlchemy 2.0
- **Database Migrations:** Alembic

## DATA PROCESSING

The processing layer handles high-volume transformation and validation work.

- **Preferred Engine:** Polars
- **Fallback / Compatibility Engine:** pandas

## DATABASE

Used for:
- system metadata
- job tracking
- audit logs
- exception queue
- staging data

- **Database:** PostgreSQL

## BACKGROUND JOBS

Used for:
- dump restoration
- schema profiling
- extraction
- cleaning
- relationship repair
- validation
- export generation

- **Cache / Broker:** Redis
- **Task Queue:** Celery or RQ

## AI LAYER

Used for:
- explanations
- mapping suggestions
- anomaly summaries
- relation repair suggestions

### Requirements
- model provider abstraction
- `.env` configurable
- vendor-agnostic integration
- assistive-only behavior

### Model Defaults
- **Primary Development Model:** Gemini 2.5 Flash
- **Optional Higher-Reasoning Model:** configurable fallback model

## SQL PROCESSING

Used for:
- SQL dialect detection
- SQL parsing
- translation between dialects
- compatibility checks

- **Tooling:** SQLGlot

## EXPORT SUBSYSTEM

Used for:
- Excel generation
- workbook formatting
- SQL export generation

### Python libraries
- `openpyxl`
- `XlsxWriter`

### Optional frontend library
- `SheetJS`

## INFRASTRUCTURE

- **Containerization:** Docker
- **Configuration Management:** environment-based configs (`.env`)

---

## RECOMMENDED DEFAULTS

- **Frontend Package Manager:** pnpm
- **Backend Dependency Manager:** uv or poetry
- **Python Version:** 3.12+
- **Node Version:** 20+

## SUGGESTED PYTHON LIBRARIES

- `openpyxl` for Excel export and workbook editing
- `XlsxWriter` for formatted Excel generation
- `psycopg` for PostgreSQL connectivity
- `python-multipart` for file uploads
- `httpx` for HTTP calls
- `tenacity` for retry logic
- `loguru` or `structlog` for structured logging

## SUGGESTED FRONTEND UTILITIES

- `lucide-react` for icons
- `react-hook-form` for form handling
- `sonner` for toast notifications
- `next-themes` for theme support if needed

---

## ARCHITECTURE RULES

1. **Backend Heavy:** the backend handles all heavy logic, SQL processing, and data transformations
2. **Frontend Light:** the frontend is strictly for presentation and user control
3. **Modular AI:** the AI layer must be modular, replaceable, and vendor-agnostic
4. **No Vendor Lock-In:** core features must not depend rigidly on a single proprietary cloud service provider
5. **Staging First:** all mutation and transformation logic must happen in staging, never against the source