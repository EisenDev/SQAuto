# SQAuto: SQL Dump Data Migration Platform

SQAuto is a comprehensive, industrial-grade platform designed to securely manage the transition of legacy database structures into modern systems. It provides an end-to-end pipeline for restoring, analyzing, cleaning, validating, and exporting SQL dump data.

---

## 🛡️ Core Principles & Safety
The platform is built on a foundation of data integrity and traceability.

- **Read-Only Source:** The original SQL dump is the **Source of Truth** and is ALWAYS treated as read-only.
- **Staging Sandbox:** All transformations, cleaning, and deletions happen ONLY in an isolated staging environment.
- **Deterministic Priority:** Deterministic logic always takes precedence over AI suggestions.
- **Auditability:** Every action, decision, and AI suggestion is logged with metadata (reason, confidence, timestamp).
- **No Direct Writes:** Never performs direct writes to any production database.

---

## 💻 Technology Stack

### Frontend
- **Framework:** Next.js (App Router) with TypeScript
- **Styling:** Tailwind CSS & shadcn/ui
- **State Management:** TanStack Query & Zod

### Backend & Processing
- **Language:** Python 3.12+ (FastAPI)
- **Database:** PostgreSQL (System metadata + Staging data)
- **Processing Engine:** Polars (Primary) / pandas (Fallback)
- **Background Jobs:** Redis + Celery/RQ
- **SQL Parsing:** SQLGlot

### AI Layer
- **Model:** Gemini 1.5 Flash (Primary)
- **Role:** Assistive-only guidance for schema explanation, mapping suggestions, and anomaly detection.

---

## 🏗️ Architecture & Data Flow
SQAuto follows a service-oriented monorepo architecture designed to isolate heavy processing from the UI.

### Components
1. **Frontend (`apps/web`):** Presentation, job monitoring, and export controls.
2. **Backend API (`apps/api`):** Orchestration, validation, and job dispatching.
3. **Migration Workers (`workers/`):** Resource-intensive tasks (restoration, profiling, extraction).
4. **AI Assistant (`services/ai_assistant`):** Non-authoritative guidance and explanations.

### Pipeline Flow
1. **Upload:** User provides a SQL dump.
2. **Restore:** Dump is restored into an isolated staging schema.
3. **Analyze:** Schema Profiler detects tables, columns, and constraints.
4. **Extract:** Data is extracted in chunks with metadata tagging.
5. **Clean:** Deterministic rules normalize and deduplicate data.
6. **Repair:** Relationship Repair Engine detects/fixes orphans.
7. **Validate:** Integrity checks (row counts, duplicates, etc.) are performed.
8. **Review/Export:** Operators review exceptions and export results.

---

## ⚙️ Core Modules

- **Schema Profiler:** Analyzes null rates, detects duplicates, and proposes candidate keys.
- **Extraction Engine:** Handles chunk-based extraction for massive datasets.
- **Cleaning Engine:** Standardizes casing, formatting, and type conversions.
- **Relationship Repair:** Scores repair confidence and routes low-confidence cases to an **Exception Queue**.
- **Export System:** Generates Excel workbooks, Clean SQL, and Best-effort Translated SQL.

---

## 🔄 Job Lifecycle
Every migration job progresses through these states:
`Uploaded` → `Restoring` → `Analyzing` → `Extracting` → `Cleaning` → `Repairing` → `Validating` → `Needs Review` → `Ready for Export` → `Exported`

---

## 🎨 UI & Design Philosophy
- **Modern & Minimalist:** Low visual noise, clean spacing, and readable language.
- **Progressive Disclosure:** Advanced tools are collapsed by default.
- **Real-time Feedback:** Status badges (Green/Amber/Red) and progress bars for all backend jobs.
- **Human-Readable:** Avoids technical jargon; uses clear labels like "Data Quality" instead of "Anomaly Detection".

---

## 📊 Export Structure (Excel)
Final exports include a structured workbook:
- **00_Summary:** Job ID, stats, and readiness status.
- **Table Sheets:** Individual sheets for each cleaned table.
- **Broken_Relations:** Log of orphan records and repair status.
- **AI_Summary:** Human-readable explanations of the data findings.
- **Validation_Report:** Full integrity check results.

---

> [!IMPORTANT]
> **Safety First:** Never assume missing relations are safe to ignore. Always favor operator review over unsafe automation.
