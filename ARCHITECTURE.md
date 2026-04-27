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

### 6. File Storage
The system handles uploaded SQL dumps and generated exports:
- **Uploaded Dumps:** Stored securely on disk (or object storage like S3 in production environments) within a dedicated `uploads/` volume.
- **Processed Artifacts:** Generated exports and intermediate transformation logs are stored in an `exports/` volume.
- **Temporary Storage:** Local disk space is used for transient processing files that do not need persistence beyond the job lifecycle.

## SERVICE BOUNDARIES

### Frontend
Consumes API endpoints and displays:
- Upload status
- Job state
- Table summaries
- Validation results
- Export options
- AI explanations

### Backend
Coordinates:
- Upload handling
- Job state updates
- Worker dispatch
- Service orchestration
- API responses

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