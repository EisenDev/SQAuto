# ARCHITECTURE.md

# System Architecture

## DESIGN OVERVIEW

The SQL Dump Data Migration Platform follows a service-oriented architecture inside a monorepo setup. The system is designed to isolate heavy processing from the user-facing interface and to ensure that all migration work happens safely in staging.

The platform is built around:
- A modern web frontend
- An API orchestration layer
- Background workers for heavy processing
- A staging database for transformation and validation
- An AI assistant layer for non-authoritative guidance

## HIGH-LEVEL COMPONENTS

### 1. Frontend (`apps/web`)
Responsible only for:
- UI rendering
- User interaction
- Upload workflows
- Job monitoring
- Review screens
- Schema Visualization
- Export controls

The frontend must NOT contain business logic, transformation pipelines, or migration rules.

### 2. Backend API (`apps/api`)
Responsible for:
- Request validation
- Authentication and authorization
- Job creation
- Dispatching work to background workers
- Reading and returning job results
- Serving structured data to the frontend

The backend acts as the orchestration layer between the UI, workers, services, and the staging database.

### 3. Workers (`workers/migration_worker`)
Responsible for long-running and resource-intensive tasks such as:
- Restoring SQL dumps
- Profiling schema
- Extracting large tables in chunks
- Cleaning and normalization
- Relationship repair
- Validation
- Export generation

These tasks must not block the API.

### 4. Database Layer
The system uses PostgreSQL and is logically split into:
- **System data**
  - jobs
  - statuses
  - logs
  - configs
  - exception records
- **Staging data**
  - raw restored tables
  - extracted datasets
  - cleaned datasets
  - validation outputs
  - export-ready datasets

### 5. AI Assistant Layer (`services/ai_assistant`)
Responsible only for:
- Explaining schema and tables
- Suggesting mappings
- Summarizing anomalies
- Ranking possible relation repairs
- Generating operator-facing summaries

The AI assistant is assistive only and must never act as the final authority.

### 6. Migration Engine (`services/migration_engine`)
Responsible for:
- Managing target database connection configurations
- Testing connectivity to external PostgreSQL databases
- Executing dry-run migration validations (read-only)
- Comparing source/staging schemas against target databases
- Generating reconciliation summaries
- Logging all migration events with severity and context

The migration engine must NEVER execute destructive commands (INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER, CREATE) against target databases during Phase 1. Only SELECT and metadata inspection queries are permitted.

### 7. File Storage
The system handles uploaded SQL dumps and generated exports:
- **Uploaded Dumps:** Stored securely on disk (or object storage like S3 in production environments) within a dedicated `uploads/` volume.
- **Processed Artifacts:** Generated exports and intermediate transformation logs are stored in an `exports/` volume.
- **Temporary Storage:** Local disk space is used for transient processing files that do not need persistence beyond the job lifecycle.

### 8. Smart Fix Engine (`services/smart_fix`)
Responsible for:
- Suggesting fixes based on data quality reports (duplicate primary keys, orphan foreign keys, etc.)
- Generating pre-execution preview projections (LIMIT sampled) to show the exact before-and-after of a fix.
- Supplying a safe "Pre-Execution Fix Pipeline" boundary restricting all validated changes exclusively to the staging-copy environment.

### 9. Mapping Suggestion Engine (`services/smart_fix`)
Responsible for:
- Automatically generating mapping confidence scores comparing Source column structure to Destination column schemas.
- Using fuzzy matching, snake_case conversion logic, and type correlation.

## SERVICE BOUNDARIES

### Frontend
Consumes API endpoints and displays:
- Upload status
- Job state
- Table summaries
- Validation results
- Export options
- AI explanations
- Migration target management
- Dry-run results and reconciliation summaries
- Migration logs

### Backend
Coordinates:
- Upload handling
- Job state updates
- Worker dispatch
- Service orchestration
- API responses
- Migration target CRUD
- Dry-run execution
- Migration log management

### Workers
Execute:
- Restoration
- Profiling
- Extraction
- Cleaning
- Repair
- Validation
- Export tasks

### Services
Provide reusable, isolated logic for each domain area:
- dump restoration
- schema profiling
- extraction
- cleaning
- relationship repair
- validation
- exporting
- AI assistance
- migration engine

## DATA FLOW

### 1. Upload
- The user uploads a SQL dump through the frontend
- The API stores the file securely
- A new migration job is created
- A restore job is dispatched to the worker queue

### 2. Restore
- The worker restores the SQL dump into an isolated staging environment
- The source remains read-only
- Restore metadata is logged

### 3. Analysis
- The worker runs schema profiling
- Tables, columns, constraints, and candidate keys are identified
- Graph-ready JSON (nodes and edges) is generated
- Profiling results are stored and made available through the API

### 4. Extraction
- Data is extracted in chunks
- Raw extracted data is preserved
- Metadata is attached to each extraction batch

### 5. Cleaning
- Deterministic cleaning rules are applied first
- Data is normalized, standardized, and deduplicated when safe
- Cleaned datasets are stored separately from raw datasets

### 6. Relationship Repair
- Orphan records are detected
- Deterministic repair is attempted first
- If needed, AI suggestions are generated
- Low-confidence cases are routed to the exception queue

### 7. Validation
- Row counts, IDs, duplicates, and relationships are checked
- Data quality and integrity reports are generated
- The job is marked as ready, failed, or needing review

### 8. Review and Export
- Operators review unresolved items
- Approved jobs can be exported to:
  - Excel
  - Clean SQL
  - Translated SQL (best effort)

### 9. Migration (Phase 1: Dry-Run)
- Operator registers and tests a target database connection
- Operator selects the active source job and target connection
- A dry-run validation compares staging schema against target schema
- Row counts are compared per table using SELECT COUNT(*) only
- A reconciliation summary is generated with match/mismatch/missing status
- All steps are logged with severity (info/warning/error)
- No data is written to the target database

### 10. Data Intelligence (Phase 2)
- Integrity checks scan staging tables for migration blockers:
  - Duplicate primary keys (GROUP BY + HAVING)
  - Tables without primary keys (metadata inspection)
  - Orphan foreign keys (LEFT JOIN detection)
  - High NULL density columns (sampled, >50% threshold)
- SQL dialect is detected on upload via keyword heuristics
- Schema mapping allows manual source→target column mapping
- Enhanced reconciliation detects missing/extra IDs between staging and target
- All heavy queries use LIMIT clauses to prevent performance issues

## COMPONENT: DATA INTELLIGENCE ENGINE (Phase 2)

The Data Intelligence Engine is a service-layer module that runs analyses on
the staging database to detect data quality issues and prepare for migration.

**Submodules:**
- `integrity_checker.py` — Scans for PKs, FKs, NULLs, duplicates
- `dialect_detector.py` — Heuristic SQL dialect detection
- `reconciliation_engine.py` — Enhanced ID-level comparison

**Data Flow:**
```
Upload → Extract → Restore → Profile → Analyze (Integrity) → Detect Issues → Map Schema → Validate (Reconciliation)
```

**Safety Rules:**
- Integrity checks run ONLY against staging schema
- Reconciliation uses SELECT-only against target
- All heavy queries are LIMIT-capped
- No data modification in any phase

## COMPONENT: EXECUTION ENGINE (Phase 3)

The Execution Engine is the final transaction layer responsible for safely writing data to the target database in a controlled, reversible manner.

**Submodules:**
- `execution_engine.py` — Handles generation of migration plans, preview simulations, and the transaction commit/rollback execution lifecycle.

**Data Flow:**
```
Analyze → Generate Plan → Preview → Execute → Commit/Rollback
```

**Transaction Layer:**
All operations in the Execution Engine are explicitly wrapped in a single database transaction. 
- In **Preview Mode**, the transaction simulates execution and explicitly calls `ROLLBACK`. 
- In **Execute Mode**, the transaction queries are executed and, if no errors occur and user confirmed, calls `COMMIT`. Any error immediately forces a `ROLLBACK`.

## DATABASE LAYER

The system uses PostgreSQL and is logically split into:
- **System data**
  - jobs
  - statuses
  - logs
  - configs
  - exception records
  - migration_targets (target DB connection metadata)
  - migration_runs (dry-run and future execution records)
  - migration_logs (per-run event logs with severity)
- **Staging data**
  - raw restored tables
  - extracted datasets
  - cleaned datasets
  - validation outputs
  - export-ready datasets

## JOB STATE MODEL

Each migration job may move through these states:
- Uploaded
- Restoring
- Analyzing
- Extracting
- Cleaning
- Repairing Relations
- Validating
- Needs Review
- Ready for Export
- Exported
- Failed

Every state transition must be logged with:
- timestamp
- previous state
- new state
- reason

## ARCHITECTURAL RULES

1. The frontend must remain presentation-only.
2. The backend must remain orchestration-focused.
3. Heavy processing must run in workers.
4. All source data must remain read-only.
5. All transformations must happen in staging.
6. Raw and cleaned data must always be stored separately.
7. AI suggestions must never bypass deterministic validation or operator review.
8. Every meaningful action must be auditable.
9. The migration engine must never execute destructive commands against target databases in Phase 1.
10. Target database credentials must never be exposed in API responses, frontend logs, or backend logs.
11. Data intelligence checks must only run against the staging schema, never against source files or target DBs directly.
12. All analytical queries must use LIMIT or sampling to prevent full-table scans on large datasets.
13. Dialect detection is heuristic-only and must never alter or re-interpret source data.