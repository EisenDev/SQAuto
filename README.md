# 🚀 SQAuto: Industrial-Grade SQL Dump Data Migration Platform

SQAuto is a comprehensive, industrial-grade platform designed to securely manage the transition of legacy database structures into modern systems. It provides an end-to-end pipeline for restoring, analyzing, cleaning, validating, and exporting SQL dump data with AI-assisted intelligence.

---

## 🛡️ Core Principles & Safety
SQAuto is built on a foundation of data integrity and absolute traceability.

- **Read-Only Source:** The original SQL dump is the **Source of Truth** and is ALWAYS treated as read-only.
- **Staging Sandbox:** All transformations, cleaning, and deletions happen ONLY in an isolated staging environment.
- **Deterministic Priority:** Deterministic logic always takes precedence over AI suggestions.
- **Auditability:** Every action, decision, and AI suggestion is logged with metadata (reason, confidence, timestamp).
- **No Direct Writes:** The platform never performs direct writes to any production database.

---

## ✨ Key Features

- **Project-Based Isolation:** Manage multiple migrations within an Organization/Project hierarchy.
- **Automated Pipeline:** Upload → Restore → Analyze → Extract → Clean → Repair → Validate → Export.
- **Schema Profiling:** Automated detection of tables, columns, constraints, and data quality metrics.
- **AI-Assisted Guidance:** Gemini-powered schema explanations, mapping suggestions, and anomaly detection.
- **Relationship Repair Engine:** Intelligent detection and fixing of orphan records with confidence scoring.
- **Modular Export Pipeline:** Generate Clean SQL (PostgreSQL), Translated SQL (MySQL, SQLite), or structured Excel workbooks.
- **Integrity Validation:** Exhaustive checks for duplicates, null rates, and relationship consistency.

---

## 🏗️ Architecture & Data Flow
SQAuto follows a service-oriented monorepo architecture designed to isolate heavy processing from the UI.

### Components
1. **Frontend (`apps/web`):** Next.js App Router workspace for job monitoring and control.
2. **Backend API (`apps/api`):** FastAPI orchestration layer for job dispatching and validation.
3. **Services (`services/`):** Core business logic including Data Intelligence, Migration Engine, and Smart Fix.
4. **Processing Engine:** Polars-powered high-performance data transformation.
5. **Worker Layer:** Redis + Celery/RQ for background job execution.

### The Pipeline Lifecycle
`Uploaded` → `Restoring` → `Analyzing` → `Extracting` → `Cleaning` → `Repairing` → `Validating` → `Needs Review` → `Ready for Export` → `Exported`

---

## 💻 Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js (TypeScript), Tailwind CSS, shadcn/ui, TanStack Query |
| **Backend** | Python (FastAPI), SQLAlchemy 2.0, Pydantic |
| **Data Engine** | Polars (Primary) / pandas (Fallback) |
| **Database** | PostgreSQL (Metadata + Staging) |
| **Background Jobs** | Redis + Celery/RQ |
| **AI Layer** | Gemini 1.5 Flash / 2.5 Flash |
| **SQL Processing** | SQLGlot |

---

## 📁 Repository Structure

```text
.
├── apps/
│   ├── api/            # FastAPI Backend
│   └── web/            # Next.js Frontend
├── services/           # Core Migration Services
│   ├── ai_assistant/   # AI guidance layer
│   ├── cleaner/        # Data normalization
│   ├── extractor/      # Chunk-based data extraction
│   ├── smart_fix/      # Relationship repair & mapping
│   └── ...             # Other specialized services
├── configs/            # System & Model configurations
├── docker/             # Deployment configurations
└── docs/               # Technical documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- Node.js 20+ recommended
- Docker with Docker Compose

`./run.sh` starts the local Postgres and Redis services through Docker, then starts the FastAPI backend and Next.js frontend.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/EisenDev/SQAuto.git
   cd SQAuto
   ```

2. **Run the local development stack:**
   ```bash
   ./run.sh
   ```

   Default local URLs:
   ```text
   API: http://localhost:8000
   Web: http://localhost:3000
   Health: http://localhost:8000/health
   ```

3. **Optional environment setup:**
   `./run.sh` can run without `.env` by using local development defaults. To customize ports, database URLs, secrets, or AI keys, copy the example file and edit it:
   ```bash
   cp .env.example .env
   ```

   Common overrides:
   ```bash
   API_PORT=8010 WEB_PORT=3010 SQAUTO_DB_PORT=55434 ./run.sh
   ```

For Windows and Linux setup details, Docker Desktop WSL notes, and troubleshooting, see [Running Locally](./docs/RUNNING_LOCALLY.md).

---

## 📊 Export Structure
Final exports provide a structured workbook or SQL script:
- **00_Summary:** Migration stats and readiness status.
- **Table Sheets:** Cleaned and normalized data per table.
- **Broken_Relations:** Log of orphan records and repair status.
- **AI_Summary:** Human-readable findings and anomalies.
- **Validation_Report:** Full integrity check results.

---

## 📜 Documentation
For more detailed information, see the `/docs` directory:
- [Running Locally](./docs/RUNNING_LOCALLY.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Safety Rules](./SAFETY_RULES.md)
- [Export Pipeline](./EXPORT_PIPELINE.md)
- [Technical Stack](./TECH_STACK.md)

---

Developed with ❤️ for secure and intelligent data migrations.
